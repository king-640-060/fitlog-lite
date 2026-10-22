# Sheet、列表滚动及焦点合同

用户实机证据：在指定食物中每点击一个食物，列表“刷新”到此前位置，迫使用户重新向下滑。现有 `src/ui/nutritionCompletionSheet.ts` 把 `data-selected-foods` 克数卡片堆在搜索列表前，`draw()` / `drawPicker()` 会整体重建 HTML；这既改变布局又可能丢失滚动/焦点。

## 精确纠正

- 勾选 `data-designated-food` 只更新勾选状态、固定尺寸的已选摘要和 CTA enable；不得在 `change` handler 内重建 `data-designated-list`；不得整体替换 modal-body、不得通过窗口 scrollTo 补偿。
- 用户主动输入搜索词可以过滤重建结果，同时保留输入焦点和光标，搜索结果从首位显示可以接受；单纯勾选不能当成“新搜索”。
- 已选摘要不可因选择多少食物而变成多行并把列表向下推；超出时横向滚动 chips 或使用稳定高度。列表自身有固定上/下边界和内部自然 scroll；不“强制拉回”到之前点击过的食物。
- 单个勾选的自动化：记录 list.scrollTop → 点选**可见**食物行 → 下一帧 scrollTop 差值应为 0px（允许浮点测量公差 ≤1px）；连续 1/2/3/4 食物、取消选择同样检查。测试不可用程序强制改 scrollTop 再报 PASS。
- 从计算结果页返回选择：恢复已选 food IDs、列表搜索词、滚动锚点、可见项目、焦点或合理回退，不能跳至页面顶端；关闭后重新打开可重置为新的草稿。
- 进入预览/编辑克数、软键盘、Sheet 返回、取消或后台恢复，都不应无故改变整个页面的滚动位置或造成输入/保存被底部导航和 Safe Area 遮挡。
- 复用项目的 Shared Sheet 及 viewport 管理，不在全局引入独立 body-scroll hack；遵守 320px / 横屏 / 200% 字体、≥44px 触控、数值输入≥16px、`prefers-reduced-motion` 与 VoiceOver 阅读顺序。
