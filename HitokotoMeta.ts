import { computeTitle, insertAfter, randomUUID } from "./tools";

// 這些常數會在 build 時由 bundler (esbuild / Vite / etc.) 以 define 注入。
// Fallback 順序：define 注入 (globalThis) -> window 上 (若使用 script inline 設定) -> process.env (在 Node 端測試時)
/**
 * 認證常數說明：
 * - 值會在 build 時以 define 注入，亦允許於執行期從 globalThis 或 process.env 取得。
 * - 若任一缺失，將略過遠端一言流程，只渲染本地 <text-meta>。
 */
declare const HITOKOTO_EMAIL: string | undefined;
declare const HITOKOTO_PASSWORD: string | undefined;

/** 解析認證值。WHY：在瀏覽器與 Node 測試環境皆可取到相同設定，降低環境耦合。 */
function resolveCredential(name: string): string | undefined {
  // 允許從 globalThis 動態存取
  const injected = (globalThis as any)[name];
  // Node / 測試環境
  const fromProcess =
    typeof process !== "undefined" ? process.env?.[name] : undefined;
  switch (name) {
    case "HITOKOTO_EMAIL":
      return typeof HITOKOTO_EMAIL !== "undefined"
        ? HITOKOTO_EMAIL
        : injected || fromProcess;
    case "HITOKOTO_PASSWORD":
      return typeof HITOKOTO_PASSWORD !== "undefined"
        ? HITOKOTO_PASSWORD
        : injected || fromProcess;
    default:
      return injected || fromProcess;
  }
}

class HitokotoMeta extends HTMLElement {
  static readonly observedAttributes = ["innerText"];
  attributeChangedCallback() {
    // 清除舊渲染（由本元件產生，透過 data-from_uuid 辨識）
    document
      .querySelectorAll(`[data-from_uuid="${this.dataset.uuid}"]`)
      .forEach((e) => e.remove());
    this.process_hitokoto_data();
  }
  disconnectedCallback() {
    document
      .querySelectorAll(`[data-from_uuid="${this.dataset.uuid}"]`)
      .forEach((e) => e.remove());
  }

  email: string;
  password: string;
  constructor() {
    super();
    this.email = resolveCredential("HITOKOTO_EMAIL")!;
    this.password = resolveCredential("HITOKOTO_PASSWORD")!;
  }
  connectedCallback() {
    // 與 <text-meta> 同理：標籤為資料容器，不直接渲染內容
    this.hidden = true;
    this.dataset.uuid = randomUUID();

    this.process_hitokoto_data();
  }
  public get id_collection() {
    let m: Set<string> = new Set();
    this.innerText
      .trim()
      .split(/,|\s/g)
      .forEach((value: string) => {
        const v = value.trim();
        if (v) m.add(v);
      });
    return m;
  }
  public set id_collection(value) {
    this.innerText = Array.from(value).join(",");
  }

  private async process_hitokoto_data() {
    if (!this.email || !this.password) {
      console.warn(
        "[hitokoto] 缺少授權帳密: 請以環境變數 HITOKOTO_EMAIL / HITOKOTO_PASSWORD 在 build 時注入",
      );
      return;
    }
    const token = await loginAndGetToken(this.email, this.password);
    const promises: Promise<HTMLQuoteElement | void>[] = [];
    this.id_collection.forEach(async (hid) => {
      promises.push(
        fetchAndRenderHitokoto(hid, token).catch((err) => {
          console.error("[hitokoto] fetch uuid failed", hid, err);
        }),
      );
    });

    const results = await Promise.all(promises);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < results.length; i++) {
      const el = results[i];
      if (el) {
        el.dataset.from_uuid = this.dataset.uuid;
        el.dataset.from_index = i.toString();
        frag.appendChild(el);
      }
    }
    insertAfter(this, frag);
  }
}
customElements.define("hitokoto-meta", HitokotoMeta);

//#region hitokoto
function loginAndGetToken(email: string, password: string): Promise<string> {
  // 外部 API：POST /auth/login（URLSearchParams）
  return fetch("https://hitokoto.cn/api/restful/v1/auth/login", {
    method: "POST",
    body: new URLSearchParams({ email, password }),
  })
    .then((r) => {
      if (!r.ok) throw new Error(`login http ${r.status}`);
      return r.json();
    })
    .then((d: auth_login) => d.data[0].token);
}

function fetchAndRenderHitokoto(
  uuid: string,
  token: string,
): Promise<HTMLQuoteElement> {
  // 外部 API：GET /hitokoto/{uuid}
  return fetch(`https://hitokoto.cn/api/restful/v1/hitokoto/${uuid}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((r) => {
      if (!r.ok) throw new Error(`hitokoto http ${r.status}`);
      return r.json();
    })
    .then((d: hitokoto_uuid) => {
      const data = d.data[0];
      let root = document.createElement("blockquote");
      root.cite = `https://hitokoto.cn/?uuid=${uuid}`;

      // 先渲染，後補加上評分避免未賦值使用
      const div = document.createElement("div");
      div.textContent = data.hitokoto;
      root.appendChild(div);
      root.title = computeTitle(data.from, data.from_who);

      // 外部 API：GET /hitokoto/{uuid}/score
      return fetch(
        `https://hitokoto.cn/api/restful/v1/hitokoto/${uuid}/score`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      )
        .then((r) => {
          if (!r.ok) throw new Error(`score http ${r.status}`);
          return r.json();
        })
        .then((scoreResp: hitokoto_uuid_score) => {
          const score = scoreResp?.data[0]?.score;
          if (score) {
            const sub = document.createElement("sub");
            sub.textContent = String(score.average);
            sub.title = `total:${score.total}\nparticipants:${score.participants}`;
            div.appendChild(sub);
          } else if (
            scoreResp.message === "很抱歉，句子不存在或评分未创建" &&
            scoreResp.status === -1
          ) {
            if (div) {
              const sub = document.createElement("sub");
              sub.textContent = "0";
              sub.title = `total:0\nparticipants:0`;
              div.appendChild(sub);
            }
          } else {
            console.error(scoreResp);
          }
          return root;
        });
    });
}
//#endregion
