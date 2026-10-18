# 本轮联合任务 PASS／FAIL／Pending 验收矩阵（不可删除任何行）

| ID | 测试义务与明确通过条件 |
|---|---|
| BASE-01 | 重新 fetch main、确认干净工作树，原上一轮 `94235868...` Git 历史与文件保留；阅读 AGENTS 和全部已有最新合同 |
| BASE-02 | v0.3 HTML 原字节 SHA `436f5ee...e3991` 及全包 SHA256 验证，原型实际打开操作；不拷贝演示固定时间/虚构数据 |
| WATER-01 | Today 右侧“记录饮水”与其他模块动作同列，图标居中、旋转/aria-expanded 与 hidden 正确；默认收起 |
| WATER-02 | 展开后在短屏/下导航/safe-area 下操作区完整进入可视范围，无必须手动滑动；收起不抢滚动 |
| WATER-03 | +500/+1000 和自定义保存后保持展开且自动可见；重复连点仅写一个真实独立 log，失败不虚增，精确 Undo/历史/参考值不回归 |
| TREND-01 | 三张卡始终独立，各自 7/30/90/selection/scroll 切换，切体重30不改变饮水/睡眠当前7 |
| TREND-02 | **7天逐日7日期可见、均匀自然日轴，未记录日期保留且不补0，跨月清楚**；30/90 天所有天占位、横向滚动，不丢标签数据 |
| TREND-03 | **强制高度**：每张 weight/sleep/water 的 card、header、plot-scroll、Canvas/SVG、axis、range、footer 在7→30→90→7各步 bounding box 高差≤0.5px（测量 subpixel），不只是外层固定；全无睡眠/单点/离线等同样通过 |
| TREND-04 | 320/375/390/430、light/dark、100/140/200%、844 landscape，每种场景下 TREND-01/02/03 PASS；文字不裁剪、44px交互，长区间可读 |
| TREND-05 | 同一实际值的90日参考纵轴尺度在不同range Y基本稳定，重设范围不会让曲线像换了高度；体重同日/睡眠夜晚/饮水当地日期及无记录/active睡眠正确 |
| REPORT-01 | 顶层只有“日常综合报告”“营养周期报告”，原四focus阅读按钮彻底不显示，不藏重要数据；周/月/日期真实事实不回归 |
| REPORT-02 | 日常报告包括营养完整度、同日目标配对、训练可比性、体重变化、睡眠和饮水覆盖、最多3条可追溯建议；可展开专业细节 |
| REPORT-03 | 真实营养周期可选择、历史阶段有明确“非周期”的不同标签；同一个template多期可选、未来时间不混入实际值 |
| REPORT-04 | 营养周期实际汇总Food、NutritionTarget、Strength/Cardio/Pelvic、Weight、Water、Sleep，按日期范围和 night attribution 正确去重；不计算普通 Task |
| REPORT-05 | 未记录≠0，缺目标/部分宏量/稀疏体重/稀疏睡眠/历史variant快照/多水日志都用正确统计口径与证据覆盖率 |
| REPORT-06 | 任何健康教练语句没有无证据体脂变化、确定热量缺口、脱水诊断、过度训练诊断；能标明“事实/关联/不足以判断” |
| DELETE-01 | 同一模板归属phase+cycle区间并集准确合并；重叠天去重，非连续段间隔不删，open phase仅到today，明确未来周期覆盖范围 |
| DELETE-02 | 原六类仍由模板归属精确IDs完整删除；NutritionTarget同时取模板关联∪日期范围内全部目标，手动目标删除须被预览列明；无范围模板不额外删健康事实 |
| DELETE-03 | 九类健康事实按实际匹配date删除；`sleepSessions` 以所属夜晚跨午夜归日，包括 active edge-case；其他日期完全保留 |
| DELETE-04 | `tasks`/`taskTags`（含所有subtasks、完成/日期）及 foods/exercises/workoutTemplates/dietTemplates/habits定义逐字节无变化；区间外事实和其他模板保留 |
| DELETE-05 | 对真实有引用模板展示来源范围、每类真实计数、未来与历史影响、“与模板无直接外键也因日期被删”的准确警告；未经风险勾选不得进入二次确认 |
| DELETE-06 | 点击取消、关闭、二次确认拒绝、跨页/过期预览、快速双击均不写或者最多成功提交一次；错误可理解 |
| DELETE-07 | 跨模板重叠脏数据/交叉variant/phase、非法周期日/目标来源混合拒删且全表不变；同模板phase+cycle重叠仅去重不拒删 |
| DELETE-08 | 在覆盖所有相关表的**同一个**Dexie事务中指纹重验、删ID、后置集合验证；15个表的每一步故障注入/两tab并发均全量回滚，不能六表成功而健康记录失败 |
| DELETE-09 | 各相关表删除前后 ID 集合和完整对象逐表 hash 验证（包括22表与设备配置）；不可“仅比较行数” |
| DELETE-10 | 删除后 Today、趋势、日历、两种报告、活跃计时及模板管理立即一致刷新；被删周期不可选，保留任务和范围外健康历史仍可查看 |
| DATA-01 | DB13 / IDB130 /22 stores、Backup14/Restore1–14、Sync1/加密 envelope1 与所有原冻结fixture不变，删除前后合成备份恢复/旧客户端安全拒绝/同步实际验证 |
| DATA-02 | 原PWA旧档案（独立合成profile）升级，用户基础资料与任务hash不变，无DB清空/重置，不操作用户个人数据 |
| REG-01 | `npm run typecheck`, full `npm test`, prod build, 全部既有浏览器40命令或实际新增数量，全项PASS且无skip/todo；新增前后对照合成失败日志保留 |
| REG-02 | WebKit + Chromium分别实跑真实 App（不是只测批准 HTML）包含所有重要危险流程、删除回滚、趋势高度截图与真机模拟键盘/safe-area |
| REL-01 | Git diff--check、变更文件清单、原批准设计归档/合同/QA更新，通常提交推main且不force，完整 START/App/END hash |
| REL-02 | Application及END CI/Pages真实Success，最终JS/CSS/SW/build-info身份和离线冷启动经线上实测，不以CI绿色假定用户原安装PWA已升级 |
| REL-03 | **实体iPhone / 原安装PWA / VoiceOver / 真实键盘与SafeArea / 个人数据连续性若无真人证据则 Pending**，不得标PASS |
| REL-04 | 十项交付回执、每个测试项证据、原始截图日志与失败重试准确保留；完成后停止未经批准改动 |
