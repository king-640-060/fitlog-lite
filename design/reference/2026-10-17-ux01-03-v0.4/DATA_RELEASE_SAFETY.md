# 数据、测试与发布安全要求

1. 初始版本锚点为 d8b08b74…（F1–F5 归档），实施必须先 fetch 并以真实远程 main 为准。清洁 `git status`、保护用户未提交改动；`git pull --ff-only` 而非 reset/force。
2. 用户已批准**实现未来可执行的删除功能**，并未要求 Codex **立即删除设备上任何现有真实模板**。一切验证使用隔离、可丢弃的合成 IndexedDB 档案，不进入用户原安装 PWA。
3. 实际营养目标是六类之一；删除前必须辨认来源属于模板，不能以目标数值等于模板、时间落在阶段范围内、名字相同推断。重用既有 typed selection/source semantics。
4. 数据库版本：Dexie13 / IndexedDB130 /22 stores；Backup14 / Restore1–14 / encrypted Sync envelope1。先评估新业务行为的持久化语义；无用户授权不得迁移结构、重写旧记录、改动 fixture 或变更备份版本。
5. 恢复失败时保留全部表与配置。启用从旧已安装 PWA 升级的 service worker 测试，不 clear storage/reinstall 现实设备；原 profile 哈希比较只用合成旧档案。
6. 保留完整先前测试资产/断言；至少覆盖旧 969 tests 基线及35既有浏览器 suites（按实际新仓库核实数量），新双引擎浏览器测试，真实 onclick 流程、边界值、并发、回滚、Undo、数据保留、Backup14 roundtrip。
7. `npm run typecheck`, `npm test`, `npm run build` 及生产 base path 构建，所有必须通过。截图包含 320/375/390/430、深浅、键盘、横屏、200% 字体。不要只测试 HTML 演示。
8. 把操作指南、数据丢失边界、删除事务合同和残留引用保护写入项目长期文档；批准原型以不修改的单独 Git 文件归档。
9. 普通非强制提交/推送 main；Application CI/Pages success 后验证实际线上 JS/CSS/build-info/SW 身份和离线冷启；结束文档更新如有 END commit，要单独确认 END CI 和最终 Pages 资源身份。
10. 真实 iPhone Safari/原安装 PWA、键盘与 Safe Area、VoiceOver、个人数据连续性必须分别标实际 PASS 或 Pending；自动化不得替代人机验证。若发生 schema/数据语义冲突、六类无法安全级联、跨模板引用含混，**停止受影响的开发并提交风险报告**，而不是临时更改用户决定或扩大删除范围。
