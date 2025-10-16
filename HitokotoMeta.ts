import {
  insertAfter,
  randomUUID,
  removeByFromUUID,
  createQuote,
} from "./tools";

// WHY: 認證值透過 build-time define 注入，但仍允許在執行期從 globalThis / process.env 取得，
// 以便在不同佈署與測試情境下保持同一程式碼路徑。
// SECURITY: 不在前端長期保存 token；每次載入時動態登入取得，並僅用於當次請求。
// FALLBACK: 若任一認證缺失，直接跳過遠端流程，避免半套設定造成的錯誤/重試風暴。
/** 認證常數（build-time define 可注入，執行期亦可從 global 環境取得） */
declare const HITOKOTO_EMAIL: string | undefined;
declare const HITOKOTO_PASSWORD: string | undefined;

/** WHY: 在瀏覽器與 Node 測試環境皆可取得相同設定，降低環境耦合。 */
function resolveCredential(name: string): string | undefined {
  // 允許從 globalThis 動態存取
  const injected = (globalThis as any)[name];
  // Node / 測試環境
  const fromProcess =
    typeof process === "undefined" ? undefined : process.env?.[name];
  switch (name) {
    case "HITOKOTO_EMAIL":
      return HITOKOTO_EMAIL ?? (injected || fromProcess);
    case "HITOKOTO_PASSWORD":
      return HITOKOTO_PASSWORD ?? (injected || fromProcess);
    default:
      return injected || fromProcess;
  }
}

class HitokotoMeta extends HTMLElement {
  disconnectedCallback() {
    // WHY: 透過 data-from_uuid 標記與清除，避免重複內容與記憶體洩漏。
    removeByFromUUID(this.dataset.uuid);
  }

  email: string;
  password: string;
  constructor() {
    super();
    this.email = resolveCredential("HITOKOTO_EMAIL")!;
    this.password = resolveCredential("HITOKOTO_PASSWORD")!;
  }
  connectedCallback() {
    // WHY: 與 <text-meta> 相同，本元素只作為資料容器與插入錨點，
    // 實際渲染內容插在元素後方，維持一致的清理/追蹤策略。
    this.hidden = true;
    this.dataset.uuid = randomUUID();

    this.process_hitokoto_data();
  }
  public get id_collection() {
    const m = new Set<string>();
    for (const value of this.innerText.trim().split(/,|\s/g)) {
      const v = value.trim();
      if (v) m.add(v);
    }
    return m;
  }
  public set id_collection(value) {
    this.innerText = Array.from(value).join(",");
    // RE-RENDER: 更新原始資料後，先清，後渲染。
    removeByFromUUID(this.dataset.uuid);
    this.process_hitokoto_data();
  }

  private async process_hitokoto_data() {
    if (!this.email || !this.password) {
      console.warn(
        "[hitokoto] 缺少授權帳密: 請以環境變數 HITOKOTO_EMAIL / HITOKOTO_PASSWORD 在 build 時注入",
      );
      return;
    }
    // 清理舊內容，避免重複渲染
    removeByFromUUID(this.dataset.uuid);
    const token = await loginAndGetToken(this.email, this.password);
    const promises: Promise<HTMLQuoteElement | void>[] = [];
    for (const hid of this.id_collection) {
      promises.push(
        fetchAndRenderHitokoto(hid, token).catch((err) => {
          console.error("[hitokoto] fetch uuid failed", hid, err);
        }),
      );
    }

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
  // WHY: 使用 URLSearchParams 傳輸表單欄位，配合官方登入端點。
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
  // WHY: 先取得句子本體再查詢評分；避免在評分 API 出錯時阻塞主要內容。
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
      const { root, div } = createQuote(
        data.hitokoto,
        data.from,
        data.from_who,
        `https://hitokoto.cn/?uuid=${uuid}`,
      );

      // NOTE: 之後補上評分。若評分 API 回覆句子不存在且 status === -1，按照規則顯示 0。
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
