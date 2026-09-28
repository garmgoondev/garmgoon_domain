// 웹 푸시용 VAPID 키 한 쌍을 만든다. 출력된 값을 secret으로 넣는다.
//   npx wrangler secret put VAPID_PUBLIC_KEY
//   npx wrangler secret put VAPID_PRIVATE_KEY
// 키를 바꾸면 기존 알림 구독이 모두 무효가 되니 한 번 정하면 그대로 쓴다.
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
const { d } = await crypto.subtle.exportKey("jwk", pair.privateKey);
const b64u = (bytes) => Buffer.from(bytes).toString("base64url");
console.log(`VAPID_PUBLIC_KEY=${b64u(raw)}`);
console.log(`VAPID_PRIVATE_KEY=${d}`);
