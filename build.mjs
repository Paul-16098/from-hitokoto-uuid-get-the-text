var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { build } from "esbuild";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
// 簡易 .env 讀取 (只支援 KEY=VALUE 無引號)
function loadEnv() {
    var envPath = resolve("./.env");
    if (!existsSync(envPath))
        return {};
    var lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    var obj = {};
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        if (!line || line.startsWith("#"))
            continue;
        var idx = line.indexOf("=");
        if (idx === -1)
            continue;
        var key = line.slice(0, idx).trim();
        var val = line.slice(idx + 1).trim();
        obj[key] = val;
    }
    return obj;
}
var env = __assign(__assign({}, process.env), loadEnv());
var defs = {};
["HITOKOTO_EMAIL", "HITOKOTO_PASSWORD"].forEach(function (k) {
    if (env[k]) {
        defs[k] = JSON.stringify(env[k]);
    }
});
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
    .then(function () {
    console.log("[build] done");
})
    .catch(function (e) {
    console.error(e);
    process.exit(1);
});
