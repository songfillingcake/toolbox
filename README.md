# DevKit 开发工具箱

面向 Java 后端开发的本地实用工具集。**默认所有数据在浏览器本地处理**，不上传服务器。

## 功能一览

### 基础工具
MyBatis → SQL · SQL 格式化 · Cron 解析 · 时间戳 · UUID · **文本 Diff**

### Pro 工具
JSON Pro · 编码 Pro · Redis Pro · 配置互转 · 正则 · Hash · **JWT 解码** · **.env 解析**

### 开发调试
EXPLAIN 助手 · 日志高亮 · jstack · Maven 冲突 · Mock 生成 · **测试数据**

## 启动

```bash
cd dev-toolbox
mvn spring-boot:run
```

浏览器打开：**http://localhost:8088**

### 生产 / 本机部署

```bash
mvn -DskipTests package
java -jar target/dev-toolbox-1.10.0.jar --spring.profiles.active=prod
```

`prod` profile 默认：仅监听 `127.0.0.1`、关闭 URL 拉取。**请勿将默认配置裸奔暴露到公网。**

## 测试

```bash
mvn test
npm install
npm run test:frontend
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` | 命令面板（跳转工具 / 加载示例） |
| `Ctrl+Enter` | 执行当前工具主操作 |
| `Ctrl+Shift+C` | 复制当前面板结果 |
| `/` | 聚焦侧栏搜索 |

## 安全说明

```
浏览器本地工具 ──► 大部分数据不出本机
       │
       ├─ JSON / SQL / 配置等：纯前端处理
       │
       └─ /api/fetch（可选）：服务端代理拉取 URL
              ├─ 默认禁止内网 / localhost（防 SSRF）
              ├─ 敏感模式：前端彻底禁用 URL 拉取
              └─ 配置见 application.properties
```

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `devkit.fetch.enabled` | `true` | 是否启用 URL 拉取 |
| `devkit.fetch.allow-localhost` | `false` | 是否允许访问本机地址 |
| `devkit.trusted-proxies` | 空 | 可信反代 IP，为空时不读 XFF |
| `maxInputChars` | 512KB | 输入大小上限（`/api/config`） |
| `maxDiffLines` | 1500 | 文本 Diff 每侧行数上限 |

## 数据流与隐私

- **JSON / SQL / 配置 / 日志等**：100% 浏览器端，不经过网络
- **Cron 解析**：仅发送 Cron 表达式到本地后端
- **URL 拉取**：仅在 JSON Pro 使用 `#url=` 时触发，受 SSRF 防护约束

## 敏感模式

点击主区域右上角敏感模式按钮，开启后：
- 禁用所有网络请求（含 JSON URL 拉取、Cron API）
- 禁用历史记录与工作区保存
- Cron 常用表达式改**本地解析**（复杂表达式请关闭敏感模式）
- 顶部显示安全提示条

## 更新日志

见 [CHANGELOG.md](src/main/resources/static/CHANGELOG.md) 或页面侧栏版本号链接。

## 技术栈

Spring Boot 3.2 · Java 21 · 纯静态前端 · v1.10.0
