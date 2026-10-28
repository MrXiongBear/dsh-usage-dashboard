# 用量与余额

![100% AI 生成](https://img.shields.io/badge/100%25_AI_%E7%94%9F%E6%88%90-%E6%97%A0%E4%BA%BA%E5%B7%A5%E7%BC%96%E7%A0%81-7c3aed?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![DSH](https://img.shields.io/badge/DSH-Web_Plugin-4f46e5?style=for-the-badge)

> **本插件 100% 由 AI 生成。**
>
> 从第一行代码到这份文档，全部由 AI 编写，没有一行是人工敲的。作者只负责提需求、看效果、说"不对，重来"。
>
> 这意味着：代码能跑，但**没有经过专业的人工代码审计**。它在我自己的机器上工作正常，但不保证在你的环境里也一定没问题。使用前请自己判断，生产环境请谨慎。
>
> 发现问题欢迎开 Issue，我会让 AI 去修。

---

在 DeepSeek Harness（DSH）Web 界面的左下角侧边栏，实时显示 **API 余额、消费估算、峰谷时段倒计时**，点击可展开完整用量仪表盘。

不用再开网页查余额，不用自己算这个月花了多少。

## 它显示什么

- **余额** — DeepSeek 账户钱包（人民币 / 美元），通过 `deepseekAccount.getBalance` 读取。固定在侧边栏显示，不能隐藏。
- **消费估算** — 根据本地记录的 token 用量，按每次调用发生的**峰时或谷时**对应价格计算。这是估算值，不是账单。
- **峰谷实时倒计时** — 按北京时间计算 DeepSeek 官方计费窗口：峰时为周一至周五 `09:00–12:00` 和 `14:00–18:00`（不含法定节假日），其余时段（含周末和节假日）均为谷时，价格约为峰时的一半。侧边栏显示形如 `峰时：01:32:10`，峰时结束后自动切换为 `谷时：15:00:00`。
- **Token 用量** — 日 / 月 / 年 / 全部累计，以及各自的估算消费。数据来自本地持久化的 DSH 会话日志，包含缓存命中和推理 token，按会话版本缓存，空闲会话不会重复读取。
- **分任务用量** — 每个会话/任务单独列出标题、今日 token、累计 token、今日估算消费。子代理会话带 `sub` 标记，最近活跃的任务带 `recent` 标记。支持按标题或 ID 搜索、按今日或累计 token 排序，默认显示 12 条，可展开到最多 100 条。
- **默认 API 切换** — 列出可用的 `llm` 服务商及其模型，切换后持久化为 `agentDefaultModel`，对**新建会话**生效。

## 侧边栏显示设置

仪表盘的「侧边栏显示」区域可以选择左下角摘要显示哪些内容：

| 项目 | 是否可关 |
|---|---|
| 余额 | 固定显示，不可关 |
| 消费估算 | 可关 |
| 峰谷状态 | 可关 |
| 日 token | 可关（默认关） |
| 月 token | 可关（默认关） |
| 年 token | 可关（默认关） |

字号滑块可调 `10px` 到 `16px`，默认 `12px`。配置保存在浏览器 `localStorage` 的 `dsh-usage-dashboard:footer-items`。

## 安装

```bash
dsh plugin --profile web add github:MrXiongBear/dsh-usage-dashboard
```

装完重启 `dsh web`，左下角就会出现。

**如果提示需要 `allowBuilds` 授权**：把 pnpm 打印出来的包名加进该 profile 的 `pnpm-workspace.yaml`：

```yaml
allowBuilds:
  dsh-usage-dashboard: true
```

然后重新执行上面的 `add`。本项目是纯 JavaScript，没有构建步骤，正常情况不会触发授权。

**建议锁定 commit**，避免后续更新悄悄改变实际运行的代码：

```bash
dsh plugin --profile web add github:MrXiongBear/dsh-usage-dashboard#<commit-sha>
```

## 更新与卸载

```bash
# 查看已安装插件
dsh plugin --profile web list

# 卸载
dsh plugin --profile web remove dsh-usage-dashboard
```

## 隐私说明

- 所有数据**只在本机读取和显示**，不上传任何服务器。
- 余额来自你已登录的 DeepSeek 账户，通过 DSH 自身的认证通道获取。
- Token 用量来自本地 DSH 会话日志。
- 插件没有引入任何第三方依赖，不加载外部脚本，不发送埋点。

## 已知限制

- 余额功能需要已登录 DeepSeek 账户。仅用 API Key 的环境仍可使用 token 用量和服务商切换。
- Token 统计只覆盖当前这台机器上的 DSH 安装，不包含其他工具或其他设备的用量。
- 节假日数据目前只覆盖 **2026 年**。跨年后仪表盘会提示峰谷判断可能失效，需要更新 `index.js` 里的 `HOLIDAY_RANGES_2026`。
- 价格表来源：[DeepSeek 官方定价](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)。价格调整后需更新 `index.js` 里的 `PRICING_CNY`。
- 2026 年节假日来源：[国务院办公厅通知](https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm)。

## 文件结构

| 文件 | 作用 |
|---|---|
| `index.js` | Host 端：两个需要认证的 Connection Fetch 路由（`/api/usage-dashboard/` 下），含实时计费分段、价格表、节假日表、用量与余额失效逻辑 |
| `client.js` | 浏览器端：侧边栏摘要（含倒计时）和仪表盘页面（点击摘要打开） |
| `cordis.patch.yml` | 把 `usage-dashboard` Host 条目插入 Cordis 树 |
| `locale/{en,zh}.json` | 插件管理器里的标题和描述 |
| `icon.svg` | 插件图标 |
| `test/pricing.test.mjs` | 价格与峰谷计算的单元测试，`npm test` 运行 |

## 许可

MIT。随便用、随便改、随便分发，出事别找我。

## 反馈

有问题开 [Issue](https://github.com/MrXiongBear/dsh-usage-dashboard/issues)，我会让 AI 处理。
