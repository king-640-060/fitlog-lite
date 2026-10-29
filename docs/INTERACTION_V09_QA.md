# 交互 v0.9 开发验证记录（进行中）

本轮未完成发布，不能将本文作为结案回执。START `8dac27a4399f6ab0a279308ad5f298bf25ca1482`。2026-10-28 fresh fetch 仍与远程 main 一致，工作区中的本轮实现未提交 main。

输入ZIP SHA256 `da0ed4e621df46d9542a7e3c9626255d93e74845a5fa2fe3d582d9e918889a3c`；14成员CRC通过，13/13 SHA256逐项匹配。唯一批准HTML SHA256 `d41171fc85af521cd6d6c1b3a7a249eb20aee369941296a117ee474d261f480d`。原型实际双引擎四宽8上下文运行，截图与记录在本轮外部work/evidence；原型不是生产验收证据。

当前候选C的181个产品源文件SHA已冻结到 `work/interaction-v09-2026-10-26/candidate-c-source.json`（工作目录相对本聊天根目录）。非发布QA分支提交 `45bb0b0588c37998494fcc06eb8bc01dcb287c59`，运行 [完整回归](https://github.com/king-640-060/fitlog-lite/actions/runs/40623483525)。其CI状态须以实际完成结果为准，不能预写成功；该分支没有Pages发布权限。

已执行：npm ci、候选C typecheck、80文件1199单测、生产build通过。原79文件1190单测不改，新增9项覆盖快照名/顺序保真、原始备注/未知字段、旧草稿/删除来源、写入故障、实际组校验、模板源冲突以及Backup14/Restore/加密Sync1往返。未改 schema、依赖或冻结fixture。

阶段回归：双引擎核心交互通过；双引擎三级手势、父级坐标≤1px、晚到只读结果拒绝、20轮独立滚动恢复通过；双引擎20轮跨模块资源回归通过。候选B完整Chromium显示矩阵实际72PASS/横屏1FAIL，不能称完整通过；候选C修复后横屏2/2通过。适配旧驱动后的foodWaterDayV04完整Chromium20/20通过。上述早期结果不能替代最终候选C完整回归。

保留的首败与处理：

- 原拖拽在原生Sheet包含块内偏24px：改为真实原点测量，逐帧跟手误差验证。
- Escape先返回上级：起拖焦点留在把手并由本地取消处理。
- 驱动拖动距离不足跨越高动作卡、指针落在把手外：保留失败，修正实际输入位置和边缘滚动，未降低跟手误差/顺序断言。
- 异步取消残留隐藏页：挂载阶段立即监听abort并清理；异常路径同样释放。
- 放大字体footer两状态高度不同：共享随字体缩放的按钮高度，实际比较两个状态高度。
- 旧样式优先级导致克数单位跑到下一行：局部表单选择器复用静态单位布局；旧unitLeft/position断言保留。
- 旧驱动遇到预备叶页重复导航：在异步图表挂载前剥离叶页旧导航，不靠选择第一个隐藏匹配绕过。
- 横屏测量过早和外层4px滚动：等待JS导航真实结束；按app-frame实际paddingBottom测量剩余高度。

Chrome Performance阶段trace：RunTask最大17.728ms、Layout最大4.869ms、FireAnimationFrame最大3.392ms，本次阶段样本无>50ms任务；原始trace及汇总保留。最终候选仍需对应回归与审查。

尚待完成：最终全部适用浏览器门槛、逐项39行证据和视觉比对、既有专用合成profile升级/离线、精确正式资源及App/SW身份、Application正常推送与CI/Pages、LATEST-only END及最终CI/线上复验、十项正式回执。

实体iPhone Safari、原安装PWA、真实IME/键盘/Safe Area、VoiceOver、个人数据连续性和真实Provider仍Pending。WebKit旧饮水Undo−128px未在本轮解决，不以当前样本冒充已解决。
