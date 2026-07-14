# OCR 本地资源

截图识别依赖 Tesseract.js。在项目根目录执行：

```bash
npm run vendor:ocr
```

将下载以下文件到本目录：

| 文件 | 来源 |
|------|------|
| `tesseract.min.js` / `worker.min.js` | `tesseract.js@5.1.1` |
| `tesseract-core-*.wasm.js`（4 个） | `tesseract.js-core@5.1.1` |
| `tessdata/eng.traineddata.gz` | `@tesseract.js-data/eng` |

下载完成后重启 Spring Boot 并刷新页面。
