import { build } from "esbuild";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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

const env = { ...process.env, ...loadEnv() };
const defs: Record<string, string> = {};
["HITOKOTO_EMAIL", "HITOKOTO_PASSWORD"].forEach((k) => {
  if (env[k]) {
    defs[k] = JSON.stringify(env[k]);
  }
});

const watch = process.argv.includes("--watch");

build({
  entryPoints: ["main.ts"],
  outfile: "main.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  sourcemap: true,
  define: defs,
  logLevel: "info",
})
  .then(() => {
    if (watch) {
      console.log("[build] watch mode (要重新編譯請修改檔案)");
    } else {
      console.log("[build] done");
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
