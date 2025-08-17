"use strict";
let hitokoto_meta = document.querySelector("body > hitokoto-meta").innerText
    .trim()
    .split(/,|\s/g)
    .map((value) => {
    return value.trim();
});
if (hitokoto_meta.length !== 0) {
    fetch("https://hitokoto.cn/api/restful/v1/auth/login", {
        method: "POST",
        body: new URLSearchParams({
            email: "...",
            password: "...",
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
        document.querySelector("body > hitokoto-meta").remove();
    });
}
//# sourceMappingURL=main.js.map