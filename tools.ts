//#region Helpers
/**
 * 產生 APA 風格 title。
 * 注意：若 from_who 未提供將字面呈現 "undefined"，維持既有行為；
 * 呼叫端（如 TextMeta）會自行套預設值避免此狀況。
 */
export function computeTitle(from: string, from_who?: string): string {
  // APA格式
  return `${from_who}(n.d.).${from}.`;
}

/**
 * 將節點插入於目標之後。WHY：自訂元素維持 hidden 只做資料容器，
 * 真正渲染結果插在其後以符合專案「渲染結果不在元素內部」的慣例。
 */
export function insertAfter(target: Node, node: Node) {
  target.parentNode?.insertBefore(node, target.nextSibling);
}

export function randomUUID(): string {
  const g = globalThis as any;

  // 原生支援（最佳路徑）
  if (g.crypto?.randomUUID) {
    return g.crypto.randomUUID();
  }

  // 使用安全隨機值
  const bytes: Uint8Array = g.crypto?.getRandomValues
    ? g.crypto.getRandomValues(new Uint8Array(16))
    : (() => {
        // 最後退回：非安全隨機，但可用於無 crypto 的環境
        const arr = new Uint8Array(16);
        for (let i = 0; i < 16; i++) arr[i] = Math.trunc(Math.random() * 256);
        return arr;
      })();

  // 設定版本與變體位元（RFC 4122 v4）
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push((bytes[i] + 0x100).toString(16).slice(1));
  }

  // 8-4-4-4-12
  return (
    hex[0] +
    hex[1] +
    hex[2] +
    hex[3] +
    "-" +
    hex[4] +
    hex[5] +
    "-" +
    hex[6] +
    hex[7] +
    "-" +
    hex[8] +
    hex[9] +
    "-" +
    hex[10] +
    hex[11] +
    hex[12] +
    hex[13] +
    hex[14] +
    hex[15]
  );
}
/**
 * 根據 data-from_uuid 清除由自訂元素渲染出的節點。
 * WHY: 兩個元件皆有相同清理流程，抽成共用以避免重複。
 */
export function removeByFromUUID(uuid?: string) {
  if (!uuid) return;
  for (const e of Array.from(
    document.querySelectorAll(`[data-from_uuid="${uuid}"]`),
  )) {
    e.remove();
  }
}
/**
 * 建立一個 blockquote，內含一個顯示文字的 div，並設定 cite/title。
 * 傳回 root 與 div 以便呼叫端後續附加（例如分數 <sub>）。
 */
export function createQuote(
  text: string,
  from: string,
  from_who?: string,
  cite?: string,
): { root: HTMLQuoteElement; div: HTMLDivElement } {
  const root = document.createElement("blockquote");
  if (cite) root.cite = cite;
  root.title = computeTitle(from, from_who);

  const div = document.createElement("div");
  div.textContent = text;
  root.appendChild(div);

  return { root, div };
}
//#endregion
