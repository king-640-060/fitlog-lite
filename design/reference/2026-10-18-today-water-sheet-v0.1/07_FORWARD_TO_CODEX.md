# 可直接发送给 Codex

请以我上传的 **FitLog Lite 今日饮水底部 Sheet v0.1 正式开发 ZIP** 为唯一确认输入执行正式实施。

1. 先验证 `prototype/FitLog_Today_Water_Bottom_Sheet_Interactive_Prototype_v0.1.html` 的 SHA256：`b611db36022fa5232c4d17d13f7039547bc31d0967ed6ce50e05790ae2616c39`。这是用户明确批准的方案一；不要采用旧卡内展开或压缩带箭头按钮方案。
2. 严格读取本包 `00_README_请先阅读.md`、`01_CODEX_EXECUTION_INSTRUCTION.md`、`02_APPROVED_DESIGN_LOCK.md`、`03_INTEGRATION_AND_DATA_CONTRACT.md`、`04_ACCEPTANCE_MATRIX.md`、`05_QA_RELEASE_SAFETY.md` 和现行仓库规范、最新 main；不要以打包时 SHA 代替最新远程 main。
3. 今日水按钮继续与其他次级按钮等宽、同色、右侧对齐，但**无箭头**；点击打开现有体系的底部紧凑水记录 Sheet（+500/+1000、次级自定义、历史/参考保留）。成功后自动关闭并支持按 ID Undo，不再在首页展开卡内动作区。优先复用进度页现成 Sheet、`addWater` 和 `waterUndo`。
4. 全部健康/计划/趋势/报告/模板删除/历史事实、数据库及备份同步语义不许擅改；旧 WebKit Undo −128px 是前版已知问题，需实测新实现有无新增回归，不冒充已解决。
5. 执行本包逐条验收、真实双引擎 UI/数据安全回归、typecheck、完整单测、build；只在隔离合成数据测保存/Undo。按既有 START→Application CI/Pages→END 报告-only→END CI/线上实测的工作流正常非强推发布，保留实体 iPhone 真机 Pending。
6. 完成后提交正式十项回执及源码/截图/测量/CI/线上证据，停止开发，交回 ChatGPT 独立核查。

若重用现有 Sheet 引发无法安全解决的父子弹层、焦点或数据语义冲突，停止有风险部分并具体报告，不要自行另建一套存储或扩大产品设计。
