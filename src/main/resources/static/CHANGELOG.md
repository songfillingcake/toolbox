# Changelog

## v1.10.0 (2026-06-22)

### 文本 Diff
- **并排视图**：左右对照 A/B 文本，删除/新增行对齐显示
- **同步滚动**：两侧结果区联动滚动
- 视图偏好记忆（统一 / 并排）

### 工作区
- **正则测试**：保存表达式、测试文本与 g/i/m/s 标志
- **EXPLAIN 助手**：支持存工作区
- 工作区恢复支持 checkbox 字段

### EXPLAIN 助手增强
- 支持 MySQL 8 **全 12 列**（partitions、filtered、key_len 等）
- 兼容 Tab / 管道表格 / Navicat 复制格式
- 风险分级摘要（高/中/低）+ type 彩色标签 + 完整结果表
- 扫描行数、filtered 过低、ICP/覆盖索引等智能解读
- **复制报告** 导出纯文本

## v1.9.0 (2026-06-22)

### 新功能
- **JWT 解码**独立面板：过期提示、Claim 说明、→ JSON Pro
- **.env ↔ YAML** 双向互转（扁平键值）
- **文本 Diff Web Worker**：≥250 行自动后台对比，带加载动画

### 体验
- EXPLAIN / jstack / Maven 统一 `tool-error` 错误提示（原因 + 建议）
- 编码 Pro → JWT 解码联动
- `Ctrl+Shift+C` 支持 JWT 面板 Payload

### 工程
- **版本号单源**：`pom.xml` → `version.properties` → `DevKitVersion`
- CSP 增加 `worker-src 'self' blob:`、`connect-src data: blob:`（OCR WASM）
- `DevKitVersionTest` 新增

## v1.8.0 (2026-06-22)

### 安全与部署
- **ClientIpResolver 加固**：仅可信反向代理才读取 X-Forwarded-For，防限流绕过
- 新增 **`application-prod.properties`**（本机绑定、关闭 fetch、可信代理配置）
- `devkit.trusted-proxies` 配置项

### 体验一致性
- **工作区多字段**：textdiff 左右两侧一并保存/恢复
- SQL / 配置 / 日志 / dotenv 支持**存历史 + 存工作区**
- **`Ctrl+Shift+C`** 覆盖 explain、log、jstack、maven、regex、JWT 等 div 结果区
- 编码 Pro 增加**加载示例**按钮；日志空输入统一错误提示
- Cron / UUID / 时间戳 / Mock 补**一键示例**

### 工程质量
- **Vitest 前端单测**（dotenv、text-diff、mybatis）
- **GitHub Actions CI**（Maven test + 前端 test + package）
- `ClientIpResolverTest` 新增
- 文本 Diff 默认上限降至 **1500 行**（防卡顿）

## v1.7.0 (2026-06-22)

### v1.6.0 工具补强
- **.env 双向互转**：支持 .env / Properties / JSON / Shell 任意方向转换
- **.env 解析加固**：行内注释、引号转义、敏感项精准脱敏（不再误伤 MONKEY 等键名）
- **.env → 配置互转**联动；导出 `.env` / `.json` / `.properties` / `.sh`
- **文本 Diff**：每侧 3000 行上限（服务端可配置）、行内差异高亮、复制结果、导出 unified `.patch`
- **测试数据**：新增商品 / 直播间 / 礼物类型；可复现种子；→ Mock 生成；导出 JSON

### 体验
- 侧栏 / 命令面板中文同义词搜索（环境变量、假数据、对比等）
- textdiff / dotenv 支持存工作区；textdiff-right 拖拽文件
- faker 一键加载示例（固定种子 42）

### 质量
- 新增 `DotenvParser` Java 实现 + 单测（与前端行为对齐）
- 新增 `RateLimiterTest`
- CSP 增加 `base-uri 'self'`；`/api/config` 返回 `maxDiffLines`

## v1.6.0 (2026-06-22)

### 新工具
- **.env 解析**：.env ↔ Properties / JSON / Shell export，敏感项脱敏
- **文本 Diff**：配置 / 日志 / SQL 片段行级对比（LCS 算法）
- **测试数据生成**：批量生成用户 / 订单 JSON，一键跳转 JSON Pro

## v1.5.0 (2026-06-22)

### 安全与性能
- 连接后复核真实对端 IP（`socket.getRemoteSocketAddress()`）
- IPv6 内网段加固（ULA `fc00::/7`、链路本地 `fe80::/10`）
- 统一 `RateLimiter`（按 IP 限流 + 过期清理）
- HTTP 安全响应头（CSP、X-Frame-Options、nosniff 等）
- 版本号后端单点 `DevKitVersion`

### 体验与功能
- 全局面板输入 512KB 防护（主操作按钮统一拦截）
- 正则高亮匹配上限 1000（防 ReDoS 卡死）
- 工作区导出/导入 JSON；任意工具工作区加载修复
- 编码 Pro 示例一键填充 Base64 / URL / JWT
- 复制当前工具分享链接（顶栏 + 命令面板）
- 敏感模式下一键清除本地数据
- 移动端侧栏抽屉 + 遮罩

### UI
- 顶栏粘性布局、隐藏 PRO 标签
- 脚本 `defer` 加载，减少阻塞解析

## v1.4.0 (2026-06-22)

### 安全
- `/api/fetch` 加固：禁止重定向、连接/读取超时、流式字节上限、连接后 IP 复核
- 按客户端 IP 限流（fetch / cron 分离计数）
- Cron 表达式长度上限 256 字符

### 可靠性
- 新增 `MyBatisSqlConverter` Java 单测（与前端 MyBatis 转换行为对齐）
- 新增 `CronService`、`SafeHttpFetcher` 单测
- 输入大小统一上限 512KB（MyBatis / SQL / 日志 / 正则等）

### 体验
- 启动时读取 `/api/config`，按服务端策略隐藏 URL 拉取栏
- **敏感模式**扩展：禁止所有网络请求、禁用历史/工作区持久化；Cron 改本地解析
- Tab 切换自动写入 URL hash（`#tab=mybatis`）支持书签分享
- 正则匹配上限 1000 条，防止 ReDoS 卡死

## v1.3.1 (2026-06-22)

### UI
- 侧栏底部 **Theme / Workspace / Collapse** 改为图标按钮 + tooltip
- 工具栏主操作、复制/导出/清空/历史/工作区按钮增加轻量 SVG 图标
- 输出区与结果面板增加**空状态占位**（图标 + 引导文案）
- 修复 Redis 面板多余 `</section>` 标签

## v1.3.0 (2026-06-22)

### 安全
- `/api/fetch` 增加 SSRF 防护：禁止内网、环回、链路本地地址
- 可配置 `devkit.fetch.enabled` / `devkit.fetch.allow-localhost`
- 请求频率限制（30 次/分钟）
- 前端**敏感模式**：禁止远程 URL 拉取

### 体验
- **命令面板** `Ctrl+K`：跳转工具、切换主题/敏感模式、加载示例
- **面包屑**导航：显示分组 / 当前工具
- **收藏工具**：侧栏项点击 ☆ 收藏，最多 6 个
- 各工具自动注入「**加载示例**」按钮
- 统一错误提示格式（原因 + 建议）
- 快捷键 `Ctrl+Shift+C` 复制当前面板结果

### 功能
- MyBatis → **EXPLAIN 联动**：一键跳转并生成 `EXPLAIN` 建议语句
- `DevKitCore` 统一 API（toast / 复制 / 导出 / 历史）

### 测试
- `FetchUrlValidatorTest` 单元测试

## v1.2.0

- JSON Pro 增强：Diff、行内编辑、URL 加载
- 新增：配置互转、正则、Hash、EXPLAIN、日志、jstack、Maven、Mock
- 导航优化：搜索、折叠分组、最近使用

## v1.0.0

- 初始版本：MyBatis、SQL、Cron、JSON Pro、编码 Pro、Redis Pro
