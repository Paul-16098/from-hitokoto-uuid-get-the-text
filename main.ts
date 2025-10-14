// 這些常數會在 build 時由 bundler (esbuild / Vite / etc.) 以 define 注入。
// Fallback 順序：define 注入 (globalThis) -> window 上 (若使用 script inline 設定) -> process.env (在 Node 端測試時)
declare const HITOKOTO_EMAIL: string | undefined;
declare const HITOKOTO_PASSWORD: string | undefined;

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

// ---- Helpers ----
function computeTitle(from: string, from_who?: string): string {
  const who = from_who?.trim() || from;
  return `${who}(n.d.).${from}.`;
}

function insertAfter(target: Node, node: Node) {
  target.parentNode?.insertBefore(node, target.nextSibling);
}

class TextMeta extends HTMLElement {
  connectedCallback() {
    // MDN 建議：避免在 constructor 操作 DOM 或存取父節點
    this.hidden = true;
  }
  get text_meta() {
    let v: { text: string; from: string; from_who?: string; cite?: string }[] =
      [];
    this.innerText
      .trim()
      .split("\n")
      .forEach((value) => {
        const parts = value.split(",").map((s) => s?.trim());
        const text = parts[0] ?? "";
        const from = (parts[1] ?? "无名氏").trim();
        const from_who = parts[2] ? parts[2].trim() : undefined;
        const cite = parts[3] ? parts[3].trim() : undefined;
        v.push({ text, from, from_who, cite });
      });
    return v;
  }
  set text_meta(
    v: { text: string; from: string; from_who?: string; cite?: string }[],
  ) {
    let s = "";
    v.forEach((v) => {
      s += `${v.text},${v.from}${v.from_who ? "," + v.from_who : ""}${v.cite ? "," + v.cite : ""}\n`;
    });
    this.innerText = s;
  }
  text_main() {
    // 將渲染結果插入在本元素之後，而非元素內部
    const frag = document.createDocumentFragment();
    this.text_meta.forEach((value) => {
      const root = document.createElement("blockquote");
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
class HitokotoMeta extends HTMLElement {
  connectedCallback() {
    // 僅負責狀態設定，不做資料抓取與渲染（交由全域 orchestrator）
    this.hidden = true;
  }
  get hitokoto_meta() {
    let m: string[] = [];
    this.innerText
      .trim()
      .split(/,|\s/g)
      .forEach((value: string) => {
        const v = value.trim();
        if (v) m.push(v);
      });
    return m;
  }
  set hitokoto_meta(value) {
    this.innerText = value.join(",");
  }

  hitokoto_main() {
    // 保留舊 API（不再於此插入 DOM），整合式渲染於全域 orchestrator
    if (!this.hitokoto_meta.length) return;
  }
}
customElements.define("hitokoto-meta", HitokotoMeta);

function loginAndGetToken(email: string, password: string): Promise<string> {
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

// ---- 全域 orchestrator：依規範先 text 後 hitokoto，並控制插入位置 ----
(() => {
  const run = async () => {
    // 僅處理 body 直屬子節點
    const textMetas = Array.from(document.querySelectorAll("body > text-meta"));
    textMetas.forEach((tm) => {
      if (tm instanceof TextMeta) tm.text_main();
    });

    const hitokotoMetas = Array.from(
      document.querySelectorAll("body > hitokoto-meta"),
    );
    if (!hitokotoMetas.length) return;

    // 聚合並去重，並在第一個 <hitokoto-meta> 後插入
    const seen = new Set<string>();
    const uuids: string[] = [];
    hitokotoMetas.forEach((m) => {
      if (m instanceof HitokotoMeta) {
        m.hitokoto_meta.forEach((id) => {
          if (!seen.has(id)) {
            seen.add(id);
            uuids.push(id);
          }
        });
      }
    });
    if (!uuids.length) return;

    const anchor = hitokotoMetas[0];
    const email = resolveCredential("HITOKOTO_EMAIL");
    const password = resolveCredential("HITOKOTO_PASSWORD");
    if (!email || !password) {
      console.warn(
        "[hitokoto] 缺少授權帳密: 請以環境變數 HITOKOTO_EMAIL / HITOKOTO_PASSWORD 在 build 時注入",
      );
      return;
    }

    try {
      const token = await loginAndGetToken(email, password);
      const promises = uuids.map((uuid) =>
        fetchAndRenderHitokoto(uuid, token).catch((err) => {
          console.error("[hitokoto] fetch uuid failed", uuid, err);
          return null;
        }),
      );
      const results = await Promise.all(promises);
      const frag = document.createDocumentFragment();
      for (const el of results) if (el) frag.appendChild(el);
      insertAfter(anchor, frag);
    } catch (err) {
      console.error("[hitokoto] login failed", err);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
