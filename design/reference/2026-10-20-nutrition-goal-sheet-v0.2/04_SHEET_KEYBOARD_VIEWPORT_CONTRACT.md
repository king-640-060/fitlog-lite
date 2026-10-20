# iPhone Sheet／键盘／视口尺寸修复合同

## 事实与疑点
用户提供实机视频可见：新建模板 → 添加日方案/输入 → 保存后返回模板编辑时，Sheet 出现高度缩短与操作按钮难以触达。源码 `src/ui/nutritionStrategies.ts` 的日方案 `edit()` 进入子视图时调用 `stabilizeSheetSubview(dialog)`，后者位于 `src/ui/motion.ts`，将 `dialog.getBoundingClientRect().height` 固定到 `dialog.style.height`。返回子视图时恢复 parentScroll，但没有统一释放/重新计算该固定内联高度。以上是高度异常的合理风险点，**不是对所有 iPhone 原因的绝对断言**：还须实际复现并测量 VisualViewport、Safe Area、键盘过渡时序与路由栈。

## 强制效果
- 用现有 `.sheet`、`.sheet[data-sheet-variant=large]`、`setupSheetViewport()`、管理工作区来保证稳定容器，按 VisualViewport 可用高度和底部 Safe Area 限制，不在各子视图切换时重新按短内容 shrink-wrap。
- 进入 `#strategy-variant-subview` 和回到 `#strategy-editor-root` 后的 Sheet 外框尺寸、视口锚点及 footer 均稳定：允许键盘导致的**受控视口高度变化**，不允许键盘关闭/保存后沿用错误的较小内联高度。
- 不允许简单添加 `scrollIntoView` 到全局 `window` 造成页面/Sheet 竞争滚动；正文内部 `.modal-body` 滚动、header 和必要 footer 可访问。输入框聚焦后不可被真实键盘覆盖；保存按钮在短视口时可通过明确的 Sheet 内部滚动抵达，优先保持 footer 可见。
- 冻结高度的生命周期要安全解除/重新计算。不得改变报告、其它对话框、历史页、饮水 Sheet 的全局布局；如修改 `stabilizeSheetSubview`，证明所有其它调用方不回归。
- 子页 back/ESC、失焦/收键盘、关闭/重新打开、切换主题、字号200%、旋转、网络错误时，都不能遗留旧 `style.height`、旧 scrollTop、无效焦点、死路由。

## 几何测量
在 Chromium+WebKit 模拟和实际可访问的设备环境，记录每一步：`innerHeight`、`visualViewport.height/offsetTop`、`--sheet-viewport-height`、`--sheet-bottom-offset`、`dialog.top/bottom/height`、`.modal-head`、`.modal-body`、可见 footer、`scrollTop/scrollHeight/clientHeight`、聚焦输入矩形、键盘遮挡区域、Safe Area。比较：初始打开 → 子视图 → 键盘弹出 → 输入后保存 → 键盘收起 → 返回父编辑页 → 整体保存 → 重开。每次保存操作不得在遮挡区；不得依赖拍照手工估计高度。

## 真机状态
浏览器模拟键盘和 iOS WebKit 引擎测试可以完成工程 QA，但**实体 iPhone Safari、原安装 PWA、真实系统键盘、Safe Area、VoiceOver 焦点与个人数据连续性始终 Pending**，除非实际有对应原始证据。不得因模拟通过而将真机标为 PASS。
