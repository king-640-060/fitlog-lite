# 已批准 UX-01～03 v0.4 · 饮水与营养模板级联删除

## 范围与批准基准

这是F1–F5正式结案后的独立需求。依据[2026-10-17批准包](../design/reference/2026-10-17-ux01-03-v0.4/README.md)、[设计锁](../design/reference/2026-10-17-ux01-03-v0.4/DESIGN_LOCK.md)和[六类删除合同](../design/reference/2026-10-17-ux01-03-v0.4/CASCADE_DELETE_CONTRACT.md)。唯一HTML SHA256 `96804e985c5287fa9d0ea857924335a30813a49758b74f1abf73af550dbf8ceb`；输入ZIP SHA256 `8e53105055ddee13ccaa810d030d1fd1c8c0d508f344381a12a19ffd03ecc055`。原始HTML/预览/元数据/九项SHA清单不修改；演示日期、计数及内存数据不进入产品。

## 饮水交互

Today饮水与其他卡片保持相同横向内容宽度和现有标题/历史结构。默认收起，仅累计、可选参考值和“记录饮水”按钮；aria-expanded与真实面板hidden同步。展开后出现等权500/1000和低强调自定义/修改参考值；记录后保持展开，普通liveQuery及参考更新保留当前展开状态，重新进入Today默认收起。不保存展开状态到业务数据或设备配置。

Progress记录饮水使用现有content原生Sheet，仅内容自适应；快捷按钮标准最小44px，平等中性背景，15px rem文本可放大；自定义入口次级。仍调用同一addWater service，独立ID/本地业务日/忙碌防重/成功后才通知/失败不累加、精确Undo/历史编辑删除不变。参考不是摄入。保留共享VisualViewport、16px输入、>=44px触控目标、SafeArea和本机外观；无新滚动或键盘控制器。

## 六类永久删除与原API边界

新增独立nutritionStrategyCascadeService；原deleteUnusedNutritionStrategy的无引用限制、来源指纹和事务保护原样保留，已有调用方不会意外获得删除历史的权限。新明确级联路径只锁六表：nutritionStrategyTemplates、nutritionStrategyVariants、nutritionStrategyPhases、nutritionTargets、nutritionCycles、nutritionCycleDays。

- 选中单一定义；owned variants；所有templateId归属的当前/历史阶段；所有归属周期（含已归档/历史/未来）及owned周期的全部日期行。
- 每日目标仅按strategySelection或cycleSelection的模板、owned variant/phase/cycle ID关联删除。禁止从相同日期、热量、名字或阶段范围推断；sourceTemplateId是独立饮食模板来源，不能与营养来源混用。正常已移除variant的名称/数值快照仍可解释；不会因此重算旧目标。
- NutritionTarget.date现有唯一索引不变，同一DB不造两个同日目标。若用户把旧相关目标重存为手动目标，原服务会清除其来源；新预览按当前来源保留该行。预览后手动覆盖则拒绝旧确认，重新预览后保留；不按过去曾用过的日期误删手动目标。
- owned周期日包括其中独立饮食模板的排程选择，但不删除DietTemplate定义或任何已确认FoodLog。UI明确失去的只有六类关联对象、保存目标及被删周期报告。

先在同一个r事务读取六表完整集合，计算每类真实数量、总数、来源/日期/ID明细与稳定指纹。指纹按行ID和对象键确定性排列，覆盖完整六表；任何并发营养表变化（包括无关对象）都保守要求重新预览，而不是覆盖其他窗口。

用户风险勾选后，仍需第二次危险确认；取消/X/未勾选不写入。确认后在一个六表rw事务内重新读取、复核指纹和归属，按精确ID集合删除；校验六表剩余内容等于原快照减去批准集合，且周期不变量仍成立。错误或后置校验失败整体回滚。其他16表不在写事务权限内；测试按22表逐一验证保留事实及无关六表行的hash，配置另行验证。刷新预览会立即停用旧确认并重置勾选，不能把旧勾选沿用到新范围。

## 不规范数据的明确冲突边界

validateCycleCollection要求nutrition.templateId与所属cycle.templateId相同，日期必须属于已有周期、范围合法、同周期日期唯一、日行非空、活跃周期不重叠。因此外模板周期中的“指向所删模板的营养分配”不是可合法自动剥离的普通对象。该路径暂停删除，显示实际日期/ID/周期与不一致原因，整次零副作用；不删除其他模板周期，不清空排程，也不自动修复历史。

同一目标混合饮食/营养来源、strategySelection/cycleSelection混合、variant/phase/cycle归属互相矛盾，或相关排程为孤儿、空行、跨界等，均明确拒绝整次删除并提示核对来源。缺少历史variant定义可以沿用合法快照；有真实外模板所有者则拒绝。合法数据在现有六表结构内可完成级联，无需删除其他健康记录或改schema。未检查或修复用户真实设备上的任何异常数据。

## 状态、报告与兼容

删除后重新读取管理列表、当前阶段和主页面；只读周期报告现有liveQuery不再提供已删周期，普通报告继续读取独立真实健康事实。原保存目标删除后不重建、不虚构。保留归档、复制与明确结束当前阶段；结束仅把该phase标记本地今天结束，保留该日与此前目标/历史。无新增营养模板分析报告或统计模块。

Dexie13/IDB130/22表、Backup14/Restore1–14、Sync/envelope1不变，无schema/index/字段迁移或启动清理。新增合成Backup14样本测试级联前后往返与加密同步；所有早前冻结fixtures原字节保留。实现功能并不授权删除用户实际模板；QA仅隔离合成DB，原有合成profile只做只读哈希/更新/离线保留验证，绝不重新播种或清库。

## 验证与物理设备

发布保留原969项及全部旧浏览器gates（包含F1–F5双引擎UI/Backup），增加六表并发/回滚/保留事实单测和双引擎实际UI、Backup/旧当前客户端恢复验证。原型与产品同视口/字体/主题截图，320/375/390/430、100/140/200%、844横屏及共享键盘模拟。实际CI/Pages/资源/SW/同一合成profile/offline记录于本轮QA和交付回执。

本轮新UX的实体iPhone Safari、原安装PWA、真实键盘/SafeArea、VoiceOver、个人数据连续性以及ChatGPT/用户验收须单独记录；没有实际证据为Pending。原F1–F5六组用户真机验收仍正式结案，不挪作新UX真机证明。
