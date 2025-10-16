import {
  insertAfter,
  randomUUID,
  removeByFromUUID,
  createQuote,
} from "./tools";

// WHY: <text-meta> 採用「逐行 CSV-like」資料格式 (text, from_who, from, cite)
// 原因：
// - 讓內容作者能以純文字維護句子集，不依賴任何框架或 JSON 結構。
// - 保持簡單可讀，並允許以 getter/setter 在同一元素上序列化/反序列化。
// 渲染策略：
// - 元素本身 hidden，並將產生的 <blockquote> 插在「元素後方」而非元素內部，
//   以便在 disconnectedCallback 時，透過 data-from_uuid / data-from_index 明確清理。
// a11y：
// - 使用 <blockquote> 與 title/cite 傳遞出處資訊，有助於輔助科技理解內容來源。

/**
 * <text-meta>：以逐行 CSV-like 文字定義句子集合，渲染為多個 blockquote。
 * 行格式：text, from_who, from, cite
 * 預設值：from_who=「佚名」、from=「未知」。
 * 渲染規則：自訂元素本身 hidden，結果插入在該元素後方。
 */
class TextMeta extends HTMLElement {
  disconnectedCallback() {
    // WHY: 以 data-from_uuid 標記本元件產生的節點，
    // 在 DOM 移除或重渲染時能準確清理，避免殘留與重複內容。
    removeByFromUUID(this.dataset.uuid);
  }

  connectedCallback() {
    // WHY: 自身僅作為資料容器與插入錨點，將實際內容插到後方，
    // 使樣式/版位可由原始標記決定，並降低重排的影響範圍。
    this.hidden = true;
    this.dataset.uuid = randomUUID();

    this.render_text_collection();
  }
  public get text_collection() {
    // NOTE: 以 split("\n") 與 split(",") 做最小解析；
    // 若 from_who/from 缺漏，套用預設「佚名」與「未知」。
    const v: Array<{
      text: string;
      from: string;
      from_who: string;
      cite: string;
    }> = [];
    for (const value of this.innerText.trim().split("\n")) {
      let [text, from_who, from, cite] = value.split(",").map((s) => s?.trim());
      if (!text) {
        continue;
      }
      if (!from_who || from_who === "" || from_who === String(undefined)) {
        from_who = "佚名";
      }
      if (!from || from === "" || from === String(undefined)) {
        from = "未知";
      }

      v.push({ text, from_who, from, cite });
    }
    return v;
  }
  public set text_collection(
    textEntries: Array<{
      text: string;
      from: string;
      from_who?: string;
      cite?: string;
    }>,
  ) {
    // WHY: setter 以相同 CSV-like 方式回寫 innerText，便於靜態託管與版本控管。
    let s = "";
    for (const v of textEntries) {
      if (!v.text) {
        throw new Error(
          "The 'text' property is missing in the provided object for <text-meta>. Please ensure each entry includes a non-empty 'text' field.",
        );
      }
      s += v.text + ",";
      if (v.from) {
        s += v.from;
      }
      s += ",";
      if (v.from_who) {
        s += v.from_who;
      }
      s += ",";
      if (v.cite) {
        try {
          new URL(v.cite);
        } catch (error) {
          throw new Error(`Invalid cite URL: "${v.cite}". Reason: ${error}`);
        }
        s += v.cite;
      }
      s += "\n";
    }
    this.innerText = s;
    // RE-RENDER: 更新原始資料後，先清除舊內容再渲染，避免重複。
    removeByFromUUID(this.dataset.uuid);
    this.render_text_collection();
  }
  /** 批次渲染以降低重排成本，插入點為當前元素之後。 */
  private render_text_collection() {
    // WHY: 使用 DocumentFragment 聚合，再一次性插入，降低多次插入造成的重排成本。
    // 並保持插入位置在本元素後方（非內部），以符合既有清理/標記策略。
    const frag = document.createDocumentFragment();

    for (let i = 0; i < this.text_collection.length; i++) {
      const value = this.text_collection[i];
      const { root } = createQuote(
        value.text,
        value.from,
        value.from_who,
        value.cite,
      );
      root.dataset.from_uuid = this.dataset.uuid;
      root.dataset.from_index = i.toString();
      frag.appendChild(root);
    }

    if (this.parentNode) insertAfter(this, frag);
  }
}
customElements.define("text-meta", TextMeta);
