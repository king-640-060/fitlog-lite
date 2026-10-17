# FitLog Lite · UX-01～03 已批准开发交付

**批准基准：** `prototype/FitLog_UX01_UX02_UX03_Interactive_Prototype_v0.4.html`，SHA256
`96804e985c5287fa9d0ea857924335a30813a49758b74f1abf73af550dbf8ceb`。

**基线：** GitHub `king-640-060/fitlog-lite`，2026-10-16 F1–F5 归档 SHA `d8b08b74e17e91139239f1d6d939ddd9b1d7030c`。执行前必须重新 fetch main，不能以此 SHA 冒充当前 HEAD。

本包供 Codex **实施、测试、普通提交、CI、Pages 发布**。附件原型是内存演示，不可作为正式数据服务。严禁清空/重建真实用户 PWA 的 IndexedDB。

文件索引：
- `CODEX_TASK.md`：可直接执行的十二要素指令与十项回执要求；
- `DESIGN_LOCK.md`：批准的视觉/交互与原型差异；
- `CASCADE_DELETE_CONTRACT.md`：用户明确批准的六类级联删除范围、安全实现与边界；
- `ACCEPTANCE_MATRIX.md`：可判定 PASS/FAIL/Pending；
- `DATA_RELEASE_SAFETY.md`：兼容、备份、线上部署与物理设备边界；
- `prototype/`、`preview/`：不可修改的原型及关键截图；
- `SHA256SUMS.txt`、`FILES.json`：交付文件完整性清单。

**用户明确批准**：首页饮水默认折叠，通过「记录饮水」展开；进度饮水 Sheet 小而轻；营养模板允许永久级联删除**仅六类**记录。真正的健康事实（实际 FoodLog、体重、饮水、睡眠、训练等）必须保留。此前的“只归档”“从模板库隐藏”不是本次删除实现。营养模板分析报告不在本轮范围内。

原型演示里的时间、数量、案例与虚拟数据不进入生产；生产显示实际 DB 计算的数量。**危险操作绝不可按演示伪造成功。**
