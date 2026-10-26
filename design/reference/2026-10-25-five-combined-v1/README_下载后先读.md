# FitLog Lite · 五项联合修复与双主题包

**这是 ChatGPT → Codex 的正式开发交接包，不是生产代码。**

## 最终确认的五个需求

1. 全 App 冗余小字清理：删说明但不删真实数据、单位、风险/保存/缺测状态。
2. 单次力量训练可选名称，和训练模板名称独立；另存模板时仅经明确勾选可同步命名尚未自定义命名的本次记录。
3. 自由训练（现有空白训练改为易懂入口）允许只记录一个动作，不强迫做模板；历史紧凑展示。
4. 两套主题：Classic 原配色（保留系统/浅色/深色模式）与 Light Native（固定已批准浅色）。**无动漫第三主题。**
5. iPhone 睡眠原生 `input type=time` 滚轮与主题、Sheet、日期及键盘适配。原生滚轮内部不能可靠自定义。

## 文件

- `CODEX_五项联合开发正式合同.md`：完整工作范围、验收、安全和协作要求，Codex 必须先读。
- `FitLog_五项联合交互原型_v1.html`：可独立双击/网页打开的交互样稿；它只演示入口和状态，模拟数据**不代表正式产品布局**。
- `LOCAL_PROTOTYPE_QA.json`：Chromium 本地演示 UI 32/32 检查记录；**不等于正式代码**测试。
- `PREVIEW_*.png`：演示截图。
- `SHA256SUMS.txt`：冻结校验。

## 代码基线

打包前核对的 GitHub `main` = `68f4747994fd84bd2ef965c93ee3b009a3b52b72`。Codex 开始之前重新拉取最新 `origin/main`，不覆盖并发开发。先读仓库 `AGENTS.md`、`LATEST_DEV_REPORT.md`、`docs/CHAT_CODEX_WORKFLOW.md`、`docs/UI_INTERACTION_SPEC.md` 等。

## 使用顺序

1. 浏览原型，使用右上 `···`→外观，在两套主题间切换；查看训练命名、模板与睡眠输入。
2. 将本 ZIP 完整交给 Codex，让它核对 SHA256；以正式合同执行开发。
3. Codex 应分阶段测 5 项，留首次 FAIL 和复测证据，完成真实 CI/Pages 后交付十项回执。
4. 回执交 ChatGPT 独立核查，iPhone 原安装 PWA 仍由用户进行实体实测。

⚠ 主题示意只使用大致布局；确切 Classic 配色必须恢复自已批准的 v0.6.1 代码及证据，Light Native 则来自当前 v0.5.1 正式版。不能用原型的简化数据或 UI 替换生产。
