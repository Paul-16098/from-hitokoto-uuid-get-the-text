import { computeTitle, insertAfter, randomUUID } from "./tools";

/**
 * <text-meta>：以逐行 CSV-like 文字定義句子集合，渲染為多個 blockquote。
 * 行格式：text, from_who, from, cite
 * 預設值：from_who=「佚名」、from=「未知」。
 * 渲染規則：自訂元素本身 hidden，結果插入在該元素後方。
 */
class TextMeta extends HTMLElement {
  // 僅在內容文字變動時重繪
  static readonly observedAttributes = ["innerText"];
  attributeChangedCallback() {
    // 清除舊渲染（由本元件產生，透過 data-from_uuid 辨識）
    document
      .querySelectorAll(`[data-from_uuid="${this.dataset.uuid}"]`)
      .forEach((e) => e.remove());
    this.render_text_collection();
  }
  disconnectedCallback() {
    document
      .querySelectorAll(`[data-from_uuid="${this.dataset.uuid}"]`)
      .forEach((e) => e.remove());
  }

  connectedCallback() {
    // 自身僅作為資料容器與插入錨點
    this.hidden = true;
    this.dataset.uuid = randomUUID();

    this.render_text_collection();
  }
  public get text_collection() {
    let v: Array<{
      text: string;
      from: string;
      from_who: string;
      cite: string;
    }> = [];
    this.innerText
      .trim()
      .split("\n")
      .forEach((value) => {
        let [text, from_who, from, cite] = value
          .split(",")
          .map((s) => s?.trim());
        if (!text) {
          return;
        }
        if (!from_who || from_who === "" || from_who === String(undefined)) {
          from_who = "佚名";
        }
        if (!from || from === "" || from === String(undefined)) {
          from = "未知";
        }

        v.push({ text, from_who, from, cite });
      });
    return v;
  }
  public set text_collection(
    v: Array<{ text: string; from: string; from_who?: string; cite?: string }>,
  ) {
    let s = "";
    v.forEach((v) => {
      if (!v.text) {
        throw Error(
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
          throw Error(`Invalid cite URL: "${v.cite}". Reason: ${error}`);
        }
        s += v.cite;
      }
      s += "\n";
    });
    this.innerText = s;
  }
  /** 批次渲染以降低重排成本，插入點為當前元素之後。 */
  private render_text_collection() {
    // 將渲染結果插入在本元素之後，而非元素內部
    const frag = document.createDocumentFragment();

    this.text_collection.forEach((value, i) => {
      const root = document.createElement("blockquote");
      root.dataset.from_uuid = this.dataset.uuid;
      root.dataset.from_index = i.toString();
      const div = document.createElement("div");
      div.textContent = value.text;
      root.appendChild(div);
      root.title = computeTitle(value.from, value.from_who);
      if (value.cite) root.cite = value.cite;

      frag.appendChild(root);
    });
    if (this.parentNode) insertAfter(this, frag);
  }
}
customElements.define("text-meta", TextMeta);
