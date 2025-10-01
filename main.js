"use strict";
(() => {
  // main.ts
  function resolveCredential(name) {
    const injected = globalThis[name];
    const fromProcess = typeof process !== "undefined" ? process.env?.[name] : void 0;
    switch (name) {
      case "HITOKOTO_EMAIL":
        return true ? "your-email@example.com" : injected || fromProcess;
      case "HITOKOTO_PASSWORD":
        return true ? "your-password" : injected || fromProcess;
      default:
        return injected || fromProcess;
    }
  }
  function loginAndGetToken(email, password) {
    return fetch("https://hitokoto.cn/api/restful/v1/auth/login", {
      method: "POST",
      body: new URLSearchParams({ email, password })
    }).then((r) => r.json()).then((d) => d.data[0].token);
  }
  function fetchAndRenderHitokoto(uuid, token) {
    return fetch(
      `https://hitokoto.cn/api/restful/v1/hitokoto/${uuid}?token=${token}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `bearer ${token}`
        }
      }
    ).then((r) => r.json()).then((d) => {
      const data = d.data[0];
      let root = document.createElement("blockquote");
      root.cite = `https://hitokoto.cn/?uuid=${uuid}`;
      let fromDisplay;
      if (data.from) {
        fromDisplay = data.from_who ? `${data.from}(${data.from_who})` : data.from;
      } else {
        fromDisplay = "\u65E0\u540D\u6C0F";
      }
      root.innerHTML = `<div>${data.hitokoto}  \u2014\u2014 \u300C${fromDisplay}\u300D</div>`;
      document.querySelector("body > hitokoto-meta").after(root);
    });
  }
  function hitokoto_main() {
    const hitokoto_meta = [];
    document.querySelectorAll("body > hitokoto-meta").forEach((e) => {
      e.innerText.trim().split(/,|\s/g).forEach((value) => {
        const v = value.trim();
        if (v) hitokoto_meta.push(v);
      });
    });
    if (!hitokoto_meta.length) return;
    const email = resolveCredential("HITOKOTO_EMAIL");
    const password = resolveCredential("HITOKOTO_PASSWORD");
    if (!email || !password) {
      console.warn(
        "[hitokoto] \u7F3A\u5C11\u6388\u6B0A\u5E33\u5BC6: \u8ACB\u4EE5\u74B0\u5883\u8B8A\u6578 HITOKOTO_EMAIL / HITOKOTO_PASSWORD \u5728 build \u6642\u6CE8\u5165"
      );
      return;
    }
    loginAndGetToken(email, password).then((token) => {
      console.debug("[hitokoto] token acquired");
      return Promise.all(
        hitokoto_meta.map(
          (uuid) => fetchAndRenderHitokoto(uuid, token).catch((err) => {
            console.error("[hitokoto] fetch uuid failed", uuid, err);
          })
        )
      );
    }).catch((err) => {
      console.error("[hitokoto] login failed", err);
    });
  }
  function text_main() {
    document.querySelectorAll("body > text-meta").forEach((e) => {
      e.innerText.trim().split("\n").forEach((value) => {
        let [text, from = "\u65E0\u540D\u6C0F", from_who, cite = void 0] = value.split(",");
        console.log([text, from, from_who, cite]);
        let root = document.createElement("blockquote");
        let fromDisplay;
        if (from) {
          fromDisplay = from_who ? `${from}(${from_who})` : from;
        } else {
          fromDisplay = "\u65E0\u540D\u6C0F";
        }
        root.innerHTML = `<div>${text}  \u2014\u2014 \u300C${fromDisplay}\u300D</div>`;
        if (cite) {
          root.cite = cite;
        }
        e.after(root);
      });
    });
  }
  text_main();
  hitokoto_main();
})();
//# sourceMappingURL=main.js.map
