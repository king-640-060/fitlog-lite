# 联合交付视觉核对 — 2026-10-11

基准：[四份批准 HTML](../design/reference/2026-10-11-combined/DESIGN_REFERENCE.md)，实际运行并校验原字节。截图使用相同 Chromium、390/320/430px、100/140/200%文字缩放和深浅主题；原始100%参考CSS不改。放大仅在临时浏览器内等比处理演示固定像素字号，原型文件内容不变。生产组件继续使用项目系统字体与Token；各字体栈/计算字号记录在DOM JSON，不能宣称跨系统字体逐像素一致。

人工实际打开原图查看 A入口、B无命中、C日期详情/暗色/小屏放大、D信息/周卡/分配/预览；自动化几何与数据结果用于补充证据。对照页为同一原图并列，不修图：`visual-comparison.html`；原图在 `prototype-comparison/` 与 `verified/local/`。WebKit截图另在 `verified/webkit/`。

## 390px / 100% / 浅色几何

|组件|批准参考|生产实现|核对结果与必要差异|
|---|---|---|---|
|A入口|360×58px|358×58px|同透明背景、上下边界、7px/2px padding、8px外gap、9px leading gap、5px尾部gap；生产保留16px页面边距（宽-2px）。与餐次实际距离16px，由已有12px body gap+4px局部margin组成。|
|B无命中结果|352×191.047px|354×188.25px|同65px顶部留白、43px图标、15px图标下距、15px/540标题、12pxhelper；既有Sheet18px内边距比演示19px宽2px，辅助行高与系统字体使高度差2.797px。|
|C日历|358×560px，35格|358×723px，42格|保留正式版42天含跨月六周、18px圆角和原有padding；十个语义位置改3×4，计划在第四行中间，七列触摸≥44px。不能用演示35格替换真实月份。|
|C日期Sheet|390×707px|390×820px|保留现有native Sheet尺寸/生命周期/顶部安全区域；内部两列五行、8px gap、13px边框卡、67px summary最小高度。原型仅数量，正式版还保留真实kcal/保存目标提示，因此第一对卡更高；其他二级信息在完整展开明细中。|
|D外层|独立页面，390×2536.172px|现有管理Sheet，390×820px viewport|正式编辑必须保留既有Management Workspace/Back/X/键盘滚动。内部信息→每周日期→独立分配→完整预览顺序一致；不是移植演示页面。|

## 按模块核对

- **A**：餐次（含未分类）之后唯一低强调入口。Bookmark/标题/实际N/尾Chevron相同解剖；空/一/多条列表沿用真实新增编辑删除Sheet。实际两个标记与原型一条演示数量不同，明确展示真实状态。估算不进入营养事实。浅色主文字沿用生产ink #282e28，原型#303831；辅助颜色使用现有更高对比度Token，未新增调色体系。
- **B**：无命中与空库分别说明，实际草稿与搜索返回保留。无大面积Empty Card；只对模板动作picker生效。复用现有主题surface/secondary/tertiary，图标淡底与演示color-mix存在Token差异。
- **C**：稳定10类别/3×4槽位、两列完整native disclosures、两个默认折叠菜单均对照。正式分类图标保留小24px语义底与右Chevron（原型纯描边/无真实展开事实）；暗色使用protein/carbs/accent主题soft Token，不反转图标。第十类是Task.date存在，不代表完成健康事实。删除预览含独立默认未选NutritionTarget与真实数值，比演示增加安全信息；最终确认日期/类别/数量/不可撤销。
- **D**：同19px信息卡、分周、日格、营养/饮食独立分配、复制确认、预览顺序。正式使用真实模板任意变体、实际首尾日期/部分周、28天初始范围，演示是21天固定样例。额外保留更新字段掩码、最大366天说明、已保存目标/缺失模板/冲突范围和显式实际摄入确认。所有输入至少16px/44px高，日期触摸至少44px；窄屏或大字体七日格只内部滚动，首个实际日期可见。完整预览含未指定日期，不能照搬演示只列安排日。

## 可访问性与事实边界

320/375/390/430px ×100/120/140/200%×深浅主题＋844横屏，共33显示组合通过；WebKit另4组合通过。真实数据测试、同日期刷新、连续录入、历史选择、默认折叠、实际控制点击、键盘高度/Safe Area是浏览器模拟证据；不是实体iPhone Safari/PWA验收。

原批准HTML没有被改写。V4.2原有剩余目标、g/kg、四张报告营养卡和补齐算法保留。测试绿色不表示逐像素一致，也不表示用户已验收。实体Safari、原主屏幕PWA：Pending。


[仓库中的四组原图对照](evidence/combined-2026-10-11/README.md)。其余主题、字号、展开状态和部署后原图保存在交付证据目录，最新报告提供实际测试和部署身份。


## 原交付矩阵的实现核对

以下为本地实施及自动化结果；生产部署、精确资源和既有profile结果单独见LATEST，不把本地PASS写成已发布。

|ID|范围|本地结果|证据入口|
|---|---|---|---|
|A01|特殊饮食入口|PASS（本地）|combinedHandoff / dietEvents|
|A02|空/有记录|PASS（本地）|combinedHandoff / dietEvents|
|A03|功能边界|PASS（本地）|combinedHandoff / dietEvents|
|B01|空动作库|PASS（本地）|combinedHandoff / picker DOM|
|B02|搜索无命中/有命中|PASS（本地）|combinedHandoff / picker DOM|
|C01|十类日历|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|C02|暗色图标|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|C03|日期字体|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|C04|日期详情|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|C05|快捷记录折叠|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|C06|删除单类|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|C07|删除多类/全部|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|C08|保护边界|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|C09|营养目标|PASS（本地）|dayRecordDeletion / dailyRecordsExperience / combinedHandoff|
|D01|周期配置|PASS（本地）|nutritionCycles / nutritionTemplates / combinedHandoff|
|D02|任意日方案|PASS（本地）|nutritionCycles / nutritionTemplates / combinedHandoff|
|D03|独立饮食模板|PASS（本地）|nutritionCycles / nutritionTemplates / combinedHandoff|
|D04|复制与覆盖|PASS（本地）|nutritionCycles / nutritionTemplates / combinedHandoff|
|D05|目标落地|PASS（本地）|nutritionCycles / nutritionTemplates / combinedHandoff|
|D06|实际摄入保护|PASS（本地）|nutritionCycles / nutritionTemplates / combinedHandoff|
|D07|数据版本保护|PASS（本地）|nutritionCycles / nutritionTemplates / combinedHandoff|
|G01|完整门槛|PASS（本地）|typecheck /879单测 /34浏览器业务gate；CI/生产见最新报告|
|G02|独立验收准备|PASS（本地）|25原件SHA /68原型状态截图 /对照说明；真机Pending|
