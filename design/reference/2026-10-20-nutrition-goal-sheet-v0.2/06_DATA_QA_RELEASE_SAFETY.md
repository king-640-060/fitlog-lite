# 数据、测试与正式发布安全约束

## 数据保护
- 禁止清空 IndexedDB、重建数据库、重置个人历史、删除/恢复用户真实营养模板进行 QA。所有危险场景仅在合成 fixtures/隔离浏览器 profile 中验证。
- 数据库版本和22表不变；Backup14/Restore1–14/Sync1兼容不变；保留已保存旧日目标及 strategySelection/cycleSelection/源快照、模板历史阶段、营养周期与日排程、所有饮食/体重/饮水/睡眠/训练/习惯事实、计划任务和共享定义。仅在用户逐步显式确认后写批准的模板、阶段或选定日目标。
- 旧的“删除模板及区间健康事实”的明确双重确认流程完全不受本次 UI 改动影响。
- 测试要覆盖所有允许/不允许的数据对象。对有历史数据的合成档案按表做前后快照和哈希，验证页面关闭/重开/离线/升级。

## 真实浏览器回归
- 新的端到端 QA 必须执行每个业务环节和错误分支，不能只点几张演示页面。特别要运行 iOS-like WebKit 与 Chromium 的 viewport/键盘/scroll geometry 断言。
- 实际产品截图对照 `preview/`。显示状态时检查“只有一个使用中”，日期/来源正确，底部保存按钮不会隐藏。字体放大和缩短视口时 Sheet 内部滚动可达。
- 在当前 app 上跑 typecheck、unit、build、原有全浏览器测试命令、新增模板/目标选择与原生 Sheet 回归、PWA 升级离线冷启动。记录首次失败及最终复测，不得把脚本断言修正当成产品通过证据。
- 现有 `main` 的其它域（记录饮水底部 Sheet、独立三趋势及固定高度、两种报告、营养周期删除）不能顺手重构。

## 交付流程
- 按 `AGENTS.md`、`docs/CHAT_CODEX_WORKFLOW.md` 的既有 Application + END 交付执行。Git 正常非强推，提交前 `fetch` 检查并发变化；不要强制覆盖远端。
- 附 START/Application/END commit SHA、完整 diff 清单、变更前后截图、实测宽高与滚动 JSON、CI 链接、线上 build-info/App/SW/缓存资源核验、离线冷启动原始证据、真实业务数据保护比对。
- 若发现不能在保持历史目标/周期语义的前提下实现所批准 UX，请停工报告冲突，不得暗自迁移数据或覆盖旧目标。
- 实体 iPhone Safari、原安装 PWA、VoiceOver、真实键盘/Safe Area、个人数据连续性，以及真实 Provider（若未执行）明确 Pending。完工提交十项回执，然后停止开发等待独立核查。
