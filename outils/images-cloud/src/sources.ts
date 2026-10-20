import type { Env } from "./env";

/** One picture found by a search. */
export type Trouvaille = {
	id?: string;
	title: string;
	url: string;
	thumb: string;
	page: string;
	width?: number;
	height?: number;
	license: string;
	author: string;
	provider: string;
	ping?: string;
};

type Source = (env: Env, q: string, n: number, commercial: boolean) => Promise<Trouvaille[]>;

export const API_UA = "images-briquetterie/1.0 (MCP image search)";

async function getJson(url: string, params: Record<string, string | number>, headers: Record<string, string> = {}): Promise<any> {
	const u = new URL(url);
	for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
	const r = await fetch(u, { headers: { "User-Agent": API_UA, Accept: "application/json", ...headers } });
	if (!r.ok) throw new Error(`${u.hostname} a répondu ${r.status} : ${(await r.text()).slice(0, 300)}`);
	return r.json();
}

const stripHtml = (s = "") =>
	s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

const openverse: Source = async (_env, q, n, commercial) => {
	const params: Record<string, string | number> = { q, page_size: Math.min(n, 20) };
	if (commercial) params.license_type = "commercial,modification";
	const data = await getJson("https://api.openverse.org/v1/images/", params);
	const lic = (r: any) => {
		const l = String(r.license || "").toLowerCase();
		return l === "cc0" ? "CC0" : l === "pdm" ? "domaine public" : `CC ${l.toUpperCase()} ${r.license_version || ""}`.trim();
	};
	return (data.results || []).filter((r: any) => r.url).map((r: any) => ({
		title: r.title || "", url: r.url, thumb: r.thumbnail || r.url, page: r.foreign_landing_url || "",
		width: r.width, height: r.height, license: lic(r), author: r.creator || "", provider: "openverse",
	}));
};

// Commons only accepts free licenses, all of them open to commercial use and modification.
const wikimedia: Source = async (_env, q, n) => {
	const data = await getJson("https://commons.wikimedia.org/w/api.php", {
		action: "query", format: "json", formatversion: "2", generator: "search", gsrsearch: `${q} filetype:bitmap`,
		gsrnamespace: "6", gsrlimit: Math.min(n, 50), prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "400",
		iiextmetadatafilter: "LicenseShortName|Artist|ObjectName",
	});
	const pages = [...(data.query?.pages || [])].sort((a: any, b: any) => (a.index || 0) - (b.index || 0));
	const out: Trouvaille[] = [];
	for (const p of pages) {
		const ii = p.imageinfo?.[0] || {};
		if (!ii.url || !String(ii.mime || "").startsWith("image/") || String(ii.mime).includes("svg")) continue;
		const val = (k: string) => stripHtml(ii.extmetadata?.[k]?.value);
		out.push({
			title: val("ObjectName") || String(p.title || "").replace(/^File:/, ""), url: ii.url, thumb: ii.thumburl || ii.url,
			page: ii.descriptionurl || "", width: ii.width, height: ii.height, license: val("LicenseShortName"), author: val("Artist"), provider: "wikimedia",
		});
	}
	return out;
};

const pexels: Source = async (env, q, n) => {
	const data = await getJson("https://api.pexels.com/v1/search", { query: q, per_page: Math.min(n, 80), locale: "fr-FR" }, { Authorization: env.PEXELS_API_KEY! });
	return (data.photos || []).map((p: any) => ({
		title: p.alt || "", url: p.src.original, thumb: p.src.medium || p.src.original, page: p.url || "", width: p.width, height: p.height,
		license: "licence Pexels (usage commercial libre)", author: p.photographer || "", provider: "pexels",
	}));
};

const unsplash: Source = async (env, q, n) => {
	const data = await getJson("https://api.unsplash.com/search/photos", { query: q, per_page: Math.min(n, 30), lang: "fr" },
		{ Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`, "Accept-Version": "v1" });
	return (data.results || []).map((p: any) => ({
		title: p.description || p.alt_description || "", url: `${p.urls.raw}${p.urls.raw.includes("?") ? "&" : "?"}w=2560&fm=jpg&q=90`,
		thumb: p.urls.small || p.urls.regular, page: p.links?.html || "", width: p.width, height: p.height,
		license: "licence Unsplash (usage commercial libre)", author: p.user?.name || "", provider: "unsplash",
		ping: p.links?.download_location || "", // Unsplash asks to report each download
	}));
};

const pixabay: Source = async (env, q, n) => {
	const data = await getJson("https://pixabay.com/api/", { key: env.PIXABAY_API_KEY!, q: q.slice(0, 100), image_type: "photo", per_page: Math.max(3, Math.min(n, 200)), lang: "fr", safesearch: "true" });
	return (data.hits || []).map((h: any) => ({
		title: h.tags || "", url: h.largeImageURL || h.webformatURL, thumb: h.webformatURL || h.previewURL, page: h.pageURL || "",
		width: h.imageWidth, height: h.imageHeight, license: "licence Pixabay (usage commercial libre)", author: h.user || "", provider: "pixabay",
	}));
};

const brave: Source = async (env, q, n) => {
	const data = await getJson("https://api.search.brave.com/res/v1/images/search", { q, count: Math.min(n, 100), safesearch: "strict" },
		{ "X-Subscription-Token": env.BRAVE_API_KEY! });
	return (data.results || []).filter((r: any) => r.properties?.url).map((r: any) => ({
		title: r.title || "", url: r.properties.url, thumb: r.thumbnail?.src || r.properties.url, page: r.url || "",
		width: r.properties.width, height: r.properties.height, license: "inconnue : vérifier sur la page", author: r.source || "", provider: "brave",
	}));
};

const serpapi: Source = async (env, q, n, commercial) => {
	const params: Record<string, string> = { engine: "google_images", q, api_key: env.SERPAPI_API_KEY!, hl: "fr" };
	if (commercial) params.licenses = "fmc"; // Google: free to use, share or modify, even commercially
	const data = await getJson("https://serpapi.com/search.json", params);
	const lic = commercial ? "réutilisable commercialement selon Google : vérifier sur la page" : "inconnue : vérifier sur la page";
	return (data.images_results || []).filter((r: any) => r.original).slice(0, n).map((r: any) => ({
		title: r.title || "", url: r.original, thumb: r.thumbnail || r.original, page: r.link || "",
		width: r.original_width, height: r.original_height, license: lic, author: r.source || "", provider: "serpapi",
	}));
};

export const SOURCES: Record<string, { fn: Source; key?: keyof Env }> = {
	pexels: { fn: pexels, key: "PEXELS_API_KEY" }, unsplash: { fn: unsplash, key: "UNSPLASH_ACCESS_KEY" }, pixabay: { fn: pixabay, key: "PIXABAY_API_KEY" },
	openverse: { fn: openverse }, wikimedia: { fn: wikimedia }, brave: { fn: brave, key: "BRAVE_API_KEY" }, serpapi: { fn: serpapi, key: "SERPAPI_API_KEY" },
};
export const LIBRES = ["pexels", "unsplash", "pixabay", "openverse", "wikimedia"];
export const configuree = (env: Env, name: string) => !SOURCES[name].key || Boolean(env[SOURCES[name].key!]);
