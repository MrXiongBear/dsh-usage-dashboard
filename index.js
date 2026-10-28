/**
 * Host half of the Usage & Balance bundle.
 *
 * It exposes two authenticated same-origin JSON routes used by this bundle's own
 * Client half:
 *
 *   GET  /api/usage-dashboard/stats     aggregated balance, spend, token usage, API catalog
 *   POST /api/usage-dashboard/switch    persist the default provider/model selection
 *
 * Token usage is folded from the durable session logs through `sessionPersistence`;
 * balance comes from the signed-in DeepSeek account; provider/models come from `llm`
 * and the default selection from `agentDefaultModel`.
 *
 * The routes are registered on the Connection Fetch surface, so they pass the same
 * Host/Origin and browser-cookie authentication as the rest of `/api`.
 */

/** Services this Host half needs; `deepseekAccount` and `configEditor` are read optionally. */
export const inject = ['connection', 'sessionPersistence', 'llm', 'agentDefaultModel']

const ROUTE_ROOT = '/api/usage-dashboard'
const STATS_PATH = `${ROUTE_ROOT}/stats`
const SWITCH_PATH = `${ROUTE_ROOT}/switch`

const BALANCE_TTL_MS = 4_000
const BALANCE_ERROR_TTL_MS = 15_000
const MODEL_TTL_MS = 5 * 60_000
const FULL_SCAN_TTL_MS = 10 * 60_000
const STATS_TTL_MS = 1_000
const BODY_LIMIT = 16 * 1024

/**
 * Official DeepSeek list prices in CNY per 1,000,000 tokens, split by billing
 * period. Source: https://api-docs.deepseek.com/zh-cn/quick_start/pricing
 * (checked 2026-10-28). Off-peak prices are half of peak prices.
 */
const PRICING_CNY = {
  'deepseek-flash': {
    off: { hit: 0.02, miss: 1, output: 4 },
    peak: { hit: 0.04, miss: 2, output: 8 },
  },
  'deepseek-v4-pro': {
    off: { hit: 0.15, miss: 4.5, output: 13.5 },
    peak: { hit: 0.3, miss: 9, output: 27 },
  },
}

const PRICING_ALIASES = {
  'deepseek-v4-flash': 'deepseek-flash',
  'deepseek-v4-flash-vision-exp': 'deepseek-flash',
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-flash',
}

const SHANGHAI_TZ = 'Asia/Shanghai'
const PEAK_MINUTES = [
  [9 * 60, 12 * 60],
  [14 * 60, 18 * 60],
]

/**
 * Official 2026 State Council holiday arrangement. Weekend and statutory-holiday
 * days are billed at off-peak prices all day. Update this table when a new annual
 * arrangement is published.
 */
const HOLIDAY_RANGES_2026 = [
  ['2026-01-01', '2026-01-03'],
  ['2026-02-15', '2026-02-23'],
  ['2026-04-04', '2026-04-06'],
  ['2026-05-01', '2026-05-05'],
  ['2026-06-19', '2026-06-21'],
  ['2026-09-25', '2026-09-27'],
  ['2026-10-01', '2026-10-07'],
]
const PRICING_HOLIDAY_YEAR = 2026

const BILLING_TIME_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHANGHAI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function buildHolidaySet() {
  const days = new Set()
  for (const [start, end] of HOLIDAY_RANGES_2026) {
    const [startYear, startMonth, startDay] = start.split('-').map(Number)
    const [endYear, endMonth, endDay] = end.split('-').map(Number)
    for (
      let time = Date.UTC(startYear, startMonth - 1, startDay);
      time <= Date.UTC(endYear, endMonth - 1, endDay);
      time += 86_400_000
    ) {
      const date = new Date(time)
      days.add(
        `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`,
      )
    }
  }
  return days
}

const HOLIDAYS = buildHolidaySet()

function billingParts(ms) {
  const parts = BILLING_TIME_FORMAT.formatToParts(new Date(ms))
  const valueOf = (type) => {
    const item = parts.find((part) => part.type === type)
    return item ? item.value : ''
  }
  const year = Number(valueOf('year'))
  const month = Number(valueOf('month'))
  const day = Number(valueOf('day'))
  const hour = Number(valueOf('hour'))
  const minute = Number(valueOf('minute'))
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday,
    key: `${year}-${pad2(month)}-${pad2(day)}`,
    minutes: hour * 60 + minute,
  }
}

/** Whether one instant falls in a DeepSeek peak-priced window. */
function isPeakAt(ms) {
  const parts = billingParts(ms)
  if (parts.weekday === 0 || parts.weekday === 6) return false
  if (HOLIDAYS.has(parts.key)) return false
  return PEAK_MINUTES.some(([start, end]) => parts.minutes >= start && parts.minutes < end)
}

const MINUTE_MS = 60_000
const SEGMENT_SEARCH_MINUTES = 14 * 24 * 60

function floorMinute(ms) {
  return Math.floor(ms / MINUTE_MS) * MINUTE_MS
}

/** Beijing wall-clock HH:mm for one instant. */
function clockOf(ms) {
  const parts = billingParts(ms)
  return `${pad2(parts.hour)}:${pad2(parts.minute)}`
}

/** Walk backward to the instant the current phase began (minute precision). */
function findSegmentStart(now, peak) {
  let time = floorMinute(now)
  for (let step = 0; step < SEGMENT_SEARCH_MINUTES; step += 1) {
    if (isPeakAt(time - MINUTE_MS) !== peak) return time
    time -= MINUTE_MS
  }
  return time
}

/** Walk forward to the instant the current phase ends (minute precision). */
function findSegmentEnd(now, peak) {
  let time = floorMinute(now)
  for (let step = 0; step < SEGMENT_SEARCH_MINUTES; step += 1) {
    const next = time + MINUTE_MS
    if (isPeakAt(next) !== peak) return next
    time = next
  }
  return time + MINUTE_MS
}

let pricingSegmentCache = null

function computePricingSegment(now) {
  const peak = isPeakAt(now)
  const phase = peak ? 'peak' : 'off-peak'
  const startedAt = findSegmentStart(now, peak)
  const endsAt = findSegmentEnd(now, peak)
  const nextPeak = !peak
  const nextEndsAt = findSegmentEnd(endsAt, nextPeak)
  return {
    timeZone: SHANGHAI_TZ,
    phase,
    startedAt,
    endsAt,
    startedAtClock: clockOf(startedAt),
    endsAtClock: clockOf(endsAt),
    nextPhase: nextPeak ? 'peak' : 'off-peak',
    nextEndsAt,
    nextEndsAtClock: clockOf(nextEndsAt),
    currentDurationMs: endsAt - startedAt,
    nextDurationMs: nextEndsAt - endsAt,
    holidayDataExpired: billingParts(now).year > PRICING_HOLIDAY_YEAR,
    peakRanges: [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
    peakWeekdays: [1, 2, 3, 4, 5],
    offPeakDiscount: 0.5,
    holidayDataYear: PRICING_HOLIDAY_YEAR,
  }
}

/** Current billing segment, its remaining time, and the next segment's duration. */
function currentPricingWindow(now = Date.now()) {
  if (
    pricingSegmentCache === null ||
    now < pricingSegmentCache.startedAt ||
    now >= pricingSegmentCache.endsAt
  ) {
    pricingSegmentCache = computePricingSegment(now)
  }
  return {
    ...pricingSegmentCache,
    serverNow: now,
    remainingMs: Math.max(0, pricingSegmentCache.endsAt - now),
  }
}

const CHUNK_EVENTS = 1_000
const MODEL_TIMEOUT_MS = 6_000
const BALANCE_TIMEOUT_MS = 15_000
const TASK_LIMIT = 100

function withTimeout(promise, timeoutMs, label) {
  let timer
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function jsonResponse(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function readJson(request) {
  const text = await request.text()
  if (text.length > BODY_LIMIT) throw new Error('request body too large')
  if (!text) return {}
  return JSON.parse(text)
}

function emptyBucket() {
  return {
    total: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    cost: 0,
    pricedTokens: 0,
    unpricedTokens: 0,
    events: 0,
  }
}

function pad2(value) {
  return value < 10 ? `0${value}` : String(value)
}

function dayKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function priceOf(model) {
  const key = String(model || '').toLowerCase()
  const direct = PRICING_CNY[PRICING_ALIASES[key] || key]
  if (direct) return direct
  if (key.includes('deepseek')) return PRICING_CNY['deepseek-flash']
  return undefined
}

function priceRow(row) {
  /* Only the DeepSeek pay-as-you-go routes are priced by the list table. Other
     providers may be subscriptions or gateways with unrelated pricing, so their
     tokens stay unpriced instead of producing a misleading amount. */
  if (row.provider && !String(row.provider).toLowerCase().includes('deepseek')) {
    return { priced: false, value: 0 }
  }
  const prices = priceOf(row.model)
  if (!prices) return { priced: false, value: 0 }
  /* The rate follows the instant of each call, so historical usage is estimated
     at the peak or off-peak list price that applied then. */
  const rate = isPeakAt(row.time) ? prices.peak : prices.off
  const value =
    (row.input / 1_000_000) * rate.miss +
    (row.cacheRead / 1_000_000) * rate.hit +
    (row.cacheWrite / 1_000_000) * rate.miss +
    (row.output / 1_000_000) * rate.output
  return { priced: true, value }
}

function addRow(bucket, row) {
  const price = priceRow(row)
  const tokens = row.input + row.output + row.cacheRead + row.cacheWrite
  bucket.total += tokens
  bucket.input += row.input
  bucket.output += row.output
  bucket.cacheRead += row.cacheRead
  bucket.cacheWrite += row.cacheWrite
  bucket.cost += price.value
  if (price.priced) bucket.pricedTokens += tokens
  else bucket.unpricedTokens += tokens
  bucket.events += 1
}

function roundBucket(bucket) {
  return {
    total: bucket.total,
    input: bucket.input,
    output: bucket.output,
    cacheRead: bucket.cacheRead,
    cacheWrite: bucket.cacheWrite,
    cost: Math.round(bucket.cost * 10_000) / 10_000,
    pricedTokens: bucket.pricedTokens,
    unpricedTokens: bucket.unpricedTokens,
    events: bucket.events,
  }
}

function aggregateUsage(cache) {
  const now = new Date()
  const today = dayKey(now)
  const month = today.slice(0, 7)
  const year = today.slice(0, 4)

  const buckets = {
    today: emptyBucket(),
    month: emptyBucket(),
    year: emptyBucket(),
    total: emptyBucket(),
  }

  const daily = []
  const dailyByKey = new Map()
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const key = dayKey(date)
    const bucket = emptyBucket()
    dailyByKey.set(key, bucket)
    daily.push({ date: key, bucket })
  }

  let sessions = 0
  let errors = 0
  for (const entry of cache.values()) {
    sessions += 1
    errors += entry.errors || 0
    for (const row of entry.usage) {
      const key = dayKey(new Date(row.time))
      addRow(buckets.total, row)
      if (key === today) addRow(buckets.today, row)
      if (key.slice(0, 7) === month) addRow(buckets.month, row)
      if (key.slice(0, 4) === year) addRow(buckets.year, row)
      const day = dailyByKey.get(key)
      if (day) addRow(day, row)
    }
  }

  const tasks = []
  for (const [id, entry] of cache) {
    if (!entry.usage || entry.usage.length === 0) continue
    const totalBucket = emptyBucket()
    const todayBucket = emptyBucket()
    const monthBucket = emptyBucket()
    for (const row of entry.usage) {
      addRow(totalBucket, row)
      const key = dayKey(new Date(row.time))
      if (key === today) addRow(todayBucket, row)
      if (key.slice(0, 7) === month) addRow(monthBucket, row)
    }
    tasks.push({
      id,
      title: entry.title || id,
      createdAt: entry.createdAt || null,
      cwd: entry.cwd || null,
      subagent: Boolean(entry.subagent),
      lastAt: entry.lastAt || null,
      today: roundBucket(todayBucket),
      month: roundBucket(monthBucket),
      total: roundBucket(totalBucket),
    })
  }
  tasks.sort(
    (left, right) =>
      right.today.total - left.today.total || right.total.total - left.total.total,
  )

  return {
    today: roundBucket(buckets.today),
    month: roundBucket(buckets.month),
    year: roundBucket(buckets.year),
    total: roundBucket(buckets.total),
    daily: daily.map((item) => ({ date: item.date, ...roundBucket(item.bucket) })),
    sessions,
    errors,
    tasks: tasks.slice(0, TASK_LIMIT),
    taskCount: tasks.length,
  }
}

function usageRowOf(event) {
  if (!event || event.type !== 'assistant/message') return null
  const data = event.data
  const raw = data && data.usage
  if (!raw) return null
  const source = data.message && data.message.source
  return {
    time: typeof event.time === 'number' ? event.time : Date.now(),
    input: Number(raw.inputTokens) || 0,
    output: Number(raw.outputTokens) || 0,
    cacheRead: Number(raw.cacheReadTokens) || 0,
    cacheWrite: Number(raw.cacheWriteTokens) || 0,
    model: source && source.model ? String(source.model) : '',
    provider: source && source.provider ? String(source.provider) : '',
  }
}

function extractUsage(events, inheritedEventCount) {
  const usage = []
  const inherited = typeof inheritedEventCount === 'number' ? inheritedEventCount : 0
  for (const event of events) {
    if (!event || event.type !== 'assistant/message') continue
    if (inherited > 0 && typeof event.seq === 'number' && event.seq < inherited) continue
    const row = usageRowOf(event)
    if (row) usage.push(row)
  }
  return usage
}

async function readAllEvents(handle) {
  const events = []
  let offset = 0
  for (;;) {
    const result = await handle.read(offset, CHUNK_EVENTS)
    const chunk = (result && result.events) || []
    if (chunk.length === 0) break
    events.push(...chunk)
    if (chunk.length < CHUNK_EVENTS) break
    offset += chunk.length
  }
  return events
}

export function apply(ctx) {
  /** sessionId -> { revision, usage, errors } */
  let usageCache = new Map()
  let usageScanPromise = null
  let usageResult = null
  let usageDirty = true
  let lastFullScanAt = 0

  let balanceCache = null
  let balanceCacheAt = 0
  let balancePromise = null
  let balanceRefreshTimer = null

  let apiCache = null
  let apiCacheAt = 0
  let apiPromise = null

  let statsCache = null
  let statsCacheAt = 0
  let statsPromise = null

  async function scanUsage() {
    if (usageScanPromise) return usageScanPromise
    usageScanPromise = (async () => {
      let snapshots = []
      try {
        snapshots = await ctx.sessionPersistence.list()
      } catch (error) {
        return {
          ...aggregateUsage(new Map()),
          sessions: 0,
          errors: 1,
          code: 'storage-unavailable',
          message: `无法读取会话存储：${error && error.message ? error.message : error}`,
        }
      }

      const seen = new Set()
      const targets = []
      for (const snapshot of snapshots) {
        const id = String(snapshot.header.id)
        seen.add(id)
        /* Unmaterialized pending sessions have no durable log to read. Historical
           formats are still readable: a read open migrates them in memory only. */
        if (!snapshot.formatStatus) continue
        const revision = snapshot.revision === undefined ? undefined : String(snapshot.revision)
        const cached = usageCache.get(id)
        if (cached && revision !== undefined && cached.revision === revision) continue
        targets.push({ snapshot, id, revision, cached })
      }

      async function readTarget(target) {
        const { snapshot, id, revision, cached } = target
        try {
          const handle = await ctx.sessionPersistence.open(snapshot.header.id, 'read')
          try {
            const events = await readAllEvents(handle)
            const usage = extractUsage(events, handle.inheritedEventCount)
            let title = cached && cached.title
            for (const event of events) {
              if (
                event.type === 'session/title' &&
                event.data &&
                typeof event.data.title === 'string' &&
                event.data.title
              ) {
                title = event.data.title
              }
            }
            const lastAt = usage.reduce(
              (latest, row) => Math.max(latest, row.time),
              snapshot.header.createdAt || 0,
            )
            const lastSeq = events.reduce(
              (latest, event) =>
                typeof event.seq === 'number' ? Math.max(latest, event.seq) : latest,
              0,
            )
            usageCache.set(id, {
              revision,
              usage,
              errors: 0,
              title,
              createdAt: snapshot.header.createdAt || null,
              cwd: snapshot.header.cwd || null,
              subagent: snapshot.header.origin === 'subagent',
              lastAt,
              lastSeq,
            })
          } finally {
            try {
              await handle.close()
            } catch {
              /* a read handle close failure only loses the optimization */
            }
          }
        } catch {
          if (cached) {
            cached.errors = (cached.errors || 0) + 1
          } else {
            usageCache.set(id, { revision, usage: [], errors: 1 })
          }
        }
      }

      for (const target of targets) {
        await readTarget(target)
      }

      for (const id of [...usageCache.keys()]) {
        if (!seen.has(id)) usageCache.delete(id)
      }

      return aggregateUsage(usageCache)
    })()

    try {
      return await usageScanPromise
    } finally {
      usageScanPromise = null
    }
  }

  async function getUsage(force) {
    if (
      !force &&
      !usageDirty &&
      usageResult &&
      lastFullScanAt > 0 &&
      Date.now() - lastFullScanAt > FULL_SCAN_TTL_MS
    ) {
      usageDirty = true
    }
    if (force || usageDirty) {
      const result = await scanUsage()
      usageResult = result
      usageDirty = false
      lastFullScanAt = Date.now()
      return result
    }
    if (usageResult) return usageResult
    const result = aggregateUsage(usageCache)
    usageResult = result
    return result
  }

  /** Append one durable assistant message directly to the per-session fold. */
  function applyUsageEvent(session, event) {
    const id = session && session.id ? String(session.id) : ''
    if (!id) {
      usageDirty = true
      usageResult = null
      statsCacheAt = 0
      return
    }
    const entry = usageCache.get(id)
    if (!entry) {
      /* A session not seen by the fold yet: let the next full scan bring its
         title and metadata, rather than inventing a partial entry. */
      usageDirty = true
      usageResult = null
      statsCacheAt = 0
      return
    }
    const seq = typeof event.seq === 'number' ? event.seq : null
    if (seq !== null && typeof entry.lastSeq === 'number' && seq <= entry.lastSeq) return
    if (seq !== null) entry.lastSeq = seq
    const row = usageRowOf(event)
    if (!row) return
    entry.usage.push(row)
    entry.errors = 0
    entry.lastAt = Math.max(entry.lastAt || 0, row.time)
    usageResult = null
    statsCacheAt = 0
  }

  function balanceTtl(result) {
    if (!result) return 0
    if (result.status === 'ready') return BALANCE_TTL_MS
    if (result.status === 'error') return BALANCE_ERROR_TTL_MS
    return 30_000
  }

  function startBalanceFetch(account) {
    if (balancePromise) return balancePromise
    balancePromise = (async () => {
      try {
        const state = await account.getState()
        const links = state && state.links ? state.links : undefined
        if (!state || state.status !== 'credential-stored') {
          return { status: 'signed-out', links }
        }
        const details = await withTimeout(
          account.getBalance({
            version: '1.0.0',
            locale: 'zh-CN',
            timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
          }),
          BALANCE_TIMEOUT_MS,
          '余额查询',
        )
        if (!details) return { status: 'unavailable', links }
        if (details.status !== 'ready') {
          return { status: 'error', code: 'balance-query-failed', links }
        }
        return {
          status: 'ready',
          wallets: details.value || [],
          bonusWallets: details.bonusWallets || [],
          links,
        }
      } catch (error) {
        return {
          status: 'error',
          code: 'balance-query-failed',
          message: error && error.message ? String(error.message) : String(error),
        }
      }
    })()
      .then((result) => {
        balanceCache = result
        balanceCacheAt = Date.now()
        return result
      })
      .finally(() => {
        balancePromise = null
      })
    return balancePromise
  }

  /** Return the cached wallet immediately and refresh it in the background; a
   *  slow account platform must not hold the whole statistics response. */
  async function getBalance(force) {
    const account = ctx.get('deepseekAccount')
    if (!account) {
      return { status: 'unavailable', code: 'no-account-service' }
    }
    if (force) balanceCacheAt = 0
    if (balanceCache && Date.now() - balanceCacheAt < balanceTtl(balanceCache)) {
      return balanceCache
    }
    if (!balancePromise) startBalanceFetch(account)
    return balanceCache || { status: 'loading' }
  }

  function safeCall(fn, fallback) {
    try {
      return fn()
    } catch {
      return fallback
    }
  }

  async function fetchApiCatalog() {
    const providers = safeCall(() => ctx.llm.listProviders(), [])
    const configurable = safeCall(() => ctx.llm.listConfigurableProviders(), [])
    const current = safeCall(() => ctx.agentDefaultModel.currentSelection(), null)
    const byId = new Map(
      (Array.isArray(configurable) ? configurable : []).map((entry) => [entry.provider, entry]),
    )

    const options = await Promise.all(
      (Array.isArray(providers) ? providers : []).map(async (provider) => {
        const directory = byId.get(provider.id)
        let models = []
        try {
          models = await withTimeout(
            ctx.llm.listModels(provider.id),
            MODEL_TIMEOUT_MS,
            `模型列表(${provider.id})`,
          )
        } catch {
          models = []
        }
        return {
          provider: provider.id,
          name: (directory && directory.displayName) || provider.name || provider.id,
          configured: Boolean(directory),
          baseURL: directory && directory.baseURL ? directory.baseURL : undefined,
          models: (Array.isArray(models) ? models : []).map((model) => ({
            id: model.id,
            name: model.name || model.id,
          })),
        }
      }),
    )

    if (current && !options.some((option) => option.provider === current.provider)) {
      options.push({
        provider: current.provider,
        name: current.provider,
        configured: byId.has(current.provider),
        models: [{ id: current.model, name: current.model }],
      })
    }

    return { status: 'ready', current, options }
  }

  /** Cached provider catalog with a background refresh; first paint shows a
   *  loading state instead of waiting for every provider's model discovery. */
  function getApi(force) {
    if (force) apiCacheAt = 0
    if (!force && apiCache && Date.now() - apiCacheAt < MODEL_TTL_MS) return apiCache
    if (!apiPromise) {
      apiPromise = fetchApiCatalog()
        .then((result) => {
          apiCache = result
          apiCacheAt = Date.now()
          return result
        })
        .finally(() => {
          apiPromise = null
        })
    }
    if (apiCache) return apiCache
    return {
      status: 'loading',
      current: safeCall(() => ctx.agentDefaultModel.currentSelection(), null),
      options: [],
    }
  }

  async function getStats(force) {
    if (!force && statsCache && Date.now() - statsCacheAt < STATS_TTL_MS) return statsCache
    if (statsPromise) return statsPromise

    statsPromise = (async () => {
      const [usage, balance, api] = await Promise.all([
        getUsage(force),
        getBalance(force),
        getApi(force),
      ])
      return {
        generatedAt: Date.now(),
        usage,
        balance,
        api,
      }
    })()

    try {
      const result = await statsPromise
      statsCache = result
      statsCacheAt = Date.now()
      return result
    } finally {
      statsPromise = null
    }
  }

  /** Pull the account balance again right after a completed model message, so a
   *  deduction is usually visible on the next two-second client poll. */
  function scheduleBalanceRefresh() {
    balanceCacheAt = 0
    if (balanceRefreshTimer !== null) return
    balanceRefreshTimer = setTimeout(() => {
      balanceRefreshTimer = null
      getBalance(true).catch(() => {})
    }, 800)
  }

  function handleStats(request) {
    if (request.method !== 'GET') {
      return jsonResponse(405, { ok: false, code: 'method-not-allowed', error: 'method not allowed' })
    }
    const force = (() => {
      try {
        return new URL(request.url, 'http://localhost').searchParams.get('refresh') === '1'
      } catch {
        return false
      }
    })()
    return getStats(force)
      .then((data) =>
        jsonResponse(200, { ok: true, ...data, pricingWindow: currentPricingWindow() }),
      )
      .catch((error) =>
        jsonResponse(500, {
          ok: false,
          error: error && error.message ? String(error.message) : String(error),
        }),
      )
  }

  async function handleSwitch(request) {
    if (request.method !== 'POST') {
      return jsonResponse(405, { ok: false, error: 'method not allowed' })
    }
    try {
      const body = await readJson(request)
      const provider = typeof body.provider === 'string' ? body.provider.trim() : ''
      const model = typeof body.model === 'string' ? body.model.trim() : ''
      if (!provider || !model) {
        return jsonResponse(400, {
          ok: false,
          code: 'invalid-selection',
          error: 'provider 和 model 都是必填项。',
        })
      }
      if (!ctx.get('configEditor')) {
        return jsonResponse(503, {
          ok: false,
          code: 'config-unavailable',
          error: '当前组合没有可写的配置编辑器，无法保存默认模型。',
        })
      }

      /* Keep the current reasoning effort unless the caller names another one, so a
         provider/model switch does not silently reset that preference. Drop it when
         the target model advertises efforts and does not include it. */
      const previous = ctx.agentDefaultModel.currentSelection()
      const requested =
        typeof body.reasoningEffort === 'string' ? body.reasoningEffort.trim() : ''
      let reasoningEffort = requested || (previous && previous.reasoningEffort) || undefined
      if (reasoningEffort) {
        try {
          const info = await withTimeout(
            ctx.llm.resolveModelInfo(provider, model),
            MODEL_TIMEOUT_MS,
            `模型能力(${provider}/${model})`,
          )
          const efforts =
            info && info.reasoning && Array.isArray(info.reasoning.efforts)
              ? info.reasoning.efforts.map((effort) => effort.id)
              : []
          if (efforts.length > 0 && !efforts.includes(reasoningEffort)) {
            reasoningEffort = undefined
          }
        } catch {
          /* Capability lookup is advisory here; keep the stored effort on failure. */
        }
      }
      await ctx.agentDefaultModel.saveSelection({
        provider,
        model,
        ...(reasoningEffort ? { reasoningEffort } : {}),
      })
      const next = ctx.agentDefaultModel.currentSelection()
      if (apiCache) apiCache = { ...apiCache, current: next }
      statsCache = null
      return jsonResponse(200, { ok: true, current: next })
    } catch (error) {
      return jsonResponse(500, {
        ok: false,
        code: 'switch-failed',
        error: error && error.message ? String(error.message) : String(error),
      })
    }
  }

  ctx.effect(() =>
    ctx.connection.fetch.register({
      path: STATS_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: handleStats,
    }),
  )
  ctx.effect(() =>
    ctx.connection.fetch.register({
      path: SWITCH_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: handleSwitch,
    }),
  )

  /** A durable title event updates just that session's label; no log re-read. */
  function applyTitleEvent(session, event) {
    const id = session && session.id ? String(session.id) : ''
    const title = event && event.data ? event.data.title : undefined
    if (!id || typeof title !== 'string' || !title) return
    const entry = usageCache.get(id)
    if (!entry || entry.title === title) return
    entry.title = title
    usageResult = null
    statsCacheAt = 0
  }

  /* Live updates: append each durable assistant message to its session fold and
     apply title revisions directly; only a balance refresh remains for turn end. */
  ctx.on('session/event', (session, event) => {
    if (!event) return
    if (event.type === 'assistant/message') {
      applyUsageEvent(session, event)
      scheduleBalanceRefresh()
    } else if (event.type === 'session/title') {
      applyTitleEvent(session, event)
    } else if (event.type === 'turn/end') {
      scheduleBalanceRefresh()
    }
  })

  ctx.effect(() => () => {
    if (balanceRefreshTimer !== null) {
      clearTimeout(balanceRefreshTimer)
      balanceRefreshTimer = null
    }
  })
}

/* Pure helpers exported for the Node test suite; the Cordis loader ignores them. */
export { emptyBucket, roundBucket, priceRow, isPeakAt, computePricingSegment }
