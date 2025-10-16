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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
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
// WHY: 允許從 .env 與系統環境變數讀取機敏設定，並以 define 注入到瀏覽器端程式碼，
// 以維持「無 runtime 相依」但可在 build 階段提供憑證的模式。
var env = __assign(__assign({}, process.env), loadEnv());
var defs = {};
for (var _i = 0, _a = ["HITOKOTO_EMAIL", "HITOKOTO_PASSWORD"]; _i < _a.length; _i++) {
    var key = _a[_i];
    if (env[key]) {
        defs[key] = JSON.stringify(env[key]);
    }
}
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, build({
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
                    })];
            case 1:
                _a.sent();
                console.log("[build] done");
                return [3 /*break*/, 3];
            case 2:
                e_1 = _a.sent();
                console.error(e_1);
                process.exit(1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); })();
