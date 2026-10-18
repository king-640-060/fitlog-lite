# QA、证据与发布安全要求

## 初始现场与授权

批准原型完整单文件 `prototype/FitLog_Today_Water_Bottom_Sheet_Interactive_Prototype_v0.1.html`，SHA256 `b611db36022fa5232c4d17d13f7039547bc31d0967ed6ce50e05790ae2616c39`。正式仓库生成包时远程 main `120cb0624d0efa06b7ff7ce638e7d02104d4d62c`；Codex 必须现场确认其是否仍是 HEAD，不能复用旧 SHA 作虚假的最终版本。

用户授权：此次底部 Sheet 的**限定开发、隔离数据下的自动化回归、正常非强推 CI/Pages 发布**。不授权：使用/清理/上传/覆盖个人PWA健康数据；迁移数据库；改变既有日历、报告、模板删除、任务数据；额外修复 WebKit 撤销页面滚动或其他共享 UI 除非新 Sheet 有阻断回归。

## 执行建议

1. 先封存 START、已通过的按钮改色场景与 base Profile 哈希；不要 reset/reseed 任何生产 profile。
2. 只修改最少代码，让 Today 复用进度饮水 Sheet。逐个测 Home/Progress 的打开、关闭、成功、错误、嵌套自定义、参考值、历史、Undo。
3. 新增跨引擎 browser 测试与截图；现有 `tests/browser/todayWaterButton.mjs` 针对**旧** Disclosure 展开场景的断言必须按新批准设计更新，保留原数据安全/Undo/样式同级等更高语义。其他 `uxWaterCascade` 浏览器断言若仍要求卡内快捷入口，也应精确替换成新 Sheet 流程。严禁整个删除旧套件。
4. 测试方法应区分真实用户点击（如 tap）与脚本直接触发，至少检查一次真正的 Sheet DOM/可见性和数据层结果。禁止仅检查原型。
5. 推荐默认/200%字体、浅深色、320/375/390/430、短屏、安全区、横屏、失网离线；真机 Safari/PWA/VoiceOver等继续保留 Pending。
6. 记录 screenshot、computed style、实际按钮宽度和 Sheet 可见区域、失败记录/诊断、测试命令/退出码。不要把重试失败当作 PASS 或当作全部矩阵重跑。
7. 全量 `npm run typecheck`、`npm test`、`npm run build`，加必要旧 browser suites、新真实交互 suites，确保 DB22 表内容前后准确，Backup/Restore/Sync 不变。
8. Application commit → GitHub CI → GitHub Pages → 线上同源隔离 profile 点击与资源核验 → END docs-only commit → END CI → 再次线上 JS/CSS/SW/build-info、离线及合成档案一致性核查。
9. 上传最终十项回执与测试/截图证据。结束后停止开发，交回 ChatGPT 独立审查。真实 iPhone 的认可不自动由 CI 代替。

## 保留的已知 WebKit 滚动行为

上轮改色阶段实测 Chromium Undo 0px，WebKit 390px Undo −128px，且在修复前后等同。该现象**本轮不是授权改动目标**。新实现因用 Sheet 替代卡内展开，滚动路径可能变化：需要测实际相应行为，不可拿之前值强行期待相等。如果负面回归或阻断用户操作，则先给出真实复现、范围和最小补救建议，未经授权不大面积改 Toast/Scroll/Sheet 框架。
