let hitokoto_meta = (
  document.querySelector("body > hitokoto-meta") as HTMLElement
).innerText
  .trim()
  .split(/,|\s/g)
  .map((value: string) => {
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
    .then((d: auth_login) => {
      return d.data[0].token;
    })
    .then((T) => {
      console.debug("T=", T);
      hitokoto_meta.forEach((uuid: string) => {
        fetch(
          `https://hitokoto.cn/api/restful/v1/hitokoto/${uuid}?token=${T}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `bearer ${T}`,
            },
          }
        )
          .then((response) => response.json())
          .then((d: hitokoto_uuid) => {
            const data = d.data[0];
            console.debug(data);
            let root = document.createElement("blockquote");
            root.cite = `https://hitokoto.cn/?uuid=${uuid}`;

            root.innerHTML = `
          <div>${data.hitokoto}  —— 「${
              !!data.from
                ? data.from_who
                  ? `${data.from}(${data.from_who})`
                  : data.from
                : "无名氏"
            }」</div>
`;
            document.querySelector("body > hitokoto-meta")!.after(root);
          })
          .catch(console.error);
      });
      document.querySelector("body > hitokoto-meta")!.remove();
    });
}
