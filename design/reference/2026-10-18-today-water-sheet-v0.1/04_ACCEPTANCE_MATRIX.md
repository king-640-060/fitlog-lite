# Today Water Bottom Sheet v0.1｜正式验收矩阵

每项标 PASS/FAIL/Pending，并在 Codex 回执引用实际运行命令/截图/证据文件；**本表预先定义门槛，未宣称代码已通过。** 下表不会替代 GitHub CI/Pages/实体设备验收。

| ID | 必须核对的事实 | 明确判据 |
|---|---|---|
| BASE-01 | 远程 Git 基线 | 读取规范并 fresh fetch，记下真实 main/working tree，保留先前正式变更 |
| BASE-02 | 批准原型字节 | v0.1 HTML SHA256 = `b611db36022fa5232c4d17d13f7039547bc31d0967ed6ce50e05790ae2616c39`；实际打开并操作，不采用 v0.2 或旧卡内展开 |
| UI-01 | Today 入口 | 「记录饮水」右侧无箭头；颜色/字重/圆角/高度与四字 peer 相同；没有卡内快捷展开区 |
| UI-02 | 宽度一致 | 390px 100%/浅深色，4个四字次级按钮 computed width 相差≤1px；不得缩字/压缩边距/加空图标 |
| UI-03 | 其他尺寸 | 320/375/390/430 浅深两主题；200% 字体/短视口/横屏无重叠、裁切或页面意外横溢 |
| SHEET-01 | 单击打开 | 只出现一个真正的底部 Sheet；背景有遮罩、关闭明确、没有首页卡内高度跳动 |
| SHEET-02 | 快捷平权 | +500ml/+1000ml 等权、可点击、不会被底栏覆盖，窄屏可自然自适应 |
| SHEET-03 | Custom | 自定义输入能提交、可取消；键盘弹起后数值/保存/关闭都能到达，输入文字≥16px |
| SHEET-04 | 辅助入口 | 修改参考值与历史可通过正式 UI 访问，不破坏已有历史详情/编辑/删除 |
| SHEET-05 | 关闭语义 | X、遮罩、ESC/系统返回（现有实现支持的方式）不写任何日志；焦点返回原入口 |
| SHEET-06 | 重入语义 | 关闭再打开默认快捷记录视图，不保留未提交输入或多余子Sheet，不发生两层叠加 |
| WATER-01 | +500 正常保存 | 只生成**一条**当日本地日期的 WaterLog；关 Sheet、Today 合计+500、Toast 有精确撤销 |
| WATER-02 | +1000 正常保存 | 与+500一致，单条保存+1000；保存日期/历史可追踪 |
| WATER-03 | 自定义成功 | 根据现有 validateWaterLog 正确写入一条事实；父 Sheet 完整关闭，今日合计更新 |
| WATER-04 | 校验/错误 | 非法值、不完整输入、服务失败均无写入、显示错误、保留可重试状态 |
| WATER-05 | Busy | 快速双击/重复回调下只有一次成功，无虚构+1000/+500，不吞掉已提交历史 |
| WATER-06 | Undo | 精确撤销最新新增 ID；其他 WaterLog 和其余22表对象均不变；无重复Toast或幽灵历史 |
| WATER-07 | 历史与参考 | 既有 WaterLog 历史完整，可编辑/删除；设置参考只影响设备参考，不写饮水日志 |
| PROG-01 | Progress 原入口 | Progress → 饮水仍可开现有 Sheet、快捷/自定义/历史行为正常，保持趋势三图独立 |
| SCROLL-01 | 屏幕与 Safe Area | Sheet高度随 VisualViewport/键盘、安全区可用；内部滚动，底部按钮不被挡；背景不穿透滚动 |
| SCROLL-02 | 旧 WebKit 基线 | 实际比较改前后 Undo 位移；老 −128px 是已知遗留，不能虚称完全解决；禁止新增异常强制跳页 |
| A11Y-01 | 可访问性 | Sheet 有 dialog 名称、键盘焦点边界/恢复、可访问关闭、aria状态正确、触控目标≥44px；VoiceOver 真机 Pending |
| DATA-01 | 历史数据兼容 | IDB v130/Dexie13/22表/Backup14/Restore1–14/Sync1 不改；旧合成档案可重开，跨标签读取稳定 |
| REG-01 | 工程与回归 | typecheck、全套真实单测、生产构建、相关旧浏览器和新增 Sheet 浏览器回归逐条 PASS |
| REL-01 | Git 和 Application | 只提交批准范围、非强推、工作树干净、Application CI/Pages 成功，有 SHA/链接 |
| REL-02 | END 和线上资源 | LATEST-only END、END CI/Pages 成功，App/SW/build-info、静态资产、离线重开有证据 |
| PENDING-01 | 实体体验 | 原安装 iPhone PWA、实际 Safari/VoiceOver/键盘/Safe Area、个人数据连续性单独 Pending，不能冒充自动化通过 |

**重要：** 目前上轮的 1081 单测、5 条浏览器回归、双引擎 32 情景与 WebKit −128px 只是实施前基线。Codex 必须实际执行新版本的相关检查，不得照抄历史计数作为新结果。
