# 五项联合改造 v1：实现与兼容合同

用户批准输入、原始合同、原型与全部六项 SHA256 保存在 [设计基准](../design/reference/2026-10-25-five-combined-v1/DESIGN_REFERENCE.md)。开始基线是 `68f4747994fd84bd2ef965c93ee3b009a3b52b72`；本轮不实现第三主题、插画、五页重排或新的营养分析。

## A：文案与真实空间

[逐状态文案审计](FIVE_COMBINED_V1_COPY_AUDIT.md) 与本轮 AST 清单区分删除、合并、条件化和保留。今日/计划空态删去重复的随手记教学；训练移除力量教学、有氧设备例举与有氧重复空态；管理根页移除“按用途查找”。趋势技术说明仅保留辅助技术文本，含“查看全部体重趋势”；不改缺测、选择、数值、日期轴、7/30/90 或固定绘图区。空范围保留“未记录”、单位及范围，重复空句转为辅助文本，零记录天数不再重复显示。

日期和星期按完整语义片段换行；不裁切星期末字，不缩小字体。风险、失败、未知、估算/实际、来源、AI 隐私、恢复覆盖、不可撤销删除和凯格尔安全说明保留。没有批量隐藏 `.muted` 或通用 note。

## B/C：独立名称与自由训练

- 沿用真实空白训练入口，名称为“自由训练”。一个动作和至少一个有效组可完成；不要求模板。空组在完成确认前报错，不能进入无法完成的保存页。
- `Workout.name?: string` 是独立用户标题快照。保存时修剪首尾空白，空值删除字段；手工输入上限2000；旧模板名称快照保留完整字符串，不因新增手工限制拒绝旧模板、自动保存或备份恢复，不把标题塞进日志。旧记录缺字段仍有效；显示 fallback 为单动作真实名称或“自由训练”，不持久化 fallback。
- 训练编辑器、首页、历史、日期详情/日报告、完成页及重开使用同一显示规则。单动作历史保留紧凑摘要，点击仍可查全部动作、组、重量、原日志与实际起止时间。时刻按当前设备时区呈现，保存的业务日期和 UTC instants 不重算；原 legacy RPE 继续在完整日期事实中保留。
- 名称专用事务绕过组数/日志归一化，重读完整 source fingerprint，只改变 name 与 updatedAt。并发修改/已删除 source 拒绝，不重建已删记录。名称失败保留输入，不谎称成功。
- 现有 Autosave 控制器保留串行排空；退出/返回/隐藏与完成只排空真实待保存编辑，单独命名或查看历史不会强制归一化历史组与日志；编辑对象以 WeakMap 保存已知持久快照。自动保存、完成、命名/另存模板在事务中检查旧快照，防止旧草稿覆盖新的名称或事实。未完成训练、真实日志、set IDs/重量/次数/RPE/备注仍由原服务管理。
- “同时命名本次未命名训练”默认不勾选，仅未自定义名称时出现。一次确认使用唯一 operation ID；模板新增和可选命名在同一两表事务，源变化、重复 ID 或任一写入失败均不部分成功。已有自定义名称，即使伪造同步 flag 也保留原名；失败不删除已完成训练。
- 从模板创建当次训练快照模板当时名称。后改名/删除模板不追溯历史。事务重查同日未完成训练及模板 source，阻止并发创建或过时模板写入。

## D：两个主题、独立旧明暗轴

- 仅 `classic` 和 `light-native`；设备偏好键 `fitlog-visual-theme-v1` 与旧 `fitlog-appearance-v1` 分离。两者均不进业务 DB、Backup 或 Sync。
- Classic 精确 palette/组件基准来自 `7110564631b6e40f59485cb1a12543ea59b3a2df`。该基准中的 main/recovery/modules 基础视觉没有被 Light Native 删除；本轮将 Light Native 覆盖层从“所有浅色”限定为明确的 Native 根主题，恢复已有经典 tokens/组件。保留已批准的长文本/响应式修正。
- Classic 使用原 system/light/dark；Native 固定浅色，旧明暗键不改写。初次没有视觉键，effective dark 保持旧暗色，effective light 保持上一版 Native 浅色；系统后续切换仍按旧行为响应，不自动写新偏好。UI 只有两项视觉选项，未选择兼容态不是第三主题。点击已经勾选的兼容态Classic仍会保存显式选择；操作Classic专属明暗设置也会固定Classic主题，避免选浅色后误切到Native。键盘change与点击路径去重；外部切换若隐藏当前聚焦的明暗控件，将焦点保留到已选视觉选项，避免落在隐藏控件。
- 初始 head bootstrap 与运行时共享相同策略。切换只改根 dataset、tokens、color-scheme、theme-color、Apple status-bar meta，并发送原主题事件；不重挂页面/工作区，不重建草稿，不写业务表。跨标签页、存储失败、刷新和离线单独验证；失败反馈“无法保存”，不能假报成功。
- Manifest id/start_url/scope 和稳定安装/数据库身份保持。实体 iPhone 的状态栏/启动画面实效仍需原安装 PWA 实测，浏览器证据不能替代。

## E：原生睡眠时间

继续原有 `input type=time`、原日期子页、夜晚归属、recoveryService 与共享 Sheet/VisualViewport。只增加睡眠输入专用 class、可收缩宽度、至少16px 字体/44px 触控及继承 color-scheme，处理 WebKit 时间值内部对齐；没有 `appearance:none`、手搓滚轮、私有键盘控制器或新的时间计算。

补录/编辑保留另一字段、日期 Back、父 Sheet 身份和失败草稿。时长依据真实 instants；凌晨0:00–5:59、跨年、DST、手动归属及捕获夜晚字段仍由原合同管理。自动化可验证 type/time value/归属/时间服务与布局；系统滚轮皮肤、真实12/24小时系统设置、IME 和 Safe Area 只能由实体设备确认。

## 数据边界与证据

数据库保持 `fitlog-lite-db`、Dexie13/IDB130/22 stores；无 schema/index/migration 修改。Backup14 的 validator 原本允许可选顶层字段，导出/Restore 保留完整 Workout 对象；本轮仅验证 optional name 字符串类型；手工编辑另有输入边界，历史模板快照不受新增长度限制，不重建或丢弃字段。旧客户端 frozen START 的实际 Restore→Export、旧 Autosave、回到新客户端 Restore 和 Sync1 加密往返验证在 [QA](FIVE_COMBINED_V1_QA.md)；不能仅凭类型定义宣布兼容。

新增独立冻结 [命名 V14 合成备份](../tests/fixtures/fiveCombinedNamedBackupV14.json)，原17份冻结输入不改。Restore1–14、Sync/envelope1、FoodLog/NutritionTarget、删除范围/事务、计划、训练计时、三图、两报告以及 AI/Voice/PWA 更新合同不扩展。自动化仅操作隔离合成上下文及既有专用 QA profile，不触碰个人健康记录。

完整执行记录、首次失败/复测、候选源指纹、原型/实际截图及发布状态见 [QA](FIVE_COMBINED_V1_QA.md)。实体 iPhone、原安装 PWA、真实键盘/滚轮/Safe Area、VoiceOver、个人连续性和真实 Provider，没有实际证据均保持 Pending。已知 WebKit 饮水 Undo −128px 不冒充本轮解决。
