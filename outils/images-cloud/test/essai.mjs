// Checks the server running under `npx wrangler dev` (http://127.0.0.1:8787 by default):
// sign-in by password, the fixed key, and every tool on a picture stored beforehand.
//   npx wrangler dev   then, in another terminal:   node test/essai.mjs
// .dev.vars must hold MOT_DE_PASSE=essai-mot-de-passe and CLE_API=cle-essai-123.
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const BASE = process.env.BASE || "http://127.0.0.1:8787";
const MOT_DE_PASSE = "essai-mot-de-passe", CLE = "cle-essai-123";
const ok = (cond, what, extra = "") => {
	if (!cond) throw new Error(`ÉCHEC : ${what} ${extra}`);
	console.log(`ok  ${what}`);
};

/** A product photo stand-in: a red box on a white background, as a PNG. */
function png(w, h, pixel) {
	const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
	const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
	const chunk = (type, data) => {
		const out = Buffer.alloc(12 + data.length);
		out.writeUInt32BE(data.length, 0); out.write(type, 4, "ascii"); data.copy(out, 8);
		out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
		return out;
	};
	const raw = Buffer.alloc((w * 3 + 1) * h);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(pixel(x, y), y * (w * 3 + 1) + 1 + x * 3);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const dir = mkdtempSync(join(tmpdir(), "essai-images-"));
const produit = join(dir, "produit.png");
writeFileSync(produit, png(600, 400, (x, y) => (x > 200 && x < 420 && y > 120 && y < 300 ? [190, 40, 30] : [255, 255, 255])));
const KEY = "originaux/boite-essai-ab23.png";
execFileSync("npx", ["wrangler", "r2", "object", "put", `images-briquetterie/${KEY}`, "--file", produit, "--content-type", "image/png", "--local"], { stdio: "ignore" });
ok(true, "image d'essai rangée dans le R2 local");

// 1. Without access, the server says where to sign in.
let r = await fetch(`${BASE}/mcp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
ok(r.status === 401 && /resource_metadata=/.test(r.headers.get("www-authenticate") || ""), "sans accès : 401 avec l'adresse de connexion", r.status);
const meta = await (await fetch(`${BASE}/.well-known/oauth-authorization-server`)).json();
ok(meta.authorization_endpoint.endsWith("/authorize") && meta.registration_endpoint, "description du serveur de connexion");

// 2. A client registers and signs in with the password (what Claude or Codex does).
const redirect = "http://127.0.0.1:9/retour";
const client = await (await fetch(meta.registration_endpoint, {
	method: "POST", headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ client_name: "Essai", redirect_uris: [redirect], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] }),
})).json();
ok(client.client_id, "inscription du client");
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const authorize = new URL(meta.authorization_endpoint);
Object.entries({ response_type: "code", client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge, code_challenge_method: "S256",
	state: "etat-1", scope: "images offline_access", resource: `${BASE}/mcp` }).forEach(([k, v]) => authorize.searchParams.set(k, v));
r = await fetch(authorize, { redirect: "manual" });
const pageHtml = await r.text();
ok(r.status === 200 && pageHtml.includes("Mot de passe") && pageHtml.includes("Essai"), "page de connexion", r.status);
const handle = pageHtml.match(/name="handle" value="([^"]+)"/)[1];
const cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
const send = (password, decision = "approve") => {
	const body = new URLSearchParams({ handle, password, decision });
	for (const s of [...pageHtml.matchAll(/name="scope" value="([^"]+)"/g)].map((m) => m[1])) body.append("scope", s);
	return fetch(meta.authorization_endpoint, { method: "POST", body, headers: { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" }, redirect: "manual" });
};
r = await send("mauvais");
ok(r.status === 403, "mauvais mot de passe refusé");
r = await send(MOT_DE_PASSE);
const back = new URL(r.headers.get("location") || "http://x/");
ok(r.status === 302 && back.origin + back.pathname === redirect && back.searchParams.get("state") === "etat-1" && back.searchParams.get("code"), "bon mot de passe : retour avec un code", r.status);
const tokens = await (await fetch(meta.token_endpoint, {
	method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
	body: new URLSearchParams({ grant_type: "authorization_code", code: back.searchParams.get("code"), redirect_uri: redirect, client_id: client.client_id, code_verifier: verifier, resource: `${BASE}/mcp` }),
})).json();
ok(tokens.access_token && tokens.refresh_token, "jetons d'accès et de renouvellement", JSON.stringify(tokens));

// 3. The tools, with the token from the sign-in, then with the fixed key.
async function connect(token) {
	const c = new Client({ name: "essai", version: "1" });
	await c.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
	return c;
}
const textOf = (res) => res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
const imagesOf = (res) => res.content.filter((b) => b.type === "image");

const mcp = await connect(tokens.access_token);
const tools = (await mcp.listTools()).tools.map((t) => t.name).sort();
ok(JSON.stringify(tools) === JSON.stringify(["ai_edit_image", "compare_images", "edit_image", "list_images", "page_images", "save_image", "search_images", "view_image"]), "les 8 outils", tools.join(","));

let res = await mcp.callTool({ name: "view_image", arguments: { image: KEY } });
ok(!res.isError && imagesOf(res).length === 1 && textOf(res).includes("600×400"), "view_image montre l'image", textOf(res));
ok(textOf(res).includes("image_gen.imagegen avec num_last_images_to_include = 1"), "view_image indique comment passer l'image au générateur de Codex");

// The local simulation of Cloudflare Images only resizes, crops to a format, pads and rotates: the other
// operations pass through unchanged here (third column false), so only their absence of error is checked.
const edits = [
	[[{ op: "crop", aspect: "1:1", focus: "center" }, { op: "resize", width: 200 }], "200×200", true],
	[[{ op: "pad", aspect: "1:1", color: "#ffffff" }], "600×600", true],
	[[{ op: "rotate", angle: 90 }], "400×600", true],
	[[{ op: "resize", max_side: 300 }], "300×200", true],
	[[{ op: "crop", aspect: "16:9", focus: "top-left" }], "600×338", true],
	[[{ op: "crop", box: [0.25, 0.25, 0.75, 0.75] }], "300×200", false],
	[[{ op: "pad", aspect: "1:1", margin: 0.1 }], "720×720", false],
	[[{ op: "brightness", value: 1.1 }, { op: "contrast", value: 1.1 }, { op: "saturation", value: 1.2 }, { op: "sharpen", value: 1 }], "600×400", false],
	[[{ op: "border", width: 10, color: "#000000" }], "620×420", false],
	[[{ op: "flip" }, { op: "blur", radius: 2 }, { op: "gamma", value: 1.1 }], "600×400", false],
	[[{ op: "remove_background" }, { op: "trim" }, { op: "pad", aspect: "1:1", margin: 0.08 }, { op: "resize", max_side: 2048 }], "", false],
];
const made = [];
for (const [operations, size, simulated] of edits) {
	res = await mcp.callTool({ name: "edit_image", arguments: { image: KEY, operations, format: "jpg" } });
	const what = `edit_image ${operations.map((o) => o.op).join("+")}${simulated ? ` → ${size}` : " (non simulé ici : sans erreur)"}`;
	ok(!res.isError && (!simulated || textOf(res).includes(size)) && imagesOf(res).length === 2, what, textOf(res));
	made.push(textOf(res).match(/adresse publique : (\S+)/)[1]);
}
res = await mcp.callTool({ name: "edit_image", arguments: { image: KEY, operations: [{ op: "remove_background" }] } });
ok(!res.isError && textOf(res).includes(".png"), "fond détouré : enregistré en PNG pour garder la transparence", textOf(res));

res = await mcp.callTool({ name: "edit_image", arguments: { image: KEY, operations: [{ op: "perspective", corners: [] }] } });
ok(res.isError && textOf(res).includes("ai_edit_image"), "opération impossible en ligne : message clair", textOf(res));
res = await mcp.callTool({ name: "edit_image", arguments: { image: KEY, operations: [{ op: "rotate", angle: 4 }] } });
ok(res.isError && textOf(res).includes("90"), "rotation libre refusée avec explication");
res = await mcp.callTool({ name: "view_image", arguments: { image: "originaux/absente.png" } });
ok(res.isError && textOf(res).includes("introuvable"), "image absente : message clair");
res = await mcp.callTool({ name: "ai_edit_image", arguments: { image: KEY, prompt: "fond de studio" } });
ok(res.isError && textOf(res).includes("OPENAI_API_KEY"), "retouche IA sans clé : message clair");
res = await mcp.callTool({ name: "search_images", arguments: { query: "brique", source: "web" } });
ok(res.isError && textOf(res).includes("BRAVE_API_KEY"), "recherche web sans clé : message clair");

// 4. Public files: what Shopify fetches.
r = await fetch(made[0]);
ok(r.status === 200 && r.headers.get("content-type") === "image/jpeg" && (await r.arrayBuffer()).byteLength > 500, "fichier public accessible", made[0]);
r = await fetch(`${BASE}/f/recherches/xxxx.json`);
ok(r.status === 404, "les recherches ne sont pas publiques");

res = await mcp.callTool({ name: "compare_images", arguments: { images: [KEY, made[0]] } });
ok(!res.isError && imagesOf(res).length === 2, "compare_images");
res = await mcp.callTool({ name: "list_images", arguments: {} });
ok(!res.isError && textOf(res).includes(KEY) && textOf(res).includes("retouches/boite-essai-"), "list_images", textOf(res).slice(0, 300));

// 5. All the photos of a product page, from a stand-in shop on this computer (wrangler dev lets the Worker reach it;
// once online, Cloudflare only lets it reach the public internet).
const box = (w, h, rgb) => png(w, h, (x, y) => (x > w / 4 && x < (3 * w) / 4 && y > h / 4 && y < (3 * h) / 4 ? rgb : [255, 255, 255]));
const site = {
	"/produit.html": ["text/html", `<!doctype html><html><head><title>Boite 1234</title><meta property="og:image" content="/photos/a.png">
<script type="application/ld+json">{"@type": "Product", "image": ["/photos/a.png", "/photos/b.png"]}</script></head>
<body><img src="/logo.png"><img data-zoom-image="/photos/c.png" src="/photos/c-mini.png"><a href="/photos/d.png"><img src="/mini.png"></a></body></html>`],
	"/photos/a.png": ["image/png", box(500, 400, [200, 30, 30])], "/photos/b.png": ["image/png", box(400, 400, [30, 30, 200])],
	"/photos/c.png": ["image/png", box(600, 300, [30, 160, 30])], "/photos/d.png": ["image/png", box(300, 300, [230, 190, 20])],
	"/mini.png": ["image/png", box(40, 40, [0, 0, 0])], "/logo.png": ["image/png", box(300, 100, [0, 0, 0])],
};
const fixture = createServer((req, rsp) => {
	const hit = site[req.url.split("?")[0]];
	rsp.writeHead(hit ? 200 : 404, { "Content-Type": hit ? hit[0] : "text/plain" }).end(hit ? hit[1] : "absent");
});
await new Promise((r) => fixture.listen(0, "127.0.0.1", r));
const SITE = `http://127.0.0.1:${fixture.address().port}`;
res = await mcp.callTool({ name: "page_images", arguments: { url: `${SITE}/produit.html` } });
if (res.isError) {
	ok(false, "page_images n'a pas pu lire le site d'essai", textOf(res));
} else {
	const listed = textOf(res).split("\n").filter((l) => /^[a-z2-9]{4}-\d+ /.test(l)).map((l) => l.split(/\s+/)[2]);
	ok(JSON.stringify(listed) === JSON.stringify(["a", "b", "c", "d"].map((n) => `${SITE}/photos/${n}.png`)), "page_images : toute la galerie, sans logo ni miniature", textOf(res));
	ok(imagesOf(res).length === 4 && textOf(res).includes("500×400"), "page_images : une vignette et la taille de chaque photo");
	const id = textOf(res).split("\n").find((l) => l.includes("/photos/c.png")).split(/\s+/)[0];
	res = await mcp.callTool({ name: "save_image", arguments: { source: id, name: "boutique/boite-1234-c" } });
	ok(!res.isError && textOf(res).includes("boutique/boite-1234-c-") && textOf(res).includes("à vérifier"), "save_image d'une photo de la page", textOf(res));
}
fixture.close();

// 6. A picture made on the computer goes online (what the local server's publish_image sends).
const generated = box(512, 512, [120, 60, 200]);
r = await fetch(`${BASE}/televerser/boutique/boite-1234-face.png`, { method: "PUT", body: generated, headers: { Authorization: `Bearer ${CLE}`, "Content-Type": "image/png" } });
const sent = await r.json();
ok(r.status === 200 && sent.width === 512 && /\/f\/boutique\/boite-1234-face-[a-z2-9]{4}\.png$/.test(sent.url), "mise en ligne d'une image générée", JSON.stringify(sent));
r = await fetch(sent.url);
ok(r.status === 200 && Buffer.from(await r.arrayBuffer()).equals(generated), "l'image mise en ligne est accessible telle quelle");
r = await fetch(`${BASE}/televerser/x.png`, { method: "PUT", body: generated });
ok(r.status === 401, "mise en ligne sans la clé refusée");
r = await fetch(`${BASE}/televerser/x.png`, { method: "PUT", body: "pas une image", headers: { Authorization: `Bearer ${CLE}` } });
ok(r.status === 400, "mise en ligne d'autre chose qu'une image refusée");

const parCle = await connect(CLE);
ok((await parCle.listTools()).tools.length === 8, "accès par la clé fixe (Codex)");
r = await fetch(`${BASE}/mcp`, { method: "POST", headers: { Authorization: "Bearer mauvaise-cle", "Content-Type": "application/json" }, body: "{}" });
ok(r.status === 401, "mauvaise clé refusée");
console.log("\ntout est bon");
process.exit(0);
