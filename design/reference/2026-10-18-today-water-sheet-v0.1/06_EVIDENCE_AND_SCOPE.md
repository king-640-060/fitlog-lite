# 基准/证据边界

## 当前已知源码（2026-10-18）

- `src/ui/recovery.ts`：今日水卡仍有 `waterExpanded` / `revealWater` / `<div id="today-water-actions">`；右侧按钮 `secondary today-activity-action water-expand-toggle` 带 SVG chevron。
- 同文件 `showWaterRecord(ui)` 使用现成 `setSheetVariant(dialog,'content')`、快捷 +500/+1000、自定义 `showWaterEditor()`、`addWater`、`waterUndo`；可复用于 Today；对父子 Sheet 的关闭和状态回归需现场测。
- `src/styles/main.css` 提供同级 `.today-activity-card .today-activity-action`；`src/styles/recovery.css` 提供旧 `.water-expand-toggle .icon` 旋转、旧卡内 `.water-collapsible`，改进时仅清理不再使用者。
- 最终远程 START SHA（写包时）：`120cb0624d0efa06b7ff7ce638e7d02104d4d62c`。

## 原型演示证据（不是生产）

- HTML：`FitLog_Today_Water_Bottom_Sheet_Interactive_Prototype_v0.1.html`，SHA256 `b611db36022fa5232c4d17d13f7039547bc31d0967ed6ce50e05790ae2616c39`，23KB 级别自包含文件。
- 浅色首页、浅色 Sheet、深色 Sheet：`preview/`。
- 原型 QA：`evidence/prototype_browser_QA.json`；记录 Chromium 移动视口模拟 320、375、390、430 × 浅深色八组 PASS；在原型测试字体环境，四按钮宽度均 78px；无页面根级横向溢出。
- 前一轮浏览器原型行为：+500／自定义／历史／撤销／关闭作过模拟点击检查，但用户 iPhone 真机不包含在原型 QA 里。打包过程**不重新运行真实浏览器或生产应用**。

## 从先前正式修复继承的基线（不是本轮新结论）

- 上轮 Today 水按钮配色已通过独立核查；当时 GitHub 远程 main 为 `120cb0624d0efa06b7ff7ce638e7d02104d4d62c`、CI 1081/1081通过。
- 原正式 Today 卡内展开与 WebKit Undo −128px 均属于旧交互背景；此版需要实测 Sheet 替换后的新行为，不能复用旧截图假装新开发已通过。

## 视觉与技术取舍

用户确认的要点是「无箭头/不压缩」与「点击后从底部弹出」。其他入口如历史沿用现有成熟 Sheet 生命周期，而非逐像素复制独立演示 DOM；前提是保持内容可达和用户预期。如需重大改变这些核心决策，先停、说明阻断、请用户重新确认。
