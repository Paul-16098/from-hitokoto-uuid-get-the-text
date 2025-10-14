# Copilot Instructions for this Repo

極簡、純前端、無框架的 TypeScript 專案。以自訂標籤渲染一言內容，輸出單一 IIFE `main.js`。請維持現有 DOM/資料流與無 runtime 相依特性。

## 架構與資料流（見 `main.ts`）

- 單一入口：`main.ts` → esbuild 打包 `main.js`（format: iife, platform: browser, target: esnext, sourcemap）。
- 僅處理 `<body>` 直屬：
  - `<text-meta>`：每行 `text,from,from_who,cite`，立即渲染。
  - `<hitokoto-meta>`：以逗號或空白分隔 UUID，需登入取得 token 後抓取句子與評分。
- 全域 orchestrator 於 DOMContentLoaded 執行：「先 text、後 hitokoto」，並將所有 `hitokoto-meta` 聚合去重，插入在第一個 `<hitokoto-meta>` 後方。
- 自訂元素本身設為 hidden，渲染結果插入在其後而非其內。

## 建置與認證注入

- 指令：`pnpm run build`（`tsc ./build.mts && node ./build.mjs`）。目前無 dev 腳本。
- 認證變數（僅這兩個會被 define 注入）：`HITOKOTO_EMAIL`、`HITOKOTO_PASSWORD`。
- `build.mts` 會從 `.env` 與 `process.env` 讀取並注入 esbuild define；
  執行時的取值優先序（`resolveCredential`）：define → `globalThis[NAME]` → `process.env[NAME]`。
- 若缺少任一認證值：跳過遠端一言流程，只渲染本地 `<text-meta>`。

## 渲染規則與插入點

- `<text-meta>`：
  - 每行轉成 `<blockquote><div>{text}</div></blockquote>`；`from` 預設「无名氏」。
  - `blockquote.title` 為 `${from_who||from}(n.d.).${from}.`；若有 `cite` 則設為 `blockquote.cite`。
  - 插入位置：緊接在該 `<text-meta>` 後方。
- `<hitokoto-meta>`：
  - 對每個 UUID 產生 `<blockquote>`；`cite` 固定 `https://hitokoto.cn/?uuid={uuid}`，`title` 同上。
  - 取分數成功時在 `<div>` 末尾附加 `<sub>{average}</sub>`；若回應訊息為「很抱歉，句子不存在或评分未创建」且 `status === -1`，顯示 0。
  - 插入位置：在「第一個」`<hitokoto-meta>` 後方；多標籤 UUID 會聚合去重。

## 外部 API（fetch）

- 登入：POST `https://hitokoto.cn/api/restful/v1/auth/login`（URLSearchParams）→ `data[0].token`。
- 句子：GET `https://hitokoto.cn/api/restful/v1/hitokoto/{uuid}`（Bearer token）。
- 評分：GET `https://hitokoto.cn/api/restful/v1/hitokoto/{uuid}/score`；依規顯示 `average` 或 0。

## 專案慣例與擴充

- 保持單檔 IIFE；勿搬移檔案/目錄；`tsconfig.json` 假設 `outDir: "."`。
- 嚴格沿用選取器與切分規則：`body > ...`、UUID 以逗號/空白切分、`text-meta` 為逐行 CSV-like。
- 新增環境變數時，務必在 `build.mts` 的 `defs` 名單補 key，並透過 `resolveCredential(name)` 取值。
- `test.http` 含 login/quote/score 範例；型別位於 `api/*.d.ts`。

若實作與本檔出現出入（API 或標籤格式變更），請優先更新本檔以對齊程式行為。
