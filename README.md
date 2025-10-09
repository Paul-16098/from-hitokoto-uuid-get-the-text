# Hitokoto Renderer（從 UUID 取得一言並渲染）

一個極簡、無框架、純前端的 TypeScript 工具。它會在瀏覽器端掃描 `<body>` 下自訂標籤，將本地文字或遠端 Hitokoto 服務的一言資料渲染成 `<blockquote>`，並在可用時附上評分。

- 單一 IIFE 輸出：`main.js`
- 無執行期相依（runtime deps），只用 esbuild 打包
- 以自訂標籤作資料來源：`<text-meta>` 與 `<hitokoto-meta>`

## 技術棧

- 語言：TypeScript（嚴格模式）
- 打包：esbuild（IIFE、browser、target: ES2020、sourcemap）
- 建置腳本：`tsc` 將 `build.mts` 編譯為 `build.mjs`，再以 Node 執行
- 套件管理：建議使用 pnpm（亦支援 npm）
- 無前端框架、無執行期相依

版本（取自 `package.json`）

- typescript: ^5.5.0
- esbuild: ^0.23.0
- @types/node: ^24.6.1

## 專案架構概觀

高階流程（見 `main.ts`）：

- `<text-meta>`：逐行解析 `text,from,from_who,cite` 並立即渲染。
- `<hitokoto-meta>`：以逗號或空白分隔的 UUID 清單；
  1. 使用 `HITOKOTO_EMAIL`/`HITOKOTO_PASSWORD` 登入取得 token，
  2. 依序呼叫 `/hitokoto/{uuid}` 與 `/hitokoto/{uuid}/score`，
  3. 在來源標籤之後插入 `<blockquote>`，若有平均分數則以 `<sub>` 附註。

執行順序：先 `text_main()`，後 `hitokoto_main()`（順序很重要）。

資料流示意：

```text
<body>
  <text-meta>...本地文字...</text-meta>
  <hitokoto-meta>uuid1, uuid2 ...</hitokoto-meta>
</body>
        │                      │
        ▼                      ▼
   text_main()           hitokoto_main()
        │                      │
 render blockquote   login → fetch quote → fetch score
        │                      │
   <blockquote>           <blockquote><sub>score</sub>
```

## 快速開始（Getting Started）

### 先決條件

- Node.js（建議 18+）
- pnpm（建議）或 npm

### 安裝與建置

```powershell
# 安裝相依
pnpm install

# 一次性建置（輸出 main.js / main.js.map）
pnpm run build

# 監看模式（檔案變更自動重編譯）
pnpm run dev
```

### Hitokoto 認證設定

工具不會硬編碼帳密。建置時請提供環境變數：

- `HITOKOTO_EMAIL`
- `HITOKOTO_PASSWORD`

支援的注入方式（`main.ts` 解析優先序）：

1. 由 esbuild define 注入（透過 `.env` 或 shell 環境，`build.mts` 會讀取並以 define 傳入）
2. 於瀏覽器端在載入 `main.js` 前設定 `globalThis[NAME]`（例如 `window.HITOKOTO_EMAIL`）
3. `process.env[NAME]`（主要給 Node 端測試使用）

範例 `.env`（於專案根目錄）：

```dotenv
HITOKOTO_EMAIL=your-email@example.com
HITOKOTO_PASSWORD=your-password
```

### 在 HTML 中使用

將編譯後的 `main.js` 以 `<script>` 引入，並放置資料標籤於 `<body>` 直屬子節點。

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Hitokoto Demo</title>
    <!-- 可選：於瀏覽器端直接注入帳密（用於不經 build 的快速測試） -->
    <script>
      window.HITOKOTO_EMAIL = "your-email@example.com";
      window.HITOKOTO_PASSWORD = "your-password";
    </script>
    <script src="./main.js"></script>
  </head>
  <body>
    <!-- 本地文字（每一行：text,from,from_who,cite） -->
    <text-meta>
      在遠方，朝陽正好,無名氏,,https://example.com 我亦無他，惟手熟爾,韓愈,,
    </text-meta>

    <!-- Hitokoto UUID 清單（逗號或空白分隔） -->
    <hitokoto-meta>
      0d7ef1a8-b8b8-4b3b-b0b2-aaaaaaaaaaaa, bbbbbbbb-cccc-dddd-eeee-ffffffffffff
    </hitokoto-meta>
  </body>
</html>
```

渲染規則與習慣：

- 資料標籤不直接顯示；對應的 `<blockquote>` 會插在該標籤之後（使用 `Element.after(...)`）。
- 引用行模板：`{text} —— 「{from 或 無名氏}({from_who?})」`。
- 若有 `cite` 會設為 `<blockquote>.cite`。
- 命中評分 API 會以 `<sub>` 顯示平均分數；若「句子不存在或評分未建立」，則視為 0。

## 專案結構

```text
.
├─ .github/
│  └─ copilot-instructions.md     # 開發／擴充規範與工作流說明
├─ build.mts                       # esbuild 驅動（由 tsc 轉成 build.mjs 執行）
├─ build.mjs                       # 由 build.mts 轉譯產生
├─ main.ts                         # 入口原始碼（打包輸出 main.js）
├─ main.js                         # 瀏覽器直接引入的 IIFE bundle
├─ main.js.map                     # sourcemap
├─ tsconfig.json                   # TypeScript 設定（strict、outDir: "."）
├─ package.json                    # 指令與開發相依
├─ pnpm-lock.yaml                  # pnpm 鎖定檔
└─ test.http                       # 手動 API 測試（若需要）
```

## 主要功能（Key Features）

- 以 `<text-meta>` 渲染本地一言資料（CSV-like：`text,from,from_who,cite`）。
- 以 `<hitokoto-meta>` 讀取 UUID，登入後呼叫 Hitokoto 介面拉取句子與評分並渲染。
- 單檔 IIFE 輸出，無框架、無 runtime 依賴，直接以 `<script>` 引入即可。
- 環境變數彈性注入（define / globalThis / process.env）。
- 價值安全的預設：缺 `from` 時以「无名氏」顯示；評分介面未建立時顯示 0。

## 開發流程（Workflow）

- 指令：
  - `pnpm run build`：`tsc ./build.mts && node ./build.mjs`
  - `pnpm run dev`：同上並加 `--watch`（增量編譯）
- 打包配置（見 `build.mts`）：`format: iife`、`platform: browser`、`target: es2020`、`sourcemap: true`。
- 環境注入：`build.mts` 會讀取 `.env` 與 `process.env` 的 `HITOKOTO_EMAIL`／`HITOKOTO_PASSWORD`，以 esbuild `define` 傳入。
- 變更準則：保持小步修改、維持單一 IIFE、勿引入重量級框架或搬動檔案位置。

## 編碼規範（Coding Standards）

- DOM 掛載點：只選取 `<body>` 直屬的 `hitokoto-meta` 與 `text-meta`。
- 解析規則：
  - `hitokoto-meta` 以逗號或空白分隔 UUID。
  - `text-meta` 逐行切分為 `text,from,from_who,cite`。
- 渲染規範：一定建立 `<blockquote>`，若給定 `cite` 必須設定；插入位置在來源標籤之後。
- 程式碼風格：維持 TypeScript 嚴格模式，字串與 UI 文案保持最小化；本庫有 zh-CN 的回退文案（例如「无名氏」）。
- 擴充點：若新增環境變數，請在 `build.mts` 的 `defs` 陣列補上 key，並於 `main.ts` 經由 `resolveCredential(name)` 讀取。

## 測試（Testing）

- 本專案未附自動化測試範例。建議建立一個靜態 HTML 頁面進行人工驗證：
  1. 於 `.env` 設定有效的 `HITOKOTO_EMAIL`/`HITOKOTO_PASSWORD`。
  2. `pnpm run build` 產生 `main.js`。
  3. 以瀏覽器開啟含 `text-meta` 與（或）`hitokoto-meta` 的測試頁，檢視 `<blockquote>` 是否正確渲染及分數附註。

## 貢獻（Contributing）

- 請遵循 `.github/copilot-instructions.md` 中的在地規範：
  - 維持單一 IIFE 輸出、避免引入大型框架或變更檔案布局。
  - 依既有 DOM 解析與渲染模式擴充，確保 `<blockquote>` 插入點與屬性一致。
  - 小步前進、保守修改；字串與 UI 保持極簡。
- 提交 PR 前，請確認可成功建置並於瀏覽器完成基本 smoke test。

—

如發現文件與實作不一致（API 變動、標籤格式調整等），歡迎開 Issue 指正，以便同步更新說明。
