/**
 * Client half of the Usage & Balance bundle.
 *
 * Registers:
 *   - a compact balance/token/pricing summary beside Settings (`sidebar.footer.action`)
 *   - the full dashboard page in the main column (`main` keyed entry), opened from it
 *
 * The dashboard talks to this bundle's Host half through two same-origin JSON
 * routes; it never reads another plugin's DOM and uses only theme tokens.
 */

window.__ModuleLoader__.load({
  id: 'dsh-usage-dashboard',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PANEL_ID = 'usage-dashboard'
    const NS = 'usage-dashboard'
    const STATS_URL = 'api/usage-dashboard/stats'
    const SWITCH_URL = 'api/usage-dashboard/switch'

    const EN = {
      panelTitle: 'Usage & Balance',
      summaryLabel: 'Usage & Balance',
      summaryAria: 'Open the Usage & Balance dashboard',
      loading: 'Loading…',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      retry: 'Retry',
      balance: 'Balance',
      spend: 'Spend (est.)',
      todayTokens: 'Today tokens',
      monthTokens: 'This month tokens',
      yearTokens: 'This year tokens',
      today: 'Today',
      month: 'This month',
      year: 'This year',
      total: 'All time',
      input: 'In',
      output: 'Out',
      cacheRead: 'Cache read',
      signedOut: 'Not signed in to DeepSeek',
      signedOutShort: 'No account',
      signedOutHint: 'Sign in from Settings → Account to read the account balance.',
      balanceUnavailable: 'Balance unavailable',
      bonus: 'Bonus',
      spendToday: 'Today',
      spendMonth: 'Month',
      spendYear: 'Year',
      noPricing: 'No price data for the recorded models, so spend is not estimated.',
      estimatedNote:
        'Spend is estimated from locally recorded tokens at DeepSeek peak/off-peak list prices; it is not a bill.',
      sourceNote: 'Tokens are summed from local DSH session logs.',
      pricingWindowTitle: 'Peak / off-peak',
      phasePeak: 'Peak',
      phaseOffPeak: 'Off-peak',
      pricingRules:
        'Peak: Mon–Fri {peak} (China statutory holidays excluded). Off-peak: all other times, including weekends and holidays all day; about half price.',
      pricingHolidayNote: 'Holiday dates follow the official 2026 China schedule.',
      remaining: 'Remaining',
      nextPhase: 'Next',
      duration: 'Lasts',
      phaseValue: '{phase}: {value}',
      endsAt: 'Ends at',
      durationHoursMinutes: '{h}h {m}m',
      durationHours: '{h}h',
      durationMinutes: '{m}m',
      dailyTitle: 'Last 14 days',
      chartEmpty: 'No usage recorded in the last 14 days.',
      apiTitle: 'Default API',
      apiCurrent: 'Current default',
      apiNone: 'Not configured',
      provider: 'Provider',
      model: 'Model',
      apply: 'Switch',
      switching: 'Switching…',
      switchOk: 'Default switched. New sessions will use it.',
      switchHint:
        'This changes the default provider/model for new sessions. The current session keeps its model; change it in the composer.',
      noProviders:
        'No active provider was found. Add an API key in Settings → Models, then refresh.',
      loadingApi: 'Loading providers…',
      noModels: 'This provider reported no models.',
      noData: 'No statistics yet.',
      loadFailed: 'Could not load statistics.',
      offline: 'Offline',
      errorInvalidSelection: 'Choose a provider and model.',
      errorConfigUnavailable: 'This profile cannot save a default model.',
      errorSwitchFailed: 'Could not switch the default API.',
      errorBadRequest: 'The request was rejected.',
      pricingHolidayExpired:
        'Holiday dates only cover 2026; peak/off-peak may be inaccurate after 2026.',
      subagentBadge: 'sub',
      recentBadge: 'recent',
      chartPeak: 'Peak {value}',
      footerSizeHint: 'Larger sizes may compress the spend text.',
      updated: 'Updated',
      liveNow: 'Live',
      usageSummary: 'Token usage',
      usageSummaryHint: 'Month · year · all time',
      totalTokens: 'All-time tokens',
      taskUsage: 'Per-task token usage',
      taskUsageHint: 'Sorted by {sort}; showing {count} of {total} tasks',
      taskName: 'Task',
      taskSearchPlaceholder: 'Search tasks',
      taskSortToday: 'Today',
      taskSortTotal: 'Total',
      taskShowAll: 'Show all',
      taskShowLess: 'Show less',
      taskNoMatch: 'No matching tasks.',
      noTasks: 'No task usage recorded yet.',
      footerDisplay: 'Sidebar display',
      footerDisplayHint: 'Choose what the bottom-left summary shows. Balance is always shown.',
      footerSize: 'Size',
      optionPricing: 'Peak / off-peak',
      optionDay: 'Day tokens',
      optionMonth: 'Month tokens',
      optionYear: 'Year tokens',
      lockedShort: 'fixed',
      lockedHint: 'Balance is always shown',
      sessionsCount: '{count} sessions scanned',
      errorsCount: '{count} unreadable session(s)',
      storageError: 'Session storage error',
      todayShort: 'today',
      spendShort: 'Spend',
      dayShort: 'Day',
      monthShort: 'Month',
      yearShort: 'Year',
    }

    const ZH = {
      panelTitle: '用量与余额',
      summaryLabel: '用量与余额',
      summaryAria: '打开用量与余额面板',
      loading: '加载中…',
      refresh: '刷新',
      refreshing: '刷新中…',
      retry: '重试',
      balance: '余额',
      spend: '消费（估算）',
      todayTokens: '今日 Token',
      monthTokens: '本月 Token',
      yearTokens: '本年 Token',
      today: '今日',
      month: '本月',
      year: '本年',
      total: '累计',
      input: '输入',
      output: '输出',
      cacheRead: '缓存命中',
      signedOut: '未登录 DeepSeek 账号',
      signedOutShort: '未登录',
      signedOutHint: '在 设置 → 账号 中登录后可读取账号余额。',
      balanceUnavailable: '余额不可用',
      bonus: '赠送',
      spendToday: '今日',
      spendMonth: '本月',
      spendYear: '本年',
      noPricing: '已记录的模型没有价格数据，因此未估算消费。',
      estimatedNote: '消费按本地记录的 Token 与 DeepSeek 峰谷单价估算（谷时约为峰时半价），仅供参考，不等于账单。',
      sourceNote: 'Token 用量来自本地 DSH 会话日志汇总。',
      pricingWindowTitle: '峰时 / 谷时',
      phasePeak: '峰时',
      phaseOffPeak: '谷时',
      pricingRules:
        '峰时：周一至周五 {peak}（中国法定节假日除外）。谷时：其余时段，含周末及法定节假日全天，单价约为峰时一半。',
      pricingHolidayNote: '法定节假日按 2026 年国务院办公厅安排判断。',
      remaining: '剩余',
      nextPhase: '下一段',
      duration: '持续',
      phaseValue: '{phase}：{value}',
      endsAt: '结束于',
      durationHoursMinutes: '{h}小时{m}分',
      durationHours: '{h}小时',
      durationMinutes: '{m}分',
      dailyTitle: '近 14 天',
      chartEmpty: '近 14 天没有记录到用量。',
      apiTitle: '默认 API',
      apiCurrent: '当前默认',
      apiNone: '未配置',
      provider: '服务商',
      model: '模型',
      apply: '切换',
      switching: '切换中…',
      switchOk: '默认 API 已切换，新会话将使用它。',
      switchHint: '这里只修改新会话的默认服务商/模型；当前会话的模型请在输入框切换。',
      noProviders: '没有找到可用的服务商。请先在 设置 → 模型 中添加 API，然后刷新。',
      loadingApi: '正在加载服务商…',
      noModels: '该服务商没有返回模型列表。',
      noData: '暂无统计数据。',
      loadFailed: '统计加载失败。',
      offline: '离线',
      errorInvalidSelection: '请选择服务商和模型。',
      errorConfigUnavailable: '当前配置无法保存默认模型。',
      errorSwitchFailed: '切换默认 API 失败。',
      errorBadRequest: '请求被拒绝。',
      pricingHolidayExpired: '节假日数据仅覆盖 2026 年，之后峰谷判断可能不准确。',
      subagentBadge: '子任务',
      recentBadge: '最近',
      chartPeak: '峰值 {value}',
      footerSizeHint: '字号越大，消费文字越容易被压缩。',
      updated: '更新于',
      liveNow: '实时',
      usageSummary: 'Token 用量',
      usageSummaryHint: '本月 · 本年 · 累计',
      totalTokens: '累计 Token',
      taskUsage: '任务 Token 消耗',
      taskUsageHint: '按{sort}排序，显示 {count}/{total} 个任务',
      taskName: '任务',
      taskSearchPlaceholder: '搜索任务',
      taskSortToday: '今日',
      taskSortTotal: '累计',
      taskShowAll: '显示全部',
      taskShowLess: '收起',
      taskNoMatch: '没有匹配的任务。',
      noTasks: '暂无任务用量记录。',
      footerDisplay: '左下角显示',
      footerDisplayHint: '选择左下角汇总显示的内容；余额固定显示，不可关闭。',
      footerSize: '大小',
      optionPricing: '峰时 / 谷时',
      optionDay: '日 Token',
      optionMonth: '月 Token',
      optionYear: '年 Token',
      lockedShort: '固定',
      lockedHint: '余额始终显示',
      sessionsCount: '已扫描 {count} 个会话',
      errorsCount: '{count} 个会话读取失败',
      storageError: '会话存储出错',
      todayShort: '今日',
      spendShort: '消费',
      dayShort: '日',
      monthShort: '月',
      yearShort: '年',
    }

    const CSS = `
.dsh-usage-root{box-sizing:border-box;flex:1 1 auto;height:100%;min-height:0;overflow:auto;padding-top:var(--dsh-frame-top-clearance,0px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:14px;line-height:1.5}
.dsh-usage-inner{box-sizing:border-box;max-width:980px;margin:0 auto;padding:32px 36px 60px;display:flex;flex-direction:column;gap:16px}
.dsh-usage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dsh-usage-title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dsh-usage-title{font-size:23px;line-height:1.25;font-weight:600;margin:0}
.dsh-usage-live{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1);font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsh-usage-live-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary)}
.dsh-usage-live.is-offline{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.dsh-usage-live.is-offline .dsh-usage-live-dot{background:var(--dsw-alias-state-warn-primary)}
.dsh-usage-sub{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:6px;max-width:680px}
.dsh-usage-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dsh-usage-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.dsh-usage-btn:disabled{opacity:.55;cursor:default}
.dsh-usage-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.dsh-usage-btn-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary);opacity:.9}
.dsh-usage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.dsh-usage-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.dsh-usage-card{box-sizing:border-box;min-width:0;display:flex;flex-direction:column;gap:6px;padding:15px 17px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1)}
.dsh-usage-hero .dsh-usage-card{padding:17px 19px}
.dsh-usage-hero .dsh-usage-value{font-size:26px}
.dsh-usage-label{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-usage-value{font-size:22px;line-height:1.2;font-weight:600;overflow-wrap:anywhere}
.dsh-usage-value-small{font-size:16px}
.dsh-usage-meta{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);display:flex;flex-wrap:wrap;gap:4px 10px}
.dsh-usage-section{box-sizing:border-box;padding:16px 18px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:12px}
.dsh-usage-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dsh-usage-h2{font-size:14px;font-weight:600;margin:0}
.dsh-usage-banner{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 18px;padding:16px 18px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:linear-gradient(180deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-base))}
.dsh-usage-banner-main{display:flex;align-items:center;gap:10px;min-width:0}
.dsh-usage-banner-phase{font-size:20px;line-height:1.2;font-weight:600}
.dsh-usage-banner-count{font-size:20px;line-height:1.2;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
.dsh-usage-banner-next{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-usage-banner-rules{flex-basis:100%;margin:0;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.dsh-usage-usage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.dsh-usage-usage-item{box-sizing:border-box;min-width:0;display:flex;flex-direction:column;gap:3px;padding:11px 13px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.dsh-usage-usage-label{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-usage-usage-value{font-size:18px;line-height:1.25;font-weight:600;overflow-wrap:anywhere}
.dsh-usage-usage-meta{font-size:11px;color:var(--dsw-alias-label-secondary)}
.dsh-usage-prefs{display:flex;flex-wrap:wrap;gap:8px}
.dsh-usage-pref{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap}
.dsh-usage-pref:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsh-usage-pref[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.dsh-usage-pref[aria-pressed="true"]::before{content:'✓';font-size:10px;line-height:1}
.dsh-usage-pref.is-locked{cursor:default}
.dsh-usage-pref-lock{font-size:10px;color:var(--dsw-alias-label-secondary)}
.dsh-usage-tasks{display:flex;flex-direction:column;gap:1px;max-height:360px;overflow:auto}
.dsh-usage-task-row{display:grid;grid-template-columns:minmax(0,1fr) 68px 68px 64px;gap:10px;align-items:center;padding:7px 8px;border-radius:8px;font-size:12px}
.dsh-usage-task-row.is-head{position:sticky;top:0;z-index:1;padding:0 8px 6px;border-bottom:1px solid var(--dsw-alias-border-l1);border-radius:0;background:var(--dsw-alias-bg-layer-1);font-size:11px;color:var(--dsw-alias-label-secondary)}
.dsh-usage-task-row:not(.is-head):hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-usage-task-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-usage-task-badge{display:inline-block;margin-right:5px;padding:0 5px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:14px;vertical-align:1px}
.dsh-usage-task-badge.is-recent{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.dsh-usage-task-row.is-recent{background:var(--dsw-alias-bg-layer-2);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}
.dsh-usage-task-num{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dsh-usage-task-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.dsh-usage-task-body{display:flex;flex-direction:column;gap:8px}
.dsh-usage-search{box-sizing:border-box;flex:1 1 180px;min-width:0;height:30px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.dsh-usage-search::placeholder{color:var(--dsw-alias-label-secondary)}
.dsh-usage-search:focus{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.dsh-usage-task-sorts{display:flex;gap:6px}
.dsh-usage-more{align-self:flex-start;padding:5px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer}
.dsh-usage-more:hover{background:var(--dsw-alias-bg-layer-2)}
@media (max-width:640px){.dsh-usage-task-row{grid-template-columns:minmax(0,1fr) 56px 56px 54px;gap:6px;font-size:11px}}
.dsh-usage-size{display:flex;align-items:center;gap:10px;margin-top:2px}
.dsh-usage-size-label{font-size:11px;color:var(--dsw-alias-label-secondary);min-width:32px}
.dsh-usage-range{flex:1 1 auto;max-width:240px;height:16px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}
.dsh-usage-size-value{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;min-width:36px;text-align:right}
.dsh-usage-chart{display:flex;align-items:flex-end;gap:5px;height:120px;padding:4px 0 0}
.dsh-usage-bar{flex:1 1 0;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;gap:4px}
.dsh-usage-bar-fill{width:100%;border-radius:4px 4px 2px 2px;background:var(--dsw-alias-brand-primary);opacity:.85;min-height:2px}
.dsh-usage-bar-empty{width:100%;border-radius:4px;background:var(--dsw-alias-border-l1);min-height:2px;opacity:.6}
.dsh-usage-chart-foot{display:flex;justify-content:space-between;font-size:10px;color:var(--dsw-alias-label-secondary)}
.dsh-usage-chart-empty{height:120px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l1);border-radius:8px}
@media (max-width:640px){.dsh-usage-usage{grid-template-columns:1fr}}
.dsh-usage-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}
.dsh-usage-field{display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--dsw-alias-label-secondary);min-width:150px}
.dsh-usage-select{box-sizing:border-box;min-height:32px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;max-width:260px}
.dsh-usage-note{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);margin:0}
.dsh-usage-error{font-size:12px;line-height:1.5;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}
.dsh-usage-ok{font-size:12px;line-height:1.5;color:var(--dsw-alias-state-success-primary)}
.dsh-usage-warn{font-size:11px;line-height:1.5;color:var(--dsw-alias-state-warn-primary);overflow-wrap:anywhere}
.dsh-usage-foot{display:flex;flex-direction:column;gap:4px;padding-top:2px}
.dsh-usage-summary{box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;gap:2px;flex:1 1 auto;min-width:0;margin:0 2px 0 0;padding:6px 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
.dsh-usage-summary:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-usage-summary.is-rail{flex:0 0 36px;width:36px;height:36px;align-items:center;justify-content:center;padding:0;margin:0}
.dsh-usage-summary-top{display:flex;align-items:center;gap:5px;min-width:0;font-size:12px;line-height:17px;white-space:nowrap;overflow:hidden}
.dsh-usage-summary-balance{flex:0 0 auto;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis}
.dsh-usage-summary-spend{flex:1 1 auto;min-width:0;font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-usage-summary-tokens{font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-usage-summary-pricing{display:flex;align-items:center;gap:4px;flex:0 0 auto;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);white-space:nowrap;font-variant-numeric:tabular-nums}
.dsh-usage-summary-pricing .dsh-usage-phase-dot{width:5px;height:5px}
.dsh-usage-phase-dot{flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary)}
.dsh-usage-phase-dot.is-peak{background:var(--dsw-alias-state-warn-primary)}
.dsh-usage-phase-dot.is-off{background:var(--dsw-alias-state-success-primary)}
.dsh-usage-skeleton{height:96px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);opacity:.5}
`

    function compact(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      const abs = Math.abs(value)
      if (abs >= 1e9) return `${trim(value / 1e9)}B`
      if (abs >= 1e6) return `${trim(value / 1e6)}M`
      if (abs >= 1e3) return `${trim(value / 1e3)}k`
      return String(Math.round(value))
    }

    function trim(value) {
      if (value >= 100) return String(Math.round(value))
      if (value >= 10) return value.toFixed(1).replace(/\.0$/, '')
      return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
    }

    function formatWallet(wallet) {
      if (!wallet) return '—'
      const symbol = wallet.currency === 'CNY' ? '¥' : wallet.currency === 'USD' ? '$' : `${wallet.currency} `
      const amount = Number(wallet.balance)
      return Number.isFinite(amount) ? `${symbol}${amount.toFixed(2)}` : `${symbol}${wallet.balance}`
    }

    function formatCny(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      if (value === 0) return '¥0.00'
      if (value < 0.01) return `¥${value.toFixed(4)}`
      return `¥${value.toFixed(2)}`
    }

    function formatText(text, vars) {
      if (!vars) return text
      return Object.keys(vars).reduce(
        (result, key) => result.split(`{${key}}`).join(String(vars[key])),
        text,
      )
    }

    function fullRanges(pricing) {
      const ranges = pricing && Array.isArray(pricing.peakRanges) ? pricing.peakRanges : []
      if (ranges.length === 0) return '—'
      return ranges.map((range) => `${range.start}–${range.end}`).join(' / ')
    }

    function padTwo(value) {
      return value < 10 ? `0${value}` : String(value)
    }

    function formatCountdown(ms) {
      const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000))
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const seconds = total % 60
      return `${padTwo(hours)}:${padTwo(minutes)}:${padTwo(seconds)}`
    }

    function formatSpan(ms, translate) {
      if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '—'
      const totalMinutes = Math.max(1, Math.round(ms / 60_000))
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      if (hours > 0) {
        if (minutes === 0) return formatText(translate('durationHours'), { h: hours })
        return formatText(translate('durationHoursMinutes'), { h: hours, m: minutes })
      }
      return formatText(translate('durationMinutes'), { m: minutes })
    }

    /** Server-anchored countdown so a slow or fast client clock does not drift. */
    function pricingCountdown(pricing, generatedAt, clientNow) {
      if (!pricing || typeof pricing.endsAt !== 'number') return null
      const anchor =
        typeof pricing.serverNow === 'number' ? pricing.serverNow : generatedAt
      const skew =
        typeof generatedAt === 'number' && typeof anchor === 'number'
          ? anchor - generatedAt
          : 0
      const serverNow = clientNow + skew
      return {
        remainingMs: Math.max(0, pricing.endsAt - serverNow),
        serverNow,
      }
    }

    function errorText(error) {
      if (!error) return ''
      if (typeof error === 'string') return error
      if (error.message) return String(error.message)
      return String(error)
    }

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        const tt = (key, vars) => formatText(t(key), vars)

        ctx.effect(
          () => ctx.locale.register(NS, { en: EN, zh: ZH }),
          'usage-dashboard: dictionary',
        )

        ctx.effect(() => {
          const element = document.createElement('style')
          element.setAttribute('data-dsh-usage-dashboard', '')
          element.textContent = CSS
          ;(document.head || document.documentElement).appendChild(element)
          return () => element.remove()
        }, 'usage-dashboard: styles')

        function useTranslate() {
          const [, bump] = React.useState(0)
          React.useEffect(() => ctx.locale.subscribe(() => bump((value) => value + 1)), [])
          return tt
        }

        function switchErrorText(payload, translate, fallback) {
          const code = payload && payload.code
          if (code === 'invalid-selection') return translate('errorInvalidSelection')
          if (code === 'config-unavailable') return translate('errorConfigUnavailable')
          if (code === 'switch-failed') return translate('errorSwitchFailed')
          if (code === 'method-not-allowed') return translate('errorBadRequest')
          return (payload && payload.error) || fallback
        }

        const PREFS_KEY = 'dsh-usage-dashboard:footer-items'
        const DEFAULT_FOOTER_PREFS = {
          balance: true,
          spend: true,
          pricing: true,
          day: false,
          month: false,
          year: false,
          fontSize: 12,
        }
        const FOOTER_PREF_KEYS = ['spend', 'pricing', 'day', 'month', 'year']

        function normalizeFooterPrefs(value) {
          const next = {
            ...DEFAULT_FOOTER_PREFS,
            ...(value && typeof value === 'object' ? value : {}),
          }
          next.balance = true
          for (const key of FOOTER_PREF_KEYS) next[key] = Boolean(next[key])
          const size = Number(next.fontSize)
          next.fontSize = Number.isFinite(size)
            ? Math.min(16, Math.max(10, Math.round(size)))
            : DEFAULT_FOOTER_PREFS.fontSize
          return next
        }

        function readFooterPrefs() {
          try {
            const raw = window.localStorage.getItem(PREFS_KEY)
            return normalizeFooterPrefs(raw ? JSON.parse(raw) : null)
          } catch {
            return { ...DEFAULT_FOOTER_PREFS }
          }
        }

        let footerPrefs = readFooterPrefs()
        const footerPrefsListeners = new Set()

        function subscribeFooterPrefs(listener) {
          footerPrefsListeners.add(listener)
          return () => footerPrefsListeners.delete(listener)
        }

        function getFooterPrefs() {
          return footerPrefs
        }

        function setFooterPrefs(patch) {
          footerPrefs = normalizeFooterPrefs({ ...footerPrefs, ...patch, balance: true })
          try {
            window.localStorage.setItem(PREFS_KEY, JSON.stringify(footerPrefs))
          } catch {
            /* a blocked localStorage must not break the toggle */
          }
          for (const listener of [...footerPrefsListeners]) {
            try {
              listener()
            } catch {
              /* a failing subscriber must not break the preference */
            }
          }
        }

        function useFooterPrefs() {
          return React.useSyncExternalStore(
            subscribeFooterPrefs,
            getFooterPrefs,
            getFooterPrefs,
          )
        }

        const store = {
          state: { status: 'loading', data: null, error: null },
          listeners: new Set(),
          promise: null,
          lastAt: 0,
          polling: 0,
          timer: null,
          visibilityHandler: null,
          get() {
            return store.state
          },
          subscribe(listener) {
            store.listeners.add(listener)
            return () => store.listeners.delete(listener)
          },
          set(patch) {
            store.state = { ...store.state, ...patch }
            for (const listener of store.listeners) {
              try {
                listener()
              } catch {
                /* a failing subscriber must not break the store */
              }
            }
          },
          startPolling() {
            store.polling += 1
            if (store.polling > 1) return
            const tick = () => store.refresh(false)
            tick()
            store.timer = setInterval(tick, 2_000)
            store.visibilityHandler = () => {
              if (store.timer !== null) clearInterval(store.timer)
              const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
              store.timer = setInterval(tick, hidden ? 15_000 : 2_000)
            }
            document.addEventListener('visibilitychange', store.visibilityHandler)
          },
          stopPolling() {
            if (store.polling === 0) return
            store.polling -= 1
            if (store.polling > 0) return
            if (store.timer !== null) {
              clearInterval(store.timer)
              store.timer = null
            }
            if (store.visibilityHandler) {
              document.removeEventListener('visibilitychange', store.visibilityHandler)
              store.visibilityHandler = null
            }
          },
          refresh(force) {
            if (store.promise) return store.promise
            if (!force && store.lastAt && Date.now() - store.lastAt < 500) {
              return Promise.resolve()
            }
            if (!store.state.data) store.set({ status: 'loading', error: null })
            store.promise = (async () => {
              try {
                const response = await fetch(`${STATS_URL}${force ? '?refresh=1' : ''}`)
                const text = await response.text()
                let payload = null
                try {
                  payload = text ? JSON.parse(text) : null
                } catch {
                  payload = null
                }
                if (!response.ok || !payload || payload.ok !== true) {
                  throw new Error((payload && payload.error) || `HTTP ${response.status}`)
                }
                store.lastAt = Date.now()
                store.set({ status: 'ready', data: payload, error: null })
              } catch (error) {
                store.set({
                  status: store.state.data ? 'ready' : 'error',
                  error: errorText(error),
                })
              } finally {
                store.promise = null
              }
            })()
            return store.promise
          },
        }

        function useNow(intervalMs) {
          const [now, setNow] = React.useState(() => Date.now())
          React.useEffect(() => {
            const timer = setInterval(() => setNow(Date.now()), intervalMs || 1_000)
            return () => clearInterval(timer)
          }, [intervalMs])
          return now
        }

        function usePricingCountdown(pricing, generatedAt) {
          const now = useNow(1_000)
          const countdown = pricingCountdown(pricing, generatedAt, now)
          const refreshedEnd = React.useRef(null)
          const remainingMs = countdown ? countdown.remainingMs : null
          React.useEffect(() => {
            if (!pricing || remainingMs === null || remainingMs > 0) return
            if (refreshedEnd.current === pricing.endsAt) return
            refreshedEnd.current = pricing.endsAt
            store.refresh(true)
          }, [pricing, remainingMs])
          return countdown
        }

        function useStats() {
          const state = React.useSyncExternalStore(store.subscribe, store.get, store.get)
          React.useEffect(() => {
            store.startPolling()
            return () => store.stopPolling()
          }, [])
          return state
        }

        function openPanel() {
          try {
            ctx.layout.selectPanel(PANEL_ID)
          } catch (error) {
            console.error('[usage-dashboard] cannot open panel', error)
          }
        }

        function UsageIcon(props) {
          const size = props && props.size ? props.size : 20
          return h(
            'svg',
            {
              width: size,
              height: size,
              viewBox: '0 0 24 24',
              fill: 'none',
              'aria-hidden': 'true',
              style: { display: 'block', flex: '0 0 auto' },
            },
            h('path', {
              d: 'M4 20v-7',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
            }),
            h('path', {
              d: 'M10 20V6',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
            }),
            h('path', {
              d: 'M16 20v-9',
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeLinecap: 'round',
            }),
            h('circle', { cx: 19.5, cy: 4.5, r: 2, fill: 'currentColor' }),
          )
        }

        function summaryValues(state, translate) {
          const data = state.data
          if (!data) {
            return {
              title: translate('summaryLabel'),
              balance: null,
              balanceLabel: '—',
              spend: null,
              today: null,
            }
          }
          const wallets = data.balance && data.balance.wallets ? data.balance.wallets : []
          const balance = wallets.length ? wallets.map(formatWallet).join(' · ') : null
          const todayTokens = data.usage && data.usage.today ? data.usage.today.total : null
          const monthTokens = data.usage && data.usage.month ? data.usage.month.total : null
          const yearTokens = data.usage && data.usage.year ? data.usage.year.total : null
          const cost = data.usage && data.usage.today ? data.usage.today.cost : null
          const status = data.balance && data.balance.status
          const balanceLabel =
            balance ||
            (status === 'signed-out'
              ? translate('signedOutShort')
              : status === 'loading'
                ? translate('loading')
                : null)
          return {
            title: [
              `${translate('balance')}: ${balance || (status === 'signed-out' ? translate('signedOut') : '—')}`,
              `${translate('spend')}: ${formatCny(cost)}`,
              `${translate('today')}: ${compact(todayTokens)}`,
            ].join('\n'),
            balance,
            balanceLabel,
            spend: cost,
            today: todayTokens,
            month: monthTokens,
            year: yearTokens,
          }
        }

        function SummaryAction(props) {
          const translate = useTranslate()
          const state = useStats()
          const prefs = useFooterPrefs()
          const values = summaryValues(state, translate)
          const wide = Boolean(props && props.wide)
          const pricing = state.data && state.data.pricingWindow
          const isPeak = pricing && pricing.phase === 'peak'
          const countdown = usePricingCountdown(
            pricing,
            state.data && state.data.generatedAt,
          )
          const currentPhase = pricing
            ? isPeak
              ? translate('phasePeak')
              : translate('phaseOffPeak')
            : null
          const tokenParts = []
          if (prefs.day) {
            tokenParts.push(`${translate('dayShort')} ${compact(values.today)}`)
          }
          if (prefs.month) {
            tokenParts.push(`${translate('monthShort')} ${compact(values.month)}`)
          }
          if (prefs.year) {
            tokenParts.push(`${translate('yearShort')} ${compact(values.year)}`)
          }
          const baseFont = prefs.fontSize || 12
          if (!wide) {
            return h(
              'button',
              {
                type: 'button',
                className: 'dsh-usage-summary is-rail',
                title: values.title,
                'aria-label': translate('summaryAria'),
                onClick: openPanel,
              },
              h(UsageIcon, { size: 18 }),
            )
          }
          return h(
            'button',
            {
              type: 'button',
              className: 'dsh-usage-summary',
              title: values.title,
              'aria-label': translate('summaryAria'),
              onClick: openPanel,
            },
            h(
              'span',
              {
                className: 'dsh-usage-summary-top',
                style: { fontSize: `${baseFont}px`, lineHeight: `${baseFont + 5}px` },
              },
              h(UsageIcon, { size: 14 }),
              h(
                'span',
                { className: 'dsh-usage-summary-balance', style: { fontSize: `${baseFont}px` } },
                values.balanceLabel || translate('balanceUnavailable'),
              ),
              prefs.spend
                ? h(
                    'span',
                    {
                      className: 'dsh-usage-summary-spend',
                      style: { fontSize: `${Math.max(10, baseFont - 1)}px` },
                    },
                    `${translate('spendShort')} ${formatCny(values.spend)}`,
                  )
                : null,
              prefs.pricing && pricing
                ? h(
                    'span',
                    {
                      className: 'dsh-usage-summary-pricing',
                      style: {
                        fontSize: `${Math.max(10, baseFont - 1)}px`,
                        lineHeight: `${baseFont + 3}px`,
                      },
                      title: formatText(translate('pricingRules'), {
                        peak: fullRanges(pricing),
                      }),
                    },
                    h('span', {
                      className: `dsh-usage-phase-dot ${isPeak ? 'is-peak' : 'is-off'}`,
                    }),
                    (() => {
                      const remainingText = countdown
                        ? formatCountdown(countdown.remainingMs)
                        : '—'
                      return formatText(translate('phaseValue'), {
                        phase: currentPhase,
                        value: remainingText,
                      })
                    })(),
                  )
                : null,
            ),
            tokenParts.length > 0
              ? h(
                  'span',
                  {
                    className: 'dsh-usage-summary-tokens',
                    style: { fontSize: `${Math.max(10, baseFont - 1)}px` },
                  },
                  tokenParts.join(' · '),
                )
              : null,
          )
        }

        function StatCard(props) {
          return h(
            'section',
            { className: 'dsh-usage-card' },
            h('div', { className: 'dsh-usage-label' }, props.label),
            h(
              'div',
              { className: `dsh-usage-value${props.small ? ' dsh-usage-value-small' : ''}` },
              props.value,
            ),
            props.meta ? h('div', { className: 'dsh-usage-meta' }, props.meta) : null,
          )
        }

        function UsageItem(props) {
          return h(
            'div',
            { className: 'dsh-usage-usage-item' },
            h('div', { className: 'dsh-usage-usage-label' }, props.label),
            h('div', { className: 'dsh-usage-usage-value' }, props.value),
            props.meta ? h('div', { className: 'dsh-usage-usage-meta' }, props.meta) : null,
          )
        }

        function DashboardPanel() {
          const translate = useTranslate()
          const state = useStats()
          const prefs = useFooterPrefs()
          const data = state.data
          const [provider, setProvider] = React.useState('')
          const [model, setModel] = React.useState('')
          const [switching, setSwitching] = React.useState(false)
          const [refreshing, setRefreshing] = React.useState(false)
          const [notice, setNotice] = React.useState(null)
          const [switchError, setSwitchError] = React.useState(null)
          const [taskQuery, setTaskQuery] = React.useState('')
          const [taskSort, setTaskSort] = React.useState('today')
          const [showAllTasks, setShowAllTasks] = React.useState(false)

          React.useEffect(() => {
            if (!data || !data.api) return
            const current = data.api.current
            setProvider((previous) => previous || (current && current.provider) || '')
            setModel((previous) => previous || (current && current.model) || '')
          }, [data])

          const liveCountdown = usePricingCountdown(
            data && data.pricingWindow,
            data && data.generatedAt,
          )

          const options = (data && data.api && data.api.options) || []
          const apiLoading = Boolean(data && data.api && data.api.status === 'loading')
          const current = (data && data.api && data.api.current) || null
          const selected = options.find((option) => option.provider === provider) || null
          const models = selected ? selected.models.slice() : []
          if (model && !models.some((item) => item.id === model)) {
            models.unshift({ id: model, name: model })
          }

          async function applySwitch() {
            if (!provider || !model || switching) return
            setSwitching(true)
            setSwitchError(null)
            setNotice(null)
            try {
              const response = await fetch(SWITCH_URL, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ provider, model }),
              })
              const text = await response.text()
              let payload = null
              try {
                payload = text ? JSON.parse(text) : null
              } catch {
                payload = null
              }
              if (!response.ok || !payload || payload.ok !== true) {
                throw new Error(
                  switchErrorText(payload, translate, `HTTP ${response.status}`),
                )
              }
              if (payload.current) {
                setProvider(payload.current.provider)
                setModel(payload.current.model)
              }
              setNotice(translate('switchOk'))
              store.refresh(true)
            } catch (error) {
              setSwitchError(errorText(error))
            } finally {
              setSwitching(false)
            }
          }

          async function handleRefresh() {
            if (refreshing) return
            setRefreshing(true)
            try {
              await store.refresh(true)
            } finally {
              setRefreshing(false)
            }
          }

          function handleProviderChange(event) {
            const next = event.target.value
            setProvider(next)
            const option = options.find((item) => item.provider === next)
            const first = option && option.models[0] ? option.models[0].id : ''
            setModel(first)
            setNotice(null)
            setSwitchError(null)
          }

          if (!data) {
            return h(
              'div',
              { className: 'dsh-usage-root' },
              h(
                'div',
                { className: 'dsh-usage-inner' },
                h(
                  'header',
                  { className: 'dsh-usage-head' },
                  h(
                    'div',
                    null,
                    h('h1', { className: 'dsh-usage-title' }, translate('panelTitle')),
                    h('div', { className: 'dsh-usage-sub' }, translate('sourceNote')),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-usage-btn',
                      onClick: handleRefresh,
                      disabled: refreshing,
                    },
                    refreshing ? translate('refreshing') : translate('refresh'),
                  ),
                ),
                state.status === 'error'
                  ? h(
                      'section',
                      { className: 'dsh-usage-section' },
                      h(
                        'div',
                        { className: 'dsh-usage-error' },
                        `${translate('loadFailed')} ${state.error || ''}`,
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-usage-btn',
                          onClick: handleRefresh,
                        },
                        translate('retry'),
                      ),
                    )
                  : h('div', { className: 'dsh-usage-skeleton' }),
                h('p', { className: 'dsh-usage-note' }, translate('loading')),
              ),
            )
          }

          const usage = data.usage || {}
          const today = usage.today || {}
          const month = usage.month || {}
          const year = usage.year || {}
          const daily = Array.isArray(usage.daily) ? usage.daily : []
          const maxDaily = daily.reduce((max, item) => Math.max(max, item.total || 0), 0)
          const hasDaily = daily.some((item) => (item.total || 0) > 0)
          const balance = data.balance || {}
          const wallets = Array.isArray(balance.wallets) ? balance.wallets : []
          const bonusWallets = Array.isArray(balance.bonusWallets) ? balance.bonusWallets : []

          let balanceValue = '—'
          let balanceMeta = null
          if (balance.status === 'ready') {
            balanceValue = wallets.length ? wallets.map(formatWallet).join(' · ') : '—'
            if (bonusWallets.length) {
              balanceMeta = `${translate('bonus')}: ${bonusWallets.map(formatWallet).join(' · ')}`
            }
          } else if (balance.status === 'signed-out') {
            balanceValue = translate('signedOut')
            balanceMeta = translate('signedOutHint')
          } else if (balance.status === 'loading') {
            balanceValue = translate('loading')
            balanceMeta = null
          } else if (balance.status === 'error' || balance.status === 'unavailable') {
            balanceValue = translate('balanceUnavailable')
            balanceMeta = balance.code === 'balance-query-failed' ? null : balance.message || null
          }

          const todayTokens = today.total || 0
          const monthTokens = month.total || 0
          const yearTokens = year.total || 0
          const total = usage.total || {}
          const totalTokens = total.total || 0
          const tasks = Array.isArray(usage.tasks) ? usage.tasks : []
          const taskCount = Number.isFinite(usage.taskCount) ? usage.taskCount : tasks.length
          const taskQueryText = taskQuery.trim().toLowerCase()
          const filteredTasks = tasks.filter(
            (task) =>
              !taskQueryText ||
              String(task.title || '').toLowerCase().includes(taskQueryText) ||
              String(task.id || '').toLowerCase().includes(taskQueryText),
          )
          const sortedTasks = filteredTasks.slice().sort((left, right) => {
            if (taskSort === 'total') {
              return (right.total && right.total.total ? right.total.total : 0) -
                (left.total && left.total.total ? left.total.total : 0)
            }
            return (
              (right.today && right.today.total ? right.today.total : 0) -
                (left.today && left.today.total ? left.today.total : 0) ||
              (right.total && right.total.total ? right.total.total : 0) -
                (left.total && left.total.total ? left.total.total : 0)
            )
          })
          const visibleTaskLimit = showAllTasks ? sortedTasks.length : 12
          const visibleTasks = sortedTasks.slice(0, visibleTaskLimit)
          const taskSortLabel =
            taskSort === 'total' ? translate('taskSortTotal') : translate('taskSortToday')
          let recentTask = null
          for (const task of tasks) {
            if (!recentTask || (task.lastAt || 0) > (recentTask.lastAt || 0)) {
              recentTask = task
            }
          }
          const recentTaskId = recentTask ? recentTask.id : null
          const todayMeta = `${translate('input')} ${compact(today.input)} · ${translate(
            'cacheRead',
          )} ${compact(today.cacheRead)} · ${translate('output')} ${compact(today.output)}`
          const spendMeta = `${translate('spendMonth')} ${formatCny(month.cost)} · ${translate('spendYear')} ${formatCny(year.cost)}`
          const currentText = current
            ? `${current.provider} / ${current.model}`
            : translate('apiNone')
          const pricing = data.pricingWindow || null
          const pricingIsPeak = Boolean(pricing && pricing.phase === 'peak')
          const pricingPhase = pricing
            ? pricingIsPeak
              ? translate('phasePeak')
              : translate('phaseOffPeak')
            : '—'
          const pricingColor = pricing
            ? pricingIsPeak
              ? 'var(--dsw-alias-state-warn-primary)'
              : 'var(--dsw-alias-state-success-primary)'
            : undefined
          const nextPhaseLabel = pricing
            ? pricing.nextPhase === 'peak'
              ? translate('phasePeak')
              : translate('phaseOffPeak')
            : '—'
          const countdownText = liveCountdown
            ? formatCountdown(liveCountdown.remainingMs)
            : pricing
              ? formatCountdown(pricing.remainingMs)
              : '—'

          return h(
            'div',
            { className: 'dsh-usage-root' },
            h(
              'div',
              { className: 'dsh-usage-inner' },
              h(
                'header',
                { className: 'dsh-usage-head' },
                h(
                  'div',
                  null,
                  h(
                    'div',
                    { className: 'dsh-usage-title-row' },
                    h('h1', { className: 'dsh-usage-title' }, translate('panelTitle')),
                    h(
                      'span',
                      {
                        className: `dsh-usage-live${state.error ? ' is-offline' : ''}`,
                        title: state.error || translate('sourceNote'),
                      },
                      h('span', { className: 'dsh-usage-live-dot' }),
                      state.error ? translate('offline') : translate('liveNow'),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'dsh-usage-sub' },
                    `${translate('sourceNote')} ${translate('updated')} ${new Date(
                      data.generatedAt || Date.now(),
                    ).toLocaleTimeString()}`,
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-usage-btn',
                    onClick: handleRefresh,
                    disabled: refreshing,
                  },
                  refreshing ? translate('refreshing') : translate('refresh'),
                ),
              ),

              state.error
                ? h(
                    'div',
                    { className: 'dsh-usage-error' },
                    `${translate('loadFailed')} ${state.error}`,
                  )
                : null,

              pricing
                ? h(
                    'section',
                    { className: 'dsh-usage-banner' },
                    h(
                      'div',
                      { className: 'dsh-usage-banner-main' },
                      h('span', {
                        className: `dsh-usage-phase-dot ${pricingIsPeak ? 'is-peak' : 'is-off'}`,
                      }),
                      h(
                        'span',
                        { className: 'dsh-usage-banner-phase', style: { color: pricingColor } },
                        pricingPhase,
                      ),
                      h(
                        'span',
                        { className: 'dsh-usage-banner-count' },
                        `${translate('remaining')} ${countdownText}`,
                      ),
                    ),
                    h(
                      'div',
                      { className: 'dsh-usage-banner-next' },
                      `${translate('nextPhase')} ${nextPhaseLabel} · ${translate(
                        'duration',
                      )} ${formatSpan(pricing.nextDurationMs, translate)} · ${translate(
                        'endsAt',
                      )} ${pricing.nextEndsAtClock || '—'}`,
                    ),
                    h(
                      'p',
                      { className: 'dsh-usage-banner-rules' },
                      formatText(translate('pricingRules'), { peak: fullRanges(pricing) }),
                    ),
                  )
                : null,

              h(
                'div',
                { className: 'dsh-usage-hero' },
                h(StatCard, { label: translate('balance'), value: balanceValue, meta: balanceMeta }),
                h(StatCard, {
                  label: translate('spend'),
                  value: formatCny(today.cost),
                  meta: spendMeta,
                }),
                h(StatCard, {
                  label: translate('todayTokens'),
                  value: compact(todayTokens),
                  meta: todayMeta,
                }),
              ),

              h(
                'section',
                { className: 'dsh-usage-section' },
                h(
                  'div',
                  { className: 'dsh-usage-section-head' },
                  h('h2', { className: 'dsh-usage-h2' }, translate('usageSummary')),
                  h('span', { className: 'dsh-usage-meta' }, translate('usageSummaryHint')),
                ),
                h(
                  'div',
                  { className: 'dsh-usage-usage' },
                  h(UsageItem, {
                    label: translate('monthTokens'),
                    value: compact(monthTokens),
                    meta: `${translate('spendMonth')} ${formatCny(month.cost)}`,
                  }),
                  h(UsageItem, {
                    label: translate('yearTokens'),
                    value: compact(yearTokens),
                    meta: `${translate('spendYear')} ${formatCny(year.cost)}`,
                  }),
                  h(UsageItem, {
                    label: translate('totalTokens'),
                    value: compact(totalTokens),
                    meta: `${translate('total')} ${formatCny(total.cost)}`,
                  }),
                ),
              ),

              h(
                'section',
                { className: 'dsh-usage-section' },
                h(
                  'div',
                  { className: 'dsh-usage-section-head' },
                  h('h2', { className: 'dsh-usage-h2' }, translate('taskUsage')),
                  h(
                    'span',
                    { className: 'dsh-usage-meta' },
                    formatText(translate('taskUsageHint'), {
                      count: visibleTasks.length,
                      total: taskCount,
                      sort: taskSortLabel,
                    }),
                  ),
                ),
                h(
                  'div',
                  { className: 'dsh-usage-task-controls' },
                  h('input', {
                    className: 'dsh-usage-search',
                    type: 'search',
                    value: taskQuery,
                    placeholder: translate('taskSearchPlaceholder'),
                    'aria-label': translate('taskSearchPlaceholder'),
                    onChange: (event) => setTaskQuery(event.target.value),
                  }),
                  h(
                    'div',
                    { className: 'dsh-usage-task-sorts' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-usage-pref',
                        'aria-pressed': taskSort === 'today' ? 'true' : 'false',
                        onClick: () => setTaskSort('today'),
                      },
                      translate('taskSortToday'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-usage-pref',
                        'aria-pressed': taskSort === 'total' ? 'true' : 'false',
                        onClick: () => setTaskSort('total'),
                      },
                      translate('taskSortTotal'),
                    ),
                  ),
                ),
                tasks.length === 0
                  ? h('p', { className: 'dsh-usage-note' }, translate('noTasks'))
                  : h(
                      'div',
                      { className: 'dsh-usage-task-body' },
                      sortedTasks.length === 0
                        ? h('p', { className: 'dsh-usage-note' }, translate('taskNoMatch'))
                        : h(
                            'div',
                            { className: 'dsh-usage-tasks' },
                            h(
                              'div',
                              { className: 'dsh-usage-task-row is-head' },
                              h(
                                'span',
                                { className: 'dsh-usage-task-name' },
                                translate('taskName'),
                              ),
                              h(
                                'span',
                                { className: 'dsh-usage-task-num' },
                                translate('todayShort'),
                              ),
                              h(
                                'span',
                                { className: 'dsh-usage-task-num' },
                                translate('total'),
                              ),
                              h(
                                'span',
                                { className: 'dsh-usage-task-num' },
                                translate('spendShort'),
                              ),
                            ),
                            visibleTasks.map((task) => {
                              const title = task.title || task.id
                              const tooltip = [
                                title,
                                task.id,
                                `${translate('todayShort')} ${compact(task.today && task.today.total)} · ${translate('monthShort')} ${compact(task.month && task.month.total)} · ${translate('total')} ${compact(task.total && task.total.total)}`,
                                `${translate('spendShort')} ${formatCny(task.today && task.today.cost)}`,
                              ].join('\n')
                              return h(
                                'div',
                                {
                                  key: task.id,
                                  className: `dsh-usage-task-row${task.id === recentTaskId ? ' is-recent' : ''}`,
                                  title: tooltip,
                                },
                                h(
                                  'span',
                                  { className: 'dsh-usage-task-name' },
                                  task.subagent
                                    ? h(
                                        'span',
                                        { className: 'dsh-usage-task-badge' },
                                        translate('subagentBadge'),
                                      )
                                    : null,
                                  task.id === recentTaskId
                                    ? h(
                                        'span',
                                        {
                                          className: 'dsh-usage-task-badge is-recent',
                                        },
                                        translate('recentBadge'),
                                      )
                                    : null,
                                  title,
                                ),
                                h(
                                  'span',
                                  { className: 'dsh-usage-task-num' },
                                  compact(task.today && task.today.total),
                                ),
                                h(
                                  'span',
                                  { className: 'dsh-usage-task-num' },
                                  compact(task.total && task.total.total),
                                ),
                                h(
                                  'span',
                                  { className: 'dsh-usage-task-num' },
                                  formatCny(task.today && task.today.cost),
                                ),
                              )
                            }),
                          ),
                      sortedTasks.length > 12
                        ? h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsh-usage-more',
                              onClick: () => setShowAllTasks((value) => !value),
                            },
                            showAllTasks
                              ? translate('taskShowLess')
                              : `${translate('taskShowAll')} (${sortedTasks.length})`,
                          )
                        : null,
                    ),
              ),

              h(
                'section',
                { className: 'dsh-usage-section' },
                h(
                  'div',
                  { className: 'dsh-usage-section-head' },
                  h('h2', { className: 'dsh-usage-h2' }, translate('footerDisplay')),
                  h('span', { className: 'dsh-usage-meta' }, translate('footerDisplayHint')),
                ),
                h(
                  'div',
                  { className: 'dsh-usage-prefs' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-usage-pref is-locked',
                      'aria-pressed': 'true',
                      disabled: true,
                      title: translate('lockedHint'),
                    },
                    translate('balance'),
                    h('span', { className: 'dsh-usage-pref-lock' }, translate('lockedShort')),
                  ),
                  ...[
                    ['spend', translate('spendShort')],
                    ['pricing', translate('optionPricing')],
                    ['day', translate('optionDay')],
                    ['month', translate('optionMonth')],
                    ['year', translate('optionYear')],
                  ].map(([key, label]) =>
                    h(
                      'button',
                      {
                        key,
                        type: 'button',
                        className: 'dsh-usage-pref',
                        'aria-pressed': prefs[key] ? 'true' : 'false',
                        onClick: () => setFooterPrefs({ [key]: !prefs[key] }),
                      },
                      label,
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 'dsh-usage-size' },
                  h(
                    'label',
                    {
                      className: 'dsh-usage-size-label',
                      htmlFor: 'dsh-usage-footer-size',
                    },
                    translate('footerSize'),
                  ),
                  h('input', {
                    id: 'dsh-usage-footer-size',
                    type: 'range',
                    className: 'dsh-usage-range',
                    min: 10,
                    max: 16,
                    step: 1,
                    value: prefs.fontSize,
                    'aria-label': translate('footerSize'),
                    onChange: (event) =>
                      setFooterPrefs({ fontSize: Number(event.target.value) }),
                  }),
                  h('span', { className: 'dsh-usage-size-value' }, `${prefs.fontSize}px`),
                ),
                h('p', { className: 'dsh-usage-note' }, translate('footerSizeHint')),
              ),

              h(
                'section',
                { className: 'dsh-usage-section' },
                h(
                  'div',
                  { className: 'dsh-usage-section-head' },
                  h('h2', { className: 'dsh-usage-h2' }, translate('dailyTitle')),
                  h(
                    'span',
                    { className: 'dsh-usage-meta' },
                    formatText(translate('chartPeak'), { value: compact(maxDaily) }),
                  ),
                ),
                hasDaily
                  ? h(
                      'div',
                      { className: 'dsh-usage-chart' },
                      daily.map((item) =>
                        h(
                          'div',
                          {
                            key: item.date,
                            className: 'dsh-usage-bar',
                            title: `${item.date} · ${compact(item.total)}`,
                            role: 'img',
                            'aria-label': `${item.date} · ${compact(item.total)}`,
                          },
                          h('div', {
                            className: item.total ? 'dsh-usage-bar-fill' : 'dsh-usage-bar-empty',
                            style: {
                              height: `${item.total ? Math.max(3, Math.round((item.total / maxDaily) * 100)) : 2}%`,
                            },
                          }),
                        ),
                      ),
                    )
                  : h('div', { className: 'dsh-usage-chart-empty' }, translate('chartEmpty')),
                h(
                  'div',
                  { className: 'dsh-usage-chart-foot' },
                  h('span', null, daily.length ? daily[0].date : ''),
                  h('span', null, daily.length ? daily[daily.length - 1].date : ''),
                ),
              ),

              h(
                'section',
                { className: 'dsh-usage-section' },
                h(
                  'div',
                  { className: 'dsh-usage-section-head' },
                  h('h2', { className: 'dsh-usage-h2' }, translate('apiTitle')),
                  h(
                    'span',
                    { className: 'dsh-usage-meta' },
                    `${translate('apiCurrent')}: ${currentText}`,
                  ),
                ),
                options.length === 0
                  ? h(
                      'p',
                      { className: 'dsh-usage-note' },
                      apiLoading ? translate('loadingApi') : translate('noProviders'),
                    )
                  : h(
                      'div',
                      { className: 'dsh-usage-row' },
                      h(
                        'label',
                        { className: 'dsh-usage-field' },
                        translate('provider'),
                        h(
                          'select',
                          {
                            className: 'dsh-usage-select',
                            value: provider,
                            onChange: handleProviderChange,
                          },
                          options.map((option) =>
                            h(
                              'option',
                              { key: option.provider, value: option.provider },
                              option.name || option.provider,
                            ),
                          ),
                        ),
                      ),
                      h(
                        'label',
                        { className: 'dsh-usage-field' },
                        translate('model'),
                        h(
                          'select',
                          {
                            className: 'dsh-usage-select',
                            value: model,
                            onChange: (event) => setModel(event.target.value),
                            disabled: models.length === 0,
                          },
                          models.map((item) =>
                            h('option', { key: item.id, value: item.id }, item.name || item.id),
                          ),
                        ),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-usage-btn dsh-usage-btn-primary',
                          onClick: applySwitch,
                          disabled: switching || !provider || !model,
                        },
                        switching ? translate('switching') : translate('apply'),
                      ),
                    ),
                selected && selected.models.length === 0
                  ? h('p', { className: 'dsh-usage-note' }, translate('noModels'))
                  : null,
                switchError ? h('div', { className: 'dsh-usage-error' }, switchError) : null,
                notice ? h('div', { className: 'dsh-usage-ok' }, notice) : null,
                h('p', { className: 'dsh-usage-note' }, translate('switchHint')),
              ),

              h(
                'div',
                { className: 'dsh-usage-foot' },
                h(
                  'p',
                  { className: 'dsh-usage-note' },
                  translate('sourceNote'),
                  usage.sessions
                    ? ` ${formatText(translate('sessionsCount'), { count: usage.sessions })}`
                    : '',
                ),
                h('p', { className: 'dsh-usage-note' }, translate('estimatedNote')),
                pricing && pricing.holidayDataExpired
                  ? h('p', { className: 'dsh-usage-warn' }, translate('pricingHolidayExpired'))
                  : null,
                pricing
                  ? h('p', { className: 'dsh-usage-note' }, translate('pricingHolidayNote'))
                  : null,
                usage.total &&
                usage.total.total > 0 &&
                usage.total.pricedTokens === 0
                  ? h('p', { className: 'dsh-usage-warn' }, translate('noPricing'))
                  : null,
                usage.code === 'storage-unavailable'
                  ? h('p', { className: 'dsh-usage-warn' }, translate('storageError'))
                  : null,
                usage.message && usage.code !== 'storage-unavailable'
                  ? h('p', { className: 'dsh-usage-warn' }, usage.message)
                  : null,
                usage.errors
                  ? h(
                      'p',
                      { className: 'dsh-usage-warn' },
                      formatText(translate('errorsCount'), { count: usage.errors }),
                    )
                  : null,
              ),
            ),
          )
        }

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            {
              name: 'sidebar.footer.action',
              id: 'usage-dashboard-summary',
              order: 0,
              label: () => t('summaryLabel'),
            },
            SummaryAction,
          ),
        )

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
            },
            DashboardPanel,
          ),
        )
      },
    }
  },
})
