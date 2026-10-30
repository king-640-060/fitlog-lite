# 日历手势 v1 · QA

发布前自动化结论：PASS（2026-10-30）。本文冻结Application提交前的实际结果；Application／END、Pages和新App/SW身份另见LATEST_DEV_REPORT及正式回执，不能从本文件推断发布已经完成。

[批准矩阵C01–C31](../design/reference/2026-10-30-calendar-gesture-v1/02_逐项验收矩阵.md)要求真实DOM，而不是原型代替业务测试。

- 当前START双引擎月份标题拖动负例：正文横移100px；原始逐帧保留。首次仅加容器边界时，原生CDP验证仍因既有负边距产生内部2px横滚；加局部pan-y pinch-zoom后原始相同手势测量内部位移0。早期未完候选CI已取消，最终源码重新全量执行，不沿用其通过结果。
- 新calendarGestureV1覆盖9类实际DOM起点、水平双向/斜向双向/垂直双向/取消及blur、中间帧、顶部跟手与回弹、点击键盘、20轮滚动恢复及零写。
- Chromium使用实际CDP touch；WebKit合成touch验证JS仲裁，原生纵向滚动能力另测scrollTop，不能宣称合成事件驱动了iOS原生滚动。
- calendarGestureLoadingV1延迟实际IDB完成，验证内容创建即有边界、取消读后无过期邻页、再次进入正常。
- 矩阵：320/375/390/430 ×100/140/200% ×Classic浅深/Native ×normal/reduced，双引擎，另短横屏。
- 保留所有首败与复验；不删原门槛/断言，不沿用上一轮通过数量。

实体iPhone Safari、原安装PWA、VoiceOver、真实系统键盘/Safe Area、个人数据连续性、真实Provider均Pending。旧WebKit饮水Undo−128px未修。

## 实际命中与失败归因

初始宽矩阵后复核起点outerHTML，发现“月头右空白”可能实际命中今天按钮，“底部空白”可能落在图例，不能把这些当作空白覆盖。专项新增实际DOM命中守卫：左右空白必须命中月头section自身，底部必须命中既有滚动容器自身；日期空白允许真实grid间隙。由实际背景像素定位，短横屏仅在需要时使用原有外层滚动使底部padding可见，不改产品布局。

基础148场景与额外148场景空白审计分别对账；后者每场景三真实空白起点×七动作，不独立冒充完整矩阵。曾被坐标守卫拦截的执行保留FAIL，不能记为已执行手势通过。默认详细场景另含650ms按住、1000ms慢拖、650ms停住再释放，双向检查无回弹/切页/误点击。所有变更均为新增QA实现，既有测试断言和≤1px阈值未删减。

## 冻结的实际结果

- TypeScript、80文件1199单测、Pages生产构建PASS。没有修改既有测试断言、依赖、数据服务或冻结fixtures。
- [最终完整矩阵CI成功](https://github.com/king-640-060/fitlog-lite/actions/runs/41034281432)：8个分片、双引擎148场景，实际命中9类起点×7种动作，真实CDP／明确标记的WebKit合成touch，完整20/50/80%顶部跟手帧、提交/回弹/取消、14px与单一原生纵向owner、零写和22表/配置不变。
- 本地基础148场景与额外148场景严格真实空白审计通过：分别46620／15540个正文中间帧，页面及内部X最大位移0。前者不冒充后者的真实空白覆盖；真实空白起点必须命中背景本身。
- final-strict-detail双引擎通过：双向650ms按住+1000ms慢拖+650ms停住，键盘Arrow/Home/End，20轮各页独立滚动与listener/ghost检查，真实有/无记录日期及完整Food快照，月份/今天/详情关闭、闰日/跨年/自然4/5/6周月份。生产保持原42日期，不复制原型可变行数或演示概览。
- [保留的初跑CI](https://github.com/king-640-060/fitlog-lite/actions/runs/41023328075)包含91项既有及新增详细/加载调用全部通过、旧专项矩阵3个FAIL；[完整430分片复验](https://github.com/king-640-060/fitlog-lite/actions/runs/41025651841)成功。最终由同一181产品源的完整矩阵CI替换相关旧矩阵结果，99份有效suite-call全部PASS；原109条实际调用含重复复验及3条FAIL，不能写作109次全绿或99个独立功能。
- 旧矩阵FAIL：430短横屏与390起点坐标校验、320减弱动效向下滚动断言。前者通过实际DOM背景命中和可见边界修正；后者旧脚本没有记录方向变化阶段坐标，不能声称原FAIL已彻底归因。最终改为每次真实CDP move后等待35ms和实际RAF、先保存上下滚动帧再断言，保持原上滑>0/下滑减小条件；未修改产品滚动逻辑。最终8分片完整实测通过，旧FAIL保留。
- 冷日历读取取消/再次进入双引擎PASS；原progressLayoutV2/loading、报告/趋势/三层导航、生命周期、危险事务、Backup/Restore/Sync等原门槛本轮实际重跑并对账。原始结果、脚本SHA和来源见[冻结证据](../design/qa/2026-10-30-calendar-gesture-v1/README.md)。
- 既有专用合成生产profile的START基线PASS：22表hash049bc97a200c585af636db0378c6c72b1c81696208f15b5d30276755c6ba7c1a、8配置hash609f5c195402cad718a2d928eebde4a57b843dedb318f02c88a277d3af9e0b34；App=SW=11c058ac6014842a9098443b7b8f304ad6d2d467且离线PASS。新发布后的同profile比较必须另做，不沿用基线身份。

C01–C27、C29对应自动化场景PASS；C06正式页面只有图例，没有演示“当月概览”，概览子项不适用。C28格式/数据门槛及旧离线基线通过，新App/SW与C30提交发布后独立验证。C31实体iPhone Safari、原安装PWA、VoiceOver等Pending；不把WebKit自动化当作实体设备。
