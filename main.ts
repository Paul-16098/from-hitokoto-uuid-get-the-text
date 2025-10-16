// WHY: 入口僅註冊自訂元素而不做任何全域 orchestrator。
// 好處：
// - 元素各自以 connectedCallback 決定何時渲染、何處插入（維持「插在元素後方」的既有模式）。
// - 保持極簡、無框架、無 runtime 相依；任何頁面只需引用 iife 輸出檔與這個入口即可。
import "./HitokotoMeta";
import "./TextMeta";
