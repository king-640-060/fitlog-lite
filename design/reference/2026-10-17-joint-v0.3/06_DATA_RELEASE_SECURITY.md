# 数据保护、上线与异常处理（Codex强制）

## 用户许可边界

用户已确认需求并批准**v0.3 演示原型**，同意交给Codex实施和正常发布。**没有授权助手、CI、Codex 在其原安装PWA直接执行任何永久删除**。危险验证使用独立合成档案，不得导入用户真实备份到公网测试站点；不得收集加密密钥和个人健康事实截图作为公开CI artifact。

## 不得破坏既有合同

当前 `main` 观察值 9423586813e2c65a2f2d7126b82acb70bbe02100；Dexie13/IDB130/22 stores、Backup14、Restore1–14、encryptedSync envelope1。既有F1–F5和上轮UX01～03正式历史、真实设备已安装 PWA 不准被回归变更误毁。健康事实删除会改变导出备份的内容，这是经过用户二次确认后的结果；**格式**不得擅自变化。旧备份仍可能包含此前数据，不能保证物理上“永远无法恢复”。

## 删除服务的安全工程细节

- 先确定**字段、Store、日期的正确业务归属**，特别 `sleepNightDate` 以及 legacy fallback 和未结束睡眠；打开 Dexie RW TX 前所有UI交互必须完成。跨窗口并发使用事务中的重新计划+指纹检查。
- 要保留 `Task`、`TaskSubtask`、`TaskTag`、`Food`、`Exercise`、`WorkoutTemplate`、`DietTemplate`、`Habit` 定义以及未在日期并集的所有事实；**独立基本资料不能因已无引用而顺手垃圾回收**。
- “六类所属营养目标”与“日期内其余全部营养目标”虽然最终都在 `nutritionTargets`，但 UI 必须分别明确数量及来源；总数按不重复ID计算。
- 隔离旧测试 Profile：只有合成 DB；old synthetic archive 比较旧哈希/同一数据重开。**不清库、不隐含迁移、不修改15个冻结fixtures**。
- 若需要新增 schema/index/backup format、改变sync conflict policy或跨表事务无法成立，暂停上报，等待明确授权。不能因为时间紧“先将所有health stores.clear()”。
- 禁止改变计划定义或删除所有日期。错误处理保证任何一步 throw 事务整体 rollback，不能“尽量删除”。成功后留存精确审计预览以确认安全，但不要把私密历史健康事实写到持续日志和网络。

## 联合部署与复核

1. 发布前完整既有回归、真实 Playwright 双引擎、新专项 tests 及 TypeScript/Vite 构建。一个失败不得用skip掩盖。视觉高度规则必须通过几何量测日志。
2. 按规范提交/非强制push，核查仓库清洁、Application CI、Pages静态资源/SW/build-info、真实线上 UI、旧已装合成PWA更新保留与离线冷启动。如需要更新报告单独 END commit，再验证 END。
3. 报告真实未测事项：物理iPhone Safari/原安装PWA/VoiceOver/硬件键盘或系统软键盘、safe-area、个人健康数据完整性，必须 Pending；由用户自己在设备确认。
4. 任何网络/权限不能获得真实 CI 证据时停止并如实写 Pending；绝不虚构 run ID 或工作树状态。
