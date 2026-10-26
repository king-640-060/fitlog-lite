# 五项联合 v1：逐页面/状态文案审计

这是一份决策清单；AST 全量索引是静态覆盖记录，不把自动分类冒充人工视觉验收。63个UI源文件、1325个中文字符串/模板节点另存本轮QA。只对下列明确冗余分支动刀，其余字段/未知/错误/危险/来源默认保留。原v0.5.1清单作为历史证据不改写。

旧文案定位来自 frozen START；修改后行号以本轮源文件为准。before/after 截图以相同引擎、390×844、100%和相同合成状态拍摄，Classic浅以7110564为基准，旧暗/Native以68f4747为基准。下表截图键对应 QA 对照索引；实体设备不在此自动化证据内。

|源文件（START行→本轮行）|页面/状态|旧文案或原事实|处理|理由与实际空间|风险边界|截图键|
|---|---|---|---|---|---|---|
|src/main.ts:584 → [589](../src/main.ts#L589)|今日/无计划|有需要时随手记下来|删|已有“今天没有安排”和添加任务；删除实际 span 与高度|保留唯一添加入口与真实空态|today/before-after|
|src/main.ts:863 → [874](../src/main.ts#L874)|计划/Today空态|有需要时随手记下来。|删|主空态与按钮已说明操作；Inbox用途句仍留|不隐藏已完成任务或重复添加|plan/before-after|
|src/main.ts:295 → [306](../src/main.ts#L306)|今日与训练/200%日期|完整日期和星期文本|分组|日期/星期各自不拆字，完整片段自然换行|不改变本地业务日期或 aria 日期|today/before-after|
|src/main.ts:1707 → [1718](../src/main.ts#L1718)|训练/无记录与已有记录|记录动作与组数|删|真实动作/组数和开始/继续入口已存在|保留正在记录与已有事实|workout/before-after|
|src/main.ts:1737 → [1746](../src/main.ts#L1746)|训练/有氧空态|楼梯机 · 跑步机|删|操作表单仍提供真实类型，卡片不例举设备|不改变设备类型或速度坡度|workout/before-after|
|src/main.ts:634 → [1746](../src/main.ts#L1746)|训练/有氧空态|今天/当天还没有有氧训练|条件化|当日记录0次与累计0分钟已表达空态，只生成有数据的详情|实际最近记录和历史入口仍在|workout/before-after|
|src/main.ts:634 → [645](../src/main.ts#L645)|今日/无力量事实|今天还没有力量训练|合并|改为未记录；有事实保留名称、次数、动作与组数|不能推断训练已完成|today/before-after|
|src/main.ts:634 → [645](../src/main.ts#L645)|今日/无有氧事实|今天还没有有氧训练|合并|改为未记录；有事实仍显示完整类型/指标|不把没有记录推断为零活动|today/before-after|
|src/ui/weightChart.ts:17 → [17](../src/ui/weightChart.ts#L17)|体重/趋势与查看全部历史|线段仅连接测量点，缺测不补零|移至辅助文本|sr-only并从可见主模块移除；全部历史也处理|保留真实缺测分段与全部日期|progress/before-after|
|src/ui/recoveryLineChart.ts:26 → [26](../src/ui/recoveryLineChart.ts#L26)|睡眠/饮水趋势|每天保留日期，未记录留空|移至辅助文本|共享模块只保留一个辅助技术操作说明|不制造零值或删自然日期|progress/before-after|
|src/ui/trendModule.ts:17 → [18](../src/ui/trendModule.ts#L18)|三图/空范围|未记录 + 此范围暂无X记录|合并|可见未记录/单位及简短日期占位；完整空句留辅助技术|仍标 data-empty，不能显示0kg|progress/before-after|
|src/ui/trendModule.ts:9 → [12](../src/ui/trendModule.ts#L12)|三图/零记录天数|0天有记录 · 单位|条件化|零天数量不重复显示；已有记录天数保留|选中值单位和实际日期范围始终保留|progress/before-after|
|src/ui/managementHub.ts:50 → [50](../src/ui/managementHub.ts#L50)|管理根页|按用途查找|删|四分区名称与入口已明确；收回该段空间|四分区/13真实入口和搜索不变|management/before-after|
|src/main.ts:1709 → [1720](../src/main.ts#L1720)|训练/凯格尔概览|当前方案、当日完成、实际记录|保留|基线已无重复宣传式简介，不制造修复|执行安全/不适停止、真实计时完整|workout/before-after|
|src/main.ts:584 → [595](../src/main.ts#L595)|今日/已有任务|已完成、总数、待办|保留|三种数字是不同实际状态；并非教学|不把计划当健康完成事实|today/before-after|
|src/main.ts:1180 → [1191](../src/main.ts#L1191)|饮食/空餐次与已有餐次|0项记录 + 今日/当日未记录；真实食物摘要|合并/条件化|空餐次删除重复零条数小字；保留未记录与kcal单位及真实记录入口，已有餐次保留真实数量/全部摘要|未分类历史不得猜餐次|food/before-after|
|src/ui/macroNutritionSummary.ts:21 → [21](../src/ui/macroNutritionSummary.ts#L21)|今日/饮食/未知宏量与体重|数据不完整、单位、同日g/kg|保留|未知与零不同；计算依据不能当冗余说明删除|不改热量/宏量/体重快照|food/before-after|
|src/ui/calorieBudget.ts:7 → [7](../src/ui/calorieBudget.ts#L7)|今日/饮食/无目标与超额|实际、目标、超额、尚未设置|保留|不同状态具有业务意义，非重复介绍|不把计划/估计并入实际摄入|today/before-after|
|src/main.ts:2161 → [2174](../src/main.ts#L2174)|动作库/新建编辑删除|字段、可选备注、历史会保留|保留|动作名/备注是事实来源，删除边界需可见|历史动作快照与当前库分离|management/before-after|
|src/main.ts:1569 → [1580](../src/main.ts#L1580)|食物库/新建编辑|基准、单位、缺失宏量、来源与删除提示|保留|规范输入与历史语义所需|不推断缺失营养或改独立kcal|management/before-after|
|src/main.ts:2267 → [2283](../src/main.ts#L2283)|训练模板/编辑与保存|动作/组数、名称、来源、历史分离|保留/扩展|独立标题及明确同步勾选由B合同增加|后改模板不影响过去训练|management/before-after|
|src/main.ts:2453 → [2506](../src/main.ts#L2506)|饮食模板/已有与编辑|餐次、克数、快照、目标冲突|保留|是计划/实际与历史风险，不属于教学|不静默记账或覆盖目标|management/before-after|
|src/ui/nutritionStrategies.ts:58 → [58](../src/ui/nutritionStrategies.ts#L58)|营养模板/阶段日方案与编辑|启用、来源、所属日期、历史保护|保留|日期唯一有效模板及来源必须能追溯|不结束阶段或删当天目标|management/before-after|
|src/ui/nutritionCycles.ts:16 → [16](../src/ui/nutritionCycles.ts#L16)|营养周期/排程与冲突|日期范围、日方案、计划非实际|保留|周期事实语义与写入确认不可压掉|不修改原周期合同|management/before-after|
|src/ui/nutritionStrategyCascade.ts:14 → [14](../src/ui/nutritionStrategyCascade.ts#L14)|模板/永久删除两次确认|实际范围、所有引用、不可撤销|保留|危险操作预览与冲突必须完整|六类加日期并集范围不得扩大|management/before-after|
|src/main.ts:542 → [553](../src/main.ts#L553)|习惯/编辑与停用删除|自由打卡、计划、停用保留历史、永久删除|保留|定义/事实/破坏边界不同|不改变静态Save、历史数量或事务|management/before-after|
|src/main.ts:1623 → [1634](../src/main.ts#L1634)|导入/文件与错误|CSV/JSON格式、校验与失败|保留|错误和单位是必要输入提示|不跳过校验写业务数据|management/before-after|
|src/main.ts:2564 → [2617](../src/main.ts#L2617)|Backup/Restore/预览确认|将覆盖本机、范围与完整校验|保留|恢复危险提示不得弱化|必须验证完整后原子替换|management/before-after|
|src/ui/githubSync.ts:14 → [14](../src/ui/githubSync.ts#L14)|Sync/空配置冲突错误|手动、加密、密码、差异与覆盖确认|保留|数据流向和冲突安全不可省略|不自动上传或读真实个人远端|management/before-after|
|src/ui/aiSettings.ts:58 → [58](../src/ui/aiSettings.ts#L58)|AI设置/能力未知与权限|Key隐私、授权、能力和Provider配置|保留|不是常驻营销；是安全边界|不把mock当真实Provider验收|management/before-after|
|src/ui/aiAssistant.ts:26 → [26](../src/ui/aiAssistant.ts#L26)|AI会话/提案未确认与错误|实际数据、提案确认、失败与隐私|保留|模型不能自动写事实或确认破坏操作|凭据/对话不进入业务备份|management/before-after|
|src/ui/voiceSettings.ts:8 → [8](../src/ui/voiceSettings.ts#L8)|语音/输入与授权|录音授权、转录/合成、系统兼容|保留|真实权限/隐私与系统能力不可省略|真机录音和真实Provider未执行|management/before-after|
|src/ui/pwaDiagnostics.ts:16 → [16](../src/ui/pwaDiagnostics.ts#L16)|版本诊断/待更新与失败|App/SW、等待更新、草稿与升级确认|保留|App与SW实际身份需独立显示|不重装/清空数据库升级|management/before-after|
|src/ui/coachReport.ts:54 → [54](../src/ui/coachReport.ts#L54)|综合报告/日周月与样本不足|条件、缺失、真实总量和非医学限制|保留|专业解释约束是防止误读的必要内容|不增第三报告或医学推断|progress/before-after|
|src/ui/nutritionCycleReport.ts:1 → [1](../src/ui/nutritionCycleReport.ts#L1)|营养周期报告/无周期与有周期|日期、实际/计划、来源与限制|保留|计划不能变实际摄入，缺失不补零|不重算NutritionTarget/FoodLog|progress/before-after|
|src/ui/dayDetail.ts:57 → [58](../src/ui/dayDetail.ts#L58)|日历/无记录、一条、多条与完整展开|十领域状态、完整sets/日志/起止时刻|保留/扩展|新增独立标题与实际时间，但不删记录|原RPE/所有保存事实仍在|progress/before-after|
|src/ui/recovery.ts:114 → [114](../src/ui/recovery.ts#L114)|睡眠/补录修正、跨时区旧记录|凌晨归属、当前时区、未知原时区|保留|归属与真实起止时间不等价，必须解释|不重新推断捕获夜晚或时长|progress/before-after|
|src/ui/recovery.ts:106 → [106](../src/ui/recovery.ts#L106)|饮水/快捷自定义历史撤销|真实ml、参考值、独立记录/按ID撤销|保留|参考不是医学目标；实际与偏好分开|500/1000ml、撤销/历史不回归|today/before-after|
|src/ui/trainingCompletion.ts:10 → [10](../src/ui/trainingCompletion.ts#L10)|训练/保存中失败成功重试|尚未成功、实际结果、明确返回|保留|失败不能冒充完成；禁止双写|草稿/结果保留，状态机不替换|workout/before-after|
|src/ui/managerPrimitives.ts:5 → [5](../src/ui/managerPrimitives.ts#L5)|六实体管理器/空筛选/长标题|实体名、数量、状态、编辑器全字段|保留|共享真实管理骨架与空态是可操作信息|不隐藏新建/搜索/删除保护|management/before-after|

13项真实入口逐一保留：食物库、饮食模板、营养模板、动作库、训练模板、习惯、导入、备份与恢复、GitHub同步、外观、AI设置、版本诊断、关于。管理浏览器矩阵实际访问全部入口及六实体真实编辑器，并检查同工作区、Back、X、长字与字体；相关错误/覆盖/权限/数据保护另由原浏览器门槛和单元/事务测试验证。不能将某一张截图说成包含所有隐藏状态。

删文案后没有保留可见的空p占位。趋势原有90天readout intrinsic sizer承担跨7/30/90高度恒定，不是被删说明的占位，不能为减高度删除。日期单位、范围、已记录天数与真实图表/控制入口保持。

本轮具体运行数、首次FAIL、复测、实际高度/颜色、完整截图索引和 Pending 见 [QA](FIVE_COMBINED_V1_QA.md)。
