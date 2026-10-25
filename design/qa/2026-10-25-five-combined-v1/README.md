# 五项联合 v1：本地开发证据（尚未发布）

输入基准见[原型目录](../../reference/2026-10-25-five-combined-v1/DESIGN_REFERENCE.md)，实施与当前状态见[QA](../../../docs/FIVE_COMBINED_V1_QA.md)。本目录是本轮实际证据的精简副本，完整原图/逐帧/首败/复测保留在交付work目录；最终CI/Pages信息应查LATEST及正式回执。

- units/typecheck/build来自本轮实际命令；构建只在成功后复制并核对source与资源SHA。
- 短名/3200字符名称的旧客户端Restore/Export/Autosave→新Restore/Sync均双引擎实际执行。
- 原型8上下文；睡眠时钟12上下文84场景。浏览器locale不等于真实iPhone设置。
- before/after是本地冻结Classic7110564、Native/深色68f4747与本地候选的12对实页截图和computed styles，不是正式站截图。截图早于最后针对今日名称的overflow-wrap修复；该修复须由新的完整矩阵另验，不能偷换截图版本。
- superseded-release-attempt记录修复前64项实际30PASS/34FAIL；其中长名称溢出是真实产品缺陷，已修复；多项locator超时与系统休眠同期，不能假定每项均因休眠或直接记PASS。首败日志原件仍保留。
- remote-qa-candidate是临时、只读非发布CI分支的身份；不是Application或END，也不代表Pages上线。临时workflow与旧基线资产不会进入正式main。
- scope保护原17冻结输入/78单测/691旧设计、原业务断言与数据库schema。唯一呈现assert将Classic浅色meta恢复冻结#f5f2eb。

实体iPhone/原安装PWA/真实键盘滚轮/Safe Area/VoiceOver/个人连续性/真实Provider以及独立核查均Pending。旧WebKit饮水Undo−128px未在本轮结案。
