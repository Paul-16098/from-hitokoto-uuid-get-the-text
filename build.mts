import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// 簡易 .env 讀取 (只支援 KEY=VALUE 無引號)
function loadEnv() {
  const envPath = resolve("./.env");
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  const obj: Record<string, string> = {};
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    obj[key] = val;
  }
  return obj;
}

// WHY: 允許從 .env 與系統環境變數讀取機敏設定，並以 define 注入到瀏覽器端程式碼，
// 以維持「無 runtime 相依」但可在 build 階段提供憑證的模式。
const env = { ...process.env, ...loadEnv() };
const defs: Record<string, string> = {};
for (const key of ["HITOKOTO_EMAIL", "HITOKOTO_PASSWORD"]) {
  if (env[key]) {
    defs[key] = JSON.stringify(env[key]);
  }
}

(async () => {
  try {
    await build({
      entryPoints: ["./main.ts", "./TextMeta.ts", "./HitokotoMeta.ts"],
      outdir: ".",
      bundle: true,
      // WHY: 產出多個 IIFE，避免對模組載入器的相依，直接以 <script src> 引用即可。
      format: "iife",
      minify: true,
      platform: "browser",
      target: "ESNext", // NOTE: 需在現代瀏覽器環境執行；若需更廣泛支援，可下調目標。
      sourcemap: true,
      define: defs,
      logLevel: "info",
    });
    console.log("[build] done");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
