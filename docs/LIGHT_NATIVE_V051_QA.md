# Light Native v0.5.1 实施与验收证据

2026-10-25；本文件为Application前本地冻结结果。发布当时尚未执行，实际Application/END CI、生产资源、App/active SW、离线与同档案结果由[LATEST](../LATEST_DEV_REPORT.md)及正式十项回执补充，不能把本地PASS当作上线或真机验收。

## 批准基准与实现边界

[原包与双HTML](../design/reference/2026-10-25-light-native-v0.5.1/DESIGN_REFERENCE.md)为唯一来源：原v0.5视觉HTML、v0.5.1文案审核HTML；原ZIP10成员CRC、9/9 SHA通过，两HTML各在Chromium/WebKit实际操作，全部10原成员冻结。包内原型QA33项是供参考的历史演示检查，不计作本轮生产测试。

[实施合同](LIGHT_NATIVE_V051.md)和[真实文案审核](LIGHT_NATIVE_V051_COPY_AUDIT.md)说明范围。全局浅色视觉和真实状态文案调整，不重排五Tab名称/顺序、模块分组、日期/编辑/保存流程，不复制演示数据/侧栏/伪保存。管理中心原四分区+独立习惯/13入口、75px分区/38px字标、同dialog工作区保留；真实66px列表和全部表单字段不以演示表单替代。深色偏好/系统跟随功能保留，无新深色品牌设计。

8个src文件（7现有+1新CSS），以及index/vite主题色；main313顶层语句中309逐字保留，只有4个UI函数和一个CSS import变化。45个原服务仅appearanceConfig一处浅色hex改变，其余服务/DB/seed/导航/训练/Autosave/计时及17冻结fixtures、672旧设计/QA文件未改。没有依赖更新。见[源码与断言证明](../design/qa/2026-10-25-light-native-v0.5.1/README.md)。

## 执行环境与本地测试

实际Node24.16.0、Chromium151.0.7922.34、WebKit26.5；每次浏览器均独立合成context，不接触个人档案、真实Key/Provider。启动时fresh fetch/ff-only检查main=`7110564631b6e40f59485cb1a12543ea59b3a2df`。正式本地候选I2使用等待构建成功的封装，再确认源代码未变、复制不可变dist并逐HTTP资源比SHA；所有下面最终矩阵与44+14均指向同一I2，业务源文件后来未改。

|实际命令/门槛|最终结果|
|---|---|
|npm ci、npm run typecheck|PASS；lock与依赖未变|
|npm test|78文件、1143/1143 PASS|
|GITHUB_REPOSITORY=king-640-060/fitlog-lite npm run build|I2 PASS；本地未提交标记如实保留，发布须另做clean SHA构建|
|原44浏览器命令逐项执行|43项首次PASS、1项首次FAIL；相应完整复测后44项有效PASS；不skip原门槛|
|14适用补充逐项执行|13项首次PASS、1项首次FAIL；饮水原完整64场景复跑PASS，14项有效PASS|
|lightNativeV051.mjs，未设置DIAGNOSTIC/SMOKE|52/52上下文，1380次页面状态检查PASS|
|managementV061.mjs完整矩阵|52/52 PASS；554稳定路由测量top/height偏移均0px，200完整编辑往返|
|lightNativeSheetMotion.mjs|双引擎×普通/reduce共4组、16场景PASS|
|lightNativeHistory.mjs|双引擎×390/100与320/200共4组PASS|
|原74浏览器文件断言AST审计|2493个原assert中2486逐字不变；7个仅批准呈现期望更新；全部业务/权限/事务断言保留|
|源保护、manifest identity、computed dark保持|PASS；颜色以外PWA身份未改；浅深共享样式对照见原JSON|

52组新浅色矩阵为每引擎4宽320/375/390/430×3字体100/140/200×普通/reduce，加短屏和横屏；各5状态（空/一条/多条/长文本/条件受限）×5真实Tab共1300次，8代表上下文另测Calendar/Reports各5状态共80次。每次实际测坐标、控件目标、完整数字/单位、中文孤字、用户长名称和溢出/裁切，展开全部餐次验证完整保存名称，并核对22表/config只读前后完全相同。原前三名称折叠预览被明确识别为摘要，不能误报为全量记录；展开后仍完整。

管理52包含浅深、小屏/字体、搜索/清空/无结果、13真实入口、六编辑器、父节点/草稿/查询/滚动、键盘遍历与Back/X及数据摘要。WebKit为Safari Option+Tab自动化，不是真实VoiceOver。

历史专项真实Restore冻结V13，核对9月28日完整Food快照、历史有/无力量记录文案、历史Task日期草稿和负体重校验保留表单；22表前后完全相同。原44+14补齐实际保存/删除后空、失败/权限、异步Provider mock、键盘模拟、训练恢复/计时、三图独立7/30/90及高度、两类报告、区间级联删除/回滚/冲突、Backup/Restore/Sync与旧版拒绝V14等场景；逐项命令、起止时间、结果及原日志保留，未以汇总自述替代运行。

## 失败、中间候选与复跑

- 最初单测1142/1143：直接改基础motion-sheet token破坏已有词汇门槛，已恢复200ms基础token，普通入场calc+40ms，1143全部复跑通过。原FAIL日志保留。
- 早期A–H复制dist有异步构建未结束的对应风险，不用于最终证据。已改为等待build成功→核对source不变→复制不可变dist→HTTP逐资源SHA。首次I因unused isToday编译失败，保留参数按今日/历史简短文案使用后I2真实build成功。
- 中间B的宏量背景computed透明已通过显式不透明渐变底色修复；共享manager无阴影旧期望按批准极轻静态阴影更新；早期窄屏的日期轨/完整单位/长标签/习惯/菜单/报告布局问题在I2之前修复。原诊断FAIL和截图保留，不用旧副本FAIL冒充现行问题。
- 新坐标探测器曾把不同字号基线的同一行误分，已按垂直区间相交判定；原有三名称折叠摘要被单列并实际展开检查，未删除完整事实检查。
- 原饮水完整首次在Chromium844×390/100/light的快捷按钮精确44px量测FAIL；未改产品或该断言，完整64与额外6横屏复测全部通过、最终最小44px。首次FAIL原图/日志保留，不声称找到了所有偶发量测原因或修复旧真机问题。
- motionPolish旧固定230ms在批准240ms入场未结束时触发Playwright自动滚动；START同流程通过，I2直接事件保留50px；等待实际入场完成后原50px断言通过，随后完整24场景通过。只调整稳定帧等待，业务源/全部assert不变；另有真实逐帧动效检查，没有靠等待取消动效验收。
- remainingPrototype首次按旧V4.2暖白背景断言拒绝新纯白；只将4条浅色背景/边界/calorie-dot期望适配本轮批准冷白/蓝灰/蓝色，旧暗色和全部原结构/业务断言保留，原型SHA不改；完整33场景复跑通过。
- 其余本地最终失败及复跑如存在，见local-summary中逐项原始结果/confirmedRetries；只有已实际复跑成功的项目计有效PASS。

其中3个旧呈现断言分别是新浅色theme-color、共享manager极轻静态shadow、放大饮水统计与仍靠右动作的二维不重叠。另外四条是旧V4.2剩余目标背景、边界、calorie-dot的浅色期望，由本轮批准冷白/蓝灰/蓝色替代，暗色与所有原结构/业务断言保留。motionPolish额外只改等待；原74文件2493个assert数量完全相同。没有改单测断言、冻结fixture或数据保护门槛。

## 视觉对照、必要差异与数据

实际查看五Tab390浅色新旧全页、旧深色、Hub/真实列表、普通水Sheet、训练Cardio、320/200长记录/报告、管理编辑器和局部失败图；外部证据包含原图与computed style。颜色/边界/静态投影/标题方向按v0.5，真实已有记录时去冗余介绍按v0.5.1。蓝主按钮572实际样本最低4.9559:1；参考#397cf0白字约3.95不足AA，正式改同向#286bdd；次级#2868c9在#eef4ff为4.86:1。

保留原生Sheet26px顶圆角，原型24px；实际Cardio含真实日期、渐进日志和原真实保存流程，演示假字段/模拟按钮不复制。Today仍按真实Plan→Nutrition等既有分组，而不照演示重排；水/睡眠仍按原真实模块。故不是整屏逐像素相同声明。旧深色共享token和抽样computed styles完全相同；部分全主题长文排版修复随字体生效，不是新深色设计。

fitlog-lite-db、Dexie13/IDB130/22表、Backup14/Restore1–14、Sync/envelope1不变；无迁移、重算、清库、自动写入或个人健康数据操作。Baseline同一个已有专用合成Chrome profile在线/离线、App/SW为START通过：22表摘要049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a，8配置609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34。Application/END必须再用原profile实际验证，不reset/reseed/Restore；它不是个人历史连续性证明。

## Pending与停止条件

实体iPhone Safari、原安装PWA、真实IME/键盘/Safe Area、VoiceOver及个人数据连续性Pending；真实Provider未执行；旧WebKit Undo−128px未声称解决；先前F1–F5用户36/36不重开。Application发布后独立线上验证，再LATEST-only END/第二次CI和正式资源/SW/离线/同档案复验；完成后停止，等待ChatGPT独立核查。
