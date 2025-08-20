"use strict";
function hitokoto_main() {
    const hitokoto_meta = document.querySelector("body > hitokoto-meta")?.innerText
        .trim()
        .split(/,|\s/g)
        .map((value) => {
        return value.trim();
    });
    if (hitokoto_meta && hitokoto_meta.length !== 0) {
        fetch("https://hitokoto.cn/api/restful/v1/auth/login", {
            method: "POST",
            body: new URLSearchParams({
                email: "pl816098@gmail.com",
                password: "Paul1234Paul",
            }),
        })
            .then((response) => response.json())
            .then((d) => {
            return d.data[0].token;
        })
            .then((T) => {
            console.debug("T=", T);
            hitokoto_meta.forEach((uuid) => {
                fetch(`https://hitokoto.cn/api/restful/v1/hitokoto/${uuid}?token=${T}`, {
                    headers: {
                        Accept: "application/json",
                        Authorization: `bearer ${T}`,
                    },
                })
                    .then((response) => response.json())
                    .then((d) => {
                    const data = d.data[0];
                    console.debug(data);
                    let root = document.createElement("blockquote");
                    root.cite = `https://hitokoto.cn/?uuid=${uuid}`;
                    root.innerHTML = `
          <div>${data.hitokoto}  —— 「${!!data.from
                        ? data.from_who
                            ? `${data.from}(${data.from_who})`
                            : data.from
                        : "无名氏"}」</div>
`;
                    document.querySelector("body > hitokoto-meta").after(root);
                })
                    .catch(console.error);
            });
        });
    }
}
function text_main() {
    document.querySelector("body > text-meta")?.innerText
        .trim()
        .split("\n")
        .map((value) => {
        let text, from = "无名氏", from_who;
        [text, from, from_who] = value.split(",");
        console.log([text, from, from_who]);
        let root = document.createElement("blockquote");
        root.innerHTML = `
          <div>${text}  —— 「${!!from ? (from_who ? `${from}(${from_who})` : from) : "无名氏"}」</div>
`;
        document.querySelector("body > text-meta").after(root);
    });
}
text_main();
hitokoto_main();
//# sourceMappingURL=main.js.map