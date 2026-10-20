import type { Env } from "./env";
import { imageDeLaPage } from "./page";
import { API_UA } from "./sources";

export type Bloc = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
export type Credits = { title?: string; page?: string; license?: string; author?: string; provider?: string; source?: string };

const WEB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const MAX_OCTETS = 25 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
const MIME: Record<string, ImageOutputOptions["format"]> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

export const texte = (text: string): Bloc => ({ type: "text", text });
const flux = (buf: ArrayBuffer) => new Response(buf).body as ReadableStream<Uint8Array>;
const octets = async (s: ReadableStream<Uint8Array>) => new Response(s).arrayBuffer();

export class Refus extends Error {}

// Fetching from the web

export async function telecharger(url: string, referer = "", max = MAX_OCTETS): Promise<{ data: ArrayBuffer; type: string; url: string }> {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		throw new Refus(`adresse non valable : ${url}`);
	}
	if (u.protocol !== "https:" && u.protocol !== "http:") throw new Refus(`adresse non prise en charge : ${url}`);
	const host = u.hostname;
	const headers: Record<string, string> = {
		"User-Agent": /(wikimedia|wikipedia)\.org$/.test(host) ? API_UA : WEB_UA,
		Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.9,text/html;q=0.5,*/*;q=0.3",
		"Accept-Language": "fr,en;q=0.8",
	};
	if (referer) headers.Referer = referer;
	const r = await fetch(u, { headers, redirect: "follow" });
	if (!r.ok) throw new Refus(`téléchargement refusé (${r.status}) : ${url}`);
	if (Number(r.headers.get("content-length") || 0) > max) throw new Refus(`fichier de plus de ${max / 1048576} Mo : ${url}`);
	const reader = r.body!.getReader();
	const parts: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > max) {
			await reader.cancel();
			throw new Refus(`fichier de plus de ${max / 1048576} Mo : ${url}`);
		}
		parts.push(value);
	}
	const data = new Uint8Array(total);
	let at = 0;
	for (const p of parts) data.set(p, (at += p.byteLength) - p.byteLength);
	return { data: data.buffer, type: r.headers.get("content-type") || "", url: r.url || url };
}

/** Downloads a picture from an image address or a web page (its main picture). */
export async function recuperer(env: Env, url: string, referer = ""): Promise<{ data: ArrayBuffer; url: string; page: string; info: { format: string; width: number; height: number } }> {
	let got = await telecharger(url, referer);
	let page = "";
	const head = new TextDecoder().decode(got.data.slice(0, 200)).trimStart().toLowerCase();
	if (got.type.includes("html") || head.startsWith("<!doctype") || head.startsWith("<html")) {
		const picture = imageDeLaPage(new TextDecoder().decode(got.data), got.url);
		if (!picture) throw new Refus("cette page n'indique pas d'image principale : donner l'adresse directe de l'image, ou passer par search_images");
		page = got.url;
		got = await telecharger(picture, got.url);
	}
	return { data: got.data, url: got.url, page, info: await mesurer(env, got.data) };
}

export async function mesurer(env: Env, data: ArrayBuffer): Promise<{ format: string; width: number; height: number }> {
	let info: ImageInfoResponse;
	try {
		info = await env.IMAGES.info(flux(data));
	} catch {
		throw new Refus("ce n'est pas une image lisible");
	}
	if (!("width" in info)) throw new Refus("les images SVG ne sont pas prises en charge");
	return { format: info.format, width: info.width, height: info.height };
}

export async function vignette(env: Env, url: string, referer: string): Promise<Bloc | null> {
	return (await vignetteMesuree(env, url, referer))?.bloc ?? null;
}

/** A small view of a picture of the web, with its real size; null if it cannot be fetched. */
export async function vignetteMesuree(env: Env, url: string, referer: string): Promise<{ bloc: Bloc; width: number; height: number } | null> {
	try {
		const got = await telecharger(url, referer, 8 * 1048576);
		const { width, height } = await mesurer(env, got.data);
		const raw = got.data.byteLength < 150_000 && /^image\/(jpeg|png|webp|gif)/.test(got.type);
		return { bloc: raw ? image(got.data, got.type.split(";")[0]) : await apercu(env, got.data, 320), width, height };
	} catch {
		return null;
	}
}

// Showing pictures to the model

function base64(data: ArrayBuffer): string {
	const bytes = new Uint8Array(data);
	let s = "";
	for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(s);
}

export const image = (data: ArrayBuffer, mimeType: string): Bloc => ({ type: "image", data: base64(data), mimeType });

export async function apercu(env: Env, data: ArrayBuffer, side = 1280): Promise<Bloc> {
	const out = await env.IMAGES.input(flux(data)).transform({ width: side, height: side, fit: "scale-down" }).output({ format: "image/jpeg", quality: 82, background: "#ffffff" });
	return image(await octets(out.image()), "image/jpeg");
}

// Storage: files are public at <origin>/f/<key>, under a name nobody can guess

export const PRIVE = "recherches/";

const slug = (s: string) =>
	s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "image";

export const hasard = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");

export async function ranger(env: Env, dossier: string, nom: string, data: ArrayBuffer, mime: string, credits: Credits = {}): Promise<string> {
	const parts = nom.split("/").filter(Boolean);
	const base = slug(parts.pop() || "image");
	const sous = parts.map(slug).filter((p) => p && p !== "recherches");
	const key = [...(sous.length ? sous : [dossier]), `${base}-${hasard(4)}.${EXT[mime] || "bin"}`].join("/");
	const meta: Record<string, string> = {};
	const limits: Record<string, number> = { title: 150, author: 100, license: 80, provider: 20, page: 400, source: 400 };
	for (const [k, v] of Object.entries(credits)) if (v) meta[k] = String(v).slice(0, limits[k] ?? 100);
	await env.FICHIERS.put(key, data, { httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: meta });
	return key;
}

export const adresse = (origin: string, key: string) => `${origin}/f/${key.split("/").map(encodeURIComponent).join("/")}`;

/** A stored picture, by its key, or by its public address; or any picture on the web. */
export async function charger(env: Env, origin: string, ref: string): Promise<{ data: ArrayBuffer; key: string; mime: string }> {
	ref = ref.trim();
	let key = ref;
	if (ref.startsWith(`${origin}/f/`)) key = decodeURIComponent(ref.slice(origin.length + 3));
	else if (/^https?:\/\//.test(ref)) {
		const got = await recuperer(env, ref);
		return { data: got.data, key: "", mime: got.info.format };
	}
	if (key.startsWith(PRIVE)) throw new Refus(`image introuvable : ${ref}`);
	const obj = await env.FICHIERS.get(key);
	if (!obj) throw new Refus(`image introuvable : ${ref} (list_images donne les noms)`);
	return { data: await obj.arrayBuffer(), key, mime: obj.httpMetadata?.contentType || "image/jpeg" };
}

// Retouching with Cloudflare Images

export type Operation = Record<string, any>;

const fractions = (values: number[], sizes: number[]) =>
	values.every((v) => v >= 0 && v <= 1) ? values.map((v, i) => v * sizes[i % sizes.length]) : values;

const ratio = (aspect: string | number) => {
	if (typeof aspect === "number") return aspect;
	const [w, h] = String(aspect).replace("/", ":").split(":").map(Number);
	if (!(w > 0) || !(h > 0 || h === undefined)) throw new Refus(`format non compris : ${aspect} (exemple : "1:1", "16:9")`);
	return w / (h || 1);
};

function placement(position: unknown, margin: number): ImageDrawOptions {
	const pos = String(position || "bottom-right").toLowerCase();
	const out: ImageDrawOptions = {};
	if (pos.includes("top")) out.top = margin;
	if (pos.includes("bottom")) out.bottom = margin;
	if (pos.includes("left")) out.left = margin;
	if (pos.includes("right")) out.right = margin;
	return out;
}

const GRAVITES: Record<string, ImageTransform["gravity"]> = {
	"top-left": { x: 0, y: 0, mode: "remainder" }, "top-right": { x: 1, y: 0, mode: "remainder" },
	"bottom-left": { x: 0, y: 1, mode: "remainder" }, "bottom-right": { x: 1, y: 1, mode: "remainder" },
};

const AILLEURS: Record<string, string> = {
	perspective: "redresser une perspective", white_balance: "la balance des blancs", temperature: "la température de couleur",
	levels: "les niveaux", vignette: "le vignettage", sepia: "le sépia", grayscale: "le noir et blanc", denoise: "le débruitage",
};

/** One operation, as a single Cloudflare Images step on a W×H picture. */
async function etape(env: Env, t: ImageTransformer, op: Operation, W: number, H: number): Promise<{ t: ImageTransformer; transparent?: boolean }> {
	const name = String(op.op || "").toLowerCase();
	const value = op.value;
	if (name === "crop") {
		if (op.box) {
			const [l, tp, r, b] = fractions(op.box.map(Number), [W, H]);
			const left = Math.max(0, Math.round(l)), top = Math.max(0, Math.round(tp));
			const width = Math.min(W, Math.round(r)) - left, height = Math.min(H, Math.round(b)) - top;
			if (width < 1 || height < 1) throw new Refus(`cadre vide : ${JSON.stringify(op.box)}`);
			return { t: t.transform({ trim: { left, top, width, height } }) };
		}
		if (op.aspect === undefined) throw new Refus("crop : donner box [gauche, haut, droite, bas] ou aspect");
		const target = ratio(op.aspect);
		const [w, h] = W / H < target ? [W, Math.round(W / target)] : [Math.round(H * target), H];
		const focus = op.focus ?? "center";
		const gravity = Array.isArray(focus) ? { x: Number(focus[0]), y: Number(focus[1]), mode: "remainder" as const } : GRAVITES[focus] ?? focus;
		return { t: t.transform({ width: w, height: h, fit: "crop", gravity }) };
	}
	if (name === "resize") {
		let k: number;
		if (op.max_side) k = Number(op.max_side) / Math.max(W, H);
		else if (op.width && op.height) k = Math.min(Number(op.width) / W, Number(op.height) / H);
		else if (op.width) k = Number(op.width) / W;
		else if (op.height) k = Number(op.height) / H;
		else throw new Refus("resize : donner width, height ou max_side");
		if (k > 1 && !op.upscale) k = 1;
		return { t: t.transform({ width: Math.max(1, Math.round(W * k)), height: Math.max(1, Math.round(H * k)), fit: op.upscale ? "contain" : "scale-down" }) };
	}
	if (name === "rotate") {
		const angle = ((Number(op.angle ?? value ?? 0) % 360) + 360) % 360;
		if (angle % 90) throw new Refus("rotate : seulement 90, 180 ou 270 ici ; pour redresser une photo penchée, ai_edit_image");
		// Cloudflare turns clockwise; the angle given is counterclockwise, as in the local server
		return { t: t.transform({ rotate: ((360 - angle) % 360) as 0 | 90 | 180 | 270 }) };
	}
	if (name === "flip") return { t: t.transform({ flip: String(op.direction ?? value ?? "horizontal").startsWith("v") ? "v" : "h" }) };
	if (["brightness", "contrast", "saturation", "gamma"].includes(name)) return { t: t.transform({ [name]: Number(value ?? 1) }) };
	if (name === "sharpen") return { t: t.transform({ sharpen: Math.min(10, Number(value ?? op.amount ?? 1)) }) };
	if (name === "blur") return { t: t.transform({ blur: Math.max(1, Math.min(250, Number(op.radius ?? value ?? 2))) }) };
	if (name === "remove_background") return { t: t.transform({ segment: "foreground" }), transparent: true };
	if (name === "background") return { t: t.transform({ background: String(op.color ?? value ?? "#ffffff") }), transparent: false };
	if (name === "trim") return { t: t.transform({ trim: { border: { tolerance: Number(op.tolerance ?? 10), keep: Number(op.keep ?? 0) } } }) };
	if (name === "border") return { t: t.transform({ border: { color: String(op.color ?? "#ffffff"), width: Math.round(Number(op.width ?? value ?? 20)) } }) };
	if (name === "pad") {
		// fit "pad" centres the picture on a w×h canvas (a margin was added before, as a border)
		const target = op.aspect !== undefined ? ratio(op.aspect) : Number(op.width) / Number(op.height);
		const [w, h] = W / H < target ? [Math.round(H * target), H] : [W, Math.round(W / target)];
		return { t: t.transform({ width: w, height: h, fit: "pad", background: String(op.color ?? "#ffffff") }), transparent: false };
	}
	if (name === "overlay") {
		const logo = await env.FICHIERS.get(String(op.image || op.path));
		if (!logo) throw new Refus(`overlay : image introuvable : ${op.image || op.path} (le logo doit être rangé : save_image)`);
		const width = Math.max(1, Math.round(W * Number(op.scale ?? 0.2)));
		return { t: t.draw(env.IMAGES.input(flux(await logo.arrayBuffer())).transform({ width }), {
			opacity: Number(op.opacity ?? 1), ...placement(op.position, Math.round(Number(op.margin ?? 0.03) * W)),
		}) };
	}
	if (name === "text") {
		if (!op.text) throw new Refus("text : donner text");
		const size = Number(op.size || Math.max(12, Math.round(H * 0.04)));
		const writing = env.IMAGES.text(String(op.text), { font: { url: String(op.font || env.POLICE) }, size, color: String(op.color ?? "#ffffff") });
		return { t: t.draw(writing, { opacity: Number(op.opacity ?? 0.9), ...placement(op.position, Math.round(Number(op.margin ?? size))) }) };
	}
	if (AILLEURS[name]) throw new Refus(`${AILLEURS[name]} n'est pas possible en ligne : ai_edit_image (« corrige la perspective… ») ou le serveur local codex-images`);
	throw new Refus(`opération inconnue : ${JSON.stringify(name)}`);
}

/** Applies the operations one after the other, each measured before the next, then saves in the format asked. */
export async function retoucher(env: Env, data: ArrayBuffer, ops: Operation[], format: string): Promise<{ data: ArrayBuffer; mime: string }> {
	const wanted = MIME[format.toLowerCase()];
	if (!wanted) throw new Refus(`format non pris en charge : ${format} (jpg, png, webp ou avif)`);
	let current = data;
	let transparent = false;
	let mime: ImageOutputOptions["format"] = wanted;
	const queue = ops.length ? [...ops] : [{ op: "resize", max_side: 1e9 }]; // none: a plain conversion
	while (queue.length) {
		let op = queue.shift()!;
		const { width, height } = await mesurer(env, current);
		if (String(op.op).toLowerCase() === "pad" && Number(op.margin) > 0) {
			queue.unshift({ ...op, margin: 0 });
			op = { op: "border", color: op.color ?? "#ffffff", width: Math.round(Number(op.margin) * Math.max(width, height)) };
		}
		const step = await etape(env, env.IMAGES.input(flux(current)), op, width, height);
		transparent = step.transparent ?? transparent;
		const last = !queue.length;
		mime = last && !(transparent && wanted === "image/jpeg") ? wanted : "image/png"; // lossless in between
		const out = await step.t.output({ format: mime, quality: 90, ...(mime === "image/jpeg" ? { background: "#ffffff" } : {}) });
		current = await octets(out.image());
	}
	return { data: current, mime };
}

export const extension = (mime: string) => EXT[mime] || "jpg";
