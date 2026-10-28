import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computePricingSegment,
  emptyBucket,
  isPeakAt,
  priceRow,
  roundBucket,
} from '../index.js'

const BEIJING = (iso) => Date.parse(iso)

test('isPeakAt follows the official Beijing weekday windows', () => {
  // Wednesday 2026-10-28: 09:00, 12:00, 14:00, 18:00 Beijing.
  assert.equal(isPeakAt(BEIJING('2026-10-28T01:00:00Z')), true)
  assert.equal(isPeakAt(BEIJING('2026-10-28T04:00:00Z')), false)
  assert.equal(isPeakAt(BEIJING('2026-10-28T06:00:00Z')), true)
  assert.equal(isPeakAt(BEIJING('2026-10-28T10:00:00Z')), false)
})

test('isPeakAt treats weekends and statutory holidays as off-peak', () => {
  assert.equal(isPeakAt(BEIJING('2026-10-24T02:00:00Z')), false) // Saturday 10:00
  assert.equal(isPeakAt(BEIJING('2026-10-01T02:00:00Z')), false) // National Day 10:00
  assert.equal(isPeakAt(BEIJING('2026-10-09T02:00:00Z')), true) // Friday after the holiday
})

test('peak segment ends at 18:00 and the next off-peak segment lasts 15 hours', () => {
  const segment = computePricingSegment(BEIJING('2026-10-28T06:30:00Z')) // 14:30 Beijing
  assert.equal(segment.phase, 'peak')
  assert.equal(segment.startedAtClock, '14:00')
  assert.equal(segment.endsAtClock, '18:00')
  assert.equal(segment.nextPhase, 'off-peak')
  assert.equal(segment.nextDurationMs, 15 * 60 * 60 * 1000)
  assert.equal(segment.holidayDataExpired, false)
})

test('weekend off-peak segment runs to Monday 09:00 and next peak lasts 3 hours', () => {
  const segment = computePricingSegment(BEIJING('2026-10-24T04:00:00Z')) // Saturday 12:00
  assert.equal(segment.phase, 'off-peak')
  assert.equal(segment.startedAtClock, '18:00') // Friday evening
  assert.equal(segment.endsAtClock, '09:00') // Monday morning
  assert.equal(segment.nextPhase, 'peak')
  assert.equal(segment.nextDurationMs, 3 * 60 * 60 * 1000)
})

test('priceRow applies peak and off-peak DeepSeek flash rates', () => {
  const row = {
    provider: 'deepseek-account',
    model: 'deepseek-flash',
    input: 1_000_000,
    cacheRead: 1_000_000,
    cacheWrite: 0,
    output: 1_000_000,
  }
  const peak = priceRow({ ...row, time: BEIJING('2026-10-28T02:00:00Z') })
  const offPeak = priceRow({ ...row, time: BEIJING('2026-10-28T11:00:00Z') })
  assert.equal(peak.priced, true)
  assert.equal(peak.value, 2 + 0.04 + 8)
  assert.equal(offPeak.priced, true)
  assert.equal(offPeak.value, 1 + 0.02 + 4)
})

test('priceRow prices v4-pro separately and leaves non-DeepSeek providers unpriced', () => {
  const v4Pro = priceRow({
    provider: 'deepseek-official',
    model: 'deepseek-v4-pro',
    input: 1_000_000,
    cacheRead: 1_000_000,
    cacheWrite: 0,
    output: 1_000_000,
    time: BEIJING('2026-10-28T02:00:00Z'),
  })
  assert.equal(v4Pro.value, 9 + 0.3 + 27)

  const plan = priceRow({
    provider: 'ark-plan',
    model: 'deepseek-v4-pro',
    input: 1_000_000,
    cacheRead: 0,
    cacheWrite: 0,
    output: 1_000_000,
    time: BEIJING('2026-10-28T02:00:00Z'),
  })
  assert.equal(plan.priced, false)
  assert.equal(plan.value, 0)
})

test('bucket totals include cache reads and round their cost', () => {
  const bucket = emptyBucket()
  const row = {
    provider: 'deepseek-account',
    model: 'deepseek-flash',
    input: 1000,
    cacheRead: 2000,
    cacheWrite: 0,
    output: 500,
    time: BEIJING('2026-10-28T02:00:00Z'),
  }
  const price = priceRow(row)
  // addRow is internal; emulate the bucket contract through roundBucket values.
  bucket.total += row.input + row.output + row.cacheRead + row.cacheWrite
  bucket.input += row.input
  bucket.output += row.output
  bucket.cacheRead += row.cacheRead
  bucket.cost += price.value
  assert.equal(bucket.total, 3500)
  assert.equal(roundBucket(bucket).cost, Math.round(price.value * 10_000) / 10_000)
})
