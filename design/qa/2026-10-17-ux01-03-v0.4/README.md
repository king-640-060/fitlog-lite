# UX-01–03 v0.4 原型与本地候选 UI 对照

实际运行唯一批准原型，未修改原 HTML；同为390×932、浅色、100%字体。两引擎的原始 PNG 分别保留，完整320/375/390/430/844、深浅、100/140/200%原图在本轮交付包中。

这些是提交前候选构建截图（构建身份仍为 START d8b08b7 / local=true），不是生产截图。正式发布证据另存交付包 production-*，对应 Application/END 身份。截图 SHA256 见 [MANIFEST.json](MANIFEST.json)。

|场景|批准原型 Chromium|候选 Chromium|批准原型 WebKit|候选 WebKit|
|---|---|---|---|---|
|today-collapsed|[原型](chromium-prototype-today-collapsed.png)|[候选](chromium-candidate-today-collapsed.png)|[原型](webkit-prototype-today-collapsed.png)|[候选](webkit-candidate-today-collapsed.png)|
|today-expanded|[原型](chromium-prototype-today-expanded.png)|[候选](chromium-candidate-today-expanded.png)|[原型](webkit-prototype-today-expanded.png)|[候选](webkit-candidate-today-expanded.png)|
|water-sheet|[原型](chromium-prototype-water-sheet.png)|[候选](chromium-candidate-water-sheet.png)|[原型](webkit-prototype-water-sheet.png)|[候选](webkit-candidate-water-sheet.png)|
|cascade-preview|[原型](chromium-prototype-cascade-preview.png)|[候选](chromium-candidate-cascade-preview.png)|[原型](webkit-prototype-cascade-preview.png)|[候选](webkit-candidate-cascade-preview.png)|

人工检查：饮水卡保持其他 Today 卡片的左右边界，默认仅累计/参考/历史/展开；展开后500/1000等权、44px触控、次级自定义；进度采用已有 content Sheet；删除预览六类真实数量、危险说明、原生 checkbox、禁用确认与取消均可见。

必要差异：保留正式 App 导航和共享管理工作区/Sheet，不复制演示导航；日期、名称、参考值、数量来自真实隔离测试数据；候选15条关联对象不同于演示计数。200%字体/窄屏允许控件纵排和内容滚动以保留44px与16px输入；不复制原型在该场景的文本挤压。候选顶部 Back 是共享工作区的父级导航；第二次危险确认使用正式 App 原有确认框。保留原有模板详情及阶段数据，不新增营养模板分析报告。

仅静态截图暂时隐藏已测过的瞬时 Undo Toast，随后立即恢复；Undo 的真实行为、精确ID和卡片高度不变均另行自动化验证。原始截图不做图像裁剪合成或像素修改（候选使用实际元素截图，原型为页面截图）。浏览器截图不代替真实 iPhone/PWA/键盘验收。
