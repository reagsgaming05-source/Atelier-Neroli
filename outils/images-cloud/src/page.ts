// Finding every picture of a web page (a product page of an online shop), at full size.

// Attributes that hold a picture, best first: shops put the full size in a zoom attribute, then lazy-loading ones
const IMG_ATTRS = ["data-zoom-image", "data-large_image", "data-image-large-src", "data-full", "data-zoom", "srcset", "data-srcset",
	"data-src", "data-original", "data-lazy-src", "src"];
const NOISE = /(logo|icon|sprite|placeholder|spinner|loading|blank|pixel|avatar|flag|payment|badge)/i;
const MAIN = ["og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src", "image_src"];

const unescape = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function attributes(tag: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[m[1].toLowerCase()] = unescape(m[2] ?? m[3]);
	return attrs;
}

/** The main picture of a web page (og:image, twitter:image, image_src). */
export function imageDeLaPage(page: string, base: string): string {
	const found: Record<string, string> = {};
	for (const tag of page.slice(0, 400_000).match(/<(?:meta|link)\b[^>]*>/gi) || []) {
		const attrs = attributes(tag);
		const key = (attrs.property || attrs.name || attrs.rel || "").toLowerCase();
		const value = attrs.content || attrs.href;
		if (value && MAIN.includes(key) && !(key in found)) found[key] = value;
	}
	for (const key of MAIN) if (found[key]) return new URL(found[key], base).toString();
	return "";
}

function srcsetBest(value: string): string {
	let best = "", bestW = -1;
	for (const part of value.split(",")) {
		const bits = part.trim().split(/\s+/);
		if (!bits[0]) continue;
		const w = bits[1] ? Number(bits[1].replace(/[^\d.]/g, "")) || 0 : 0;
		if (w >= bestW) [best, bestW] = [bits[0], w];
	}
	return best;
}

/** Asks for the original instead of a thumbnail on common shop platforms (Shopify, WordPress). */
export function tailleOriginale(url: string): string {
	const u = new URL(url);
	if (u.hostname.includes("shopify") || u.pathname.includes("/cdn/shop/")) {
		u.pathname = u.pathname.replace(/_(\d+x\d*|\d*x\d+|pico|icon|thumb|small|compact|medium|large|grande)(@\dx)?(?=\.\w+$)/, "");
		u.search = "";
	} else if (u.pathname.includes("/wp-content/uploads/")) {
		u.pathname = u.pathname.replace(/-\d+x\d+(?=\.\w+$)/, "");
	}
	return u.toString();
}

/** The pictures named in structured data (JSON-LD Product, ImageObject…). */
function imagesStructurees(node: unknown, out: string[]): void {
	if (Array.isArray(node)) for (const x of node) imagesStructurees(x, out);
	else if (node && typeof node === "object") {
		for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
			if (k === "image" || k === "images") {
				for (const x of Array.isArray(v) ? v : [v]) {
					if (typeof x === "string") out.push(x);
					else if (x && typeof x === "object") {
						const o = x as Record<string, unknown>;
						if (typeof (o.contentUrl ?? o.url) === "string") out.push(String(o.contentUrl ?? o.url));
					}
				}
			} else if (v && typeof v === "object") imagesStructurees(v, out);
		}
	}
}

/** Every picture of a web page, gallery included: structured data, main picture, then the page's own pictures. */
export function photosDeLaPage(page: string, base: string): string[] {
	const found: string[] = [];
	for (const m of page.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
		try {
			imagesStructurees(JSON.parse(m[1].trim()), found);
		} catch {
			// not valid JSON: ignored
		}
	}
	const main = imageDeLaPage(page, base);
	if (main) found.push(main);
	for (const tag of page.match(/<(?:img|source|a)\b[^>]*>/gi) || []) {
		const attrs = attributes(tag);
		if (tag.slice(0, 2).toLowerCase() === "<a") {
			if (/\.(jpe?g|png|webp|avif)(\?|$)/i.test(attrs.href || "")) found.push(attrs.href);
			continue;
		}
		for (const key of IMG_ATTRS) {
			const value = (attrs[key] || "").trim();
			if (value && !value.startsWith("data:")) {
				found.push(key.includes("srcset") ? srcsetBest(value) : value);
				break;
			}
		}
	}
	const out: string[] = [];
	for (const raw of found) {
		let url: string;
		try {
			url = new URL(raw.trim(), base).toString();
		} catch {
			continue;
		}
		if (!/^https?:/.test(url) || /\.svg(\?|$)/i.test(url) || NOISE.test(new URL(url).pathname)) continue;
		url = tailleOriginale(url);
		if (!out.includes(url)) out.push(url);
	}
	return out;
}

/** On a Shopify shop, the address of the product's own list of pictures (or "" elsewhere). */
export function listeShopify(page: string, url: string): string {
	const u = new URL(url);
	if (!u.pathname.includes("/products/") || !/cdn\.shopify\.com|\/cdn\/shop\/|Shopify\./.test(page)) return "";
	u.search = "";
	u.hash = "";
	u.pathname = `${u.pathname.replace(/\/+$/, "")}.json`;
	return u.toString();
}
