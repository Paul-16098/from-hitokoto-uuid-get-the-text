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

function loginAndGetToken(email: string, password: string): Promise<string> {
  return fetch("https://hitokoto.cn/api/restful/v1/auth/login", {
    method: "POST",
    body: new URLSearchParams({ email, password }),
  })
    .then((r) => r.json())
    .then((d: auth_login) => d.data[0].token);
}

function fetchAndRenderHitokoto(uuid: string, token: string) {
  return fetch(`https://hitokoto.cn/api/restful/v1/hitokoto/${uuid}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((r) => r.json())
    .then((d: hitokoto_uuid) => {
      const data = d.data[0];
      let root = document.createElement("blockquote");
      root.cite = `https://hitokoto.cn/?uuid=${uuid}`;
      let fromDisplay: string;
      if (data.from) {
        fromDisplay = data.from_who
          ? `${data.from}(${data.from_who})`
          : data.from;
      } else {
        fromDisplay = "无名氏";
      }

      // 先渲染，後補加上評分避免未賦值使用
      root.innerHTML = `<div>${data.hitokoto}  —— 「${fromDisplay}」</div>`;
      document.querySelector("body > hitokoto-meta")!.after(root);

      fetch(`https://hitokoto.cn/api/restful/v1/hitokoto/${uuid}/score`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((r) => r.json())
        .then((scoreResp) => {
          const average: number | undefined =
            scoreResp.data?.[0]?.score?.average;
          if (typeof average === "number") {
            const div = root.querySelector("div");
            if (div) {
              const sub = document.createElement("sub");
              sub.textContent = String(average);
              div.appendChild(sub);
            }
          } else if (
            scoreResp.message === "很抱歉，句子不存在或评分未创建" &&
            scoreResp.status === -1
          ) {
            const div = root.querySelector("div");
            if (div) {
              const sub = document.createElement("sub");
              sub.textContent = "0";
              div.appendChild(sub);
            }
          } else {
            console.error(scoreResp);
          }
        });
    });
}

function hitokoto_main() {
  const hitokoto_meta: string[] = [];
  document
    .querySelectorAll<HTMLElement>("body > hitokoto-meta")
    .forEach((e) => {
      e.innerText
        .trim()
        .split(/,|\s/g)
        .forEach((value: string) => {
          const v = value.trim();
          if (v) hitokoto_meta.push(v);
        });
    });
  if (!hitokoto_meta.length) return;

  const email = resolveCredential("HITOKOTO_EMAIL");
  const password = resolveCredential("HITOKOTO_PASSWORD");
  if (!email || !password) {
    console.warn(
      "[hitokoto] 缺少授權帳密: 請以環境變數 HITOKOTO_EMAIL / HITOKOTO_PASSWORD 在 build 時注入",
    );
    return;
  }

  loginAndGetToken(email, password)
    .then((token) => {
      console.debug("[hitokoto] token acquired");
      return Promise.all(
        hitokoto_meta.map((uuid) =>
          fetchAndRenderHitokoto(uuid, token).catch((err) => {
            console.error("[hitokoto] fetch uuid failed", uuid, err);
          }),
        ),
      );
    })
    .catch((err) => {
      console.error("[hitokoto] login failed", err);
    });
}
function text_main() {
  document.querySelectorAll<HTMLElement>("body > text-meta").forEach((e) => {
    e.innerText
      .trim()
      .split("\n")
      .forEach((value) => {
        let [text, from = "无名氏", from_who, cite = undefined] =
          value.split(",");
        console.log([text, from, from_who, cite]);

        let root = document.createElement("blockquote");
        let fromDisplay: string;
        if (from) {
          fromDisplay = from_who ? `${from}(${from_who})` : from;
        } else {
          fromDisplay = "无名氏";
        }
        root.innerHTML = `<div>${text}  —— 「${fromDisplay}」</div>`;
        if (cite) {
          root.cite = cite;
        }
        e.after(root);
      });
  });
}
text_main();
hitokoto_main();
