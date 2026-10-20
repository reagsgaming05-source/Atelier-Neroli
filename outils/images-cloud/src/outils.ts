import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { z } from "zod";
import type { Env } from "./env";
import {
	PRIVE, Refus, adresse, apercu, charger, extension, hasard, mesurer, ranger, recuperer, retoucher, texte, vignette,
	type Bloc, type Credits,
} from "./images";
import { LIBRES, SOURCES, configuree, type Trouvaille } from "./sources";

const RESULTAT = /^[a-z2-9]{4}-\d{1,3}$/;
const GENERATEUR = "pour la retoucher avec le générateur d'images de Codex : image_gen.imagegen avec num_last_images_to_include = 1 (c'est l'image ci-dessous)";

/** Failures reach the model in words, so that it can correct itself. */
function outil<A>(fn: (args: A) => Promise<Bloc[]>) {
	return async (args: A) => {
		try {
			return { content: await fn(args) };
		} catch (e) {
			const message = e instanceof Refus ? e.message : `${(e as Error)?.name || "Erreur"} : ${(e as Error)?.message || e}`;
			return { content: [texte(message)], isError: true };
		}
	};
}

const decrire = (key: string, url: string, info: { width: number; height: number; format: string }, octets: number) =>
	`${key}  —  ${info.width}×${info.height} px, ${info.format.replace("image/", "").toUpperCase()}, ${Math.round(octets / 1024)} Ko\nadresse publique : ${url}`;

export function serveur(env: Env, origin: string): McpServer {
	const mcp = new McpServer({ name: "images", version: "1.0.0" }, {
		jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
		instructions: `Images du web, rangées en ligne : chaque image a une adresse publique ${origin}/f/…
Démarche : search_images (regarder les vignettes) → save_image("xxxx-N"), qui montre l'image
→ retouche avec le générateur d'images de Codex : image_gen.imagegen avec num_last_images_to_include = 1,
juste après save_image ou view_image (pour une image déjà rangée, d'abord view_image avec max_side 2048) ;
le résultat est rangé par Codex sur l'ordinateur, dans generated_images/.
edit_image sert aux gestes simples et exacts sans IA (détourer, fond blanc, format carré, recadrer, logo) ; il range le résultat en ligne.
L'original n'est jamais modifié.
Pour mettre une image rangée sur la boutique Shopify : donner son adresse publique à l'outil Shopify comme originalSource
(productCreateMedia ou fileCreate) : Shopify va la chercher lui-même.
Garder l'auteur et la licence : list_images les donne pour la page des crédits.`,
	});
	const lecture = { readOnlyHint: true, openWorldHint: true };

	mcp.registerTool("search_images", {
		title: "Chercher des images",
		description: `Cherche des images sur internet. Renvoie la liste (numéro, taille, licence, auteur, page) et la vignette de chacune,
pour choisir en les regardant ; ensuite save_image avec le numéro (ex. « k3m9-2 »).
source : "auto" (banques d'images libres : Pexels, Unsplash, Pixabay si leurs clés sont réglées, puis Openverse et Wikimedia Commons),
l'une d'elles par son nom, ou "web" (tout le web via Brave ou SerpAPI : photos de produits, de marques ; clé requise).
commercial_only : seulement des images utilisables et modifiables commercialement (banques libres, et filtre Google pour SerpAPI).
Astuce : chercher aussi en anglais, les banques d'images y sont plus riches.`,
		inputSchema: {
			query: z.string().min(1),
			source: z.string().default("auto"),
			count: z.number().int().min(1).max(24).default(12),
			commercial_only: z.boolean().default(true),
		},
		annotations: lecture,
	}, outil(async ({ query, source, count, commercial_only }) => {
		let names: string[];
		if (source === "web") {
			names = ["brave", "serpapi"].filter((n) => configuree(env, n));
			if (!names.length) throw new Refus("source web : régler BRAVE_API_KEY ou SERPAPI_API_KEY (voir le README)");
		} else if (source === "auto") names = LIBRES.filter((n) => configuree(env, n));
		else if (SOURCES[source]) {
			if (!configuree(env, source)) throw new Refus(`${source} : régler ${String(SOURCES[source].key)} (voir le README)`);
			names = [source];
		} else throw new Refus(`source inconnue : ${source} (auto, web, ${Object.keys(SOURCES).join(", ")})`);
		const found: Trouvaille[] = [];
		const notes: string[] = [];
		const seen = new Set<string>();
		for (const name of names) {
			try {
				for (const item of await SOURCES[name].fn(env, query, count, commercial_only)) {
					if (!seen.has(item.url) && found.length < count) {
						seen.add(item.url);
						found.push(item);
					}
				}
			} catch (e) {
				notes.push(`${name} indisponible : ${(e as Error).message}`);
			}
			if (found.length >= count) break;
		}
		if (!found.length) throw new Refus(`aucune image trouvée. ${notes.join(" ")} Essayer d'autres mots, en anglais, ou une autre source.`);
		const sid = hasard(4);
		found.forEach((item, i) => (item.id = `${sid}-${i + 1}`));
		await env.FICHIERS.put(`${PRIVE}${sid}.json`, JSON.stringify(found), { httpMetadata: { contentType: "application/json" } });
		const thumbs = await Promise.all(found.map((it) => vignette(env, it.thumb, it.page)));
		const out: Bloc[] = [texte(`${found.length} images pour « ${query} »${notes.length ? `\n${notes.join("\n")}` : ""}`)];
		found.forEach((it, i) => {
			const size = it.width ? `${it.width}×${it.height}` : "taille ?";
			out.push(texte(`${it.id}  ${size}  ${it.provider}  « ${it.title.slice(0, 70)} »  licence : ${it.license || "?"}  auteur : ${it.author.slice(0, 40) || "?"}  page : ${it.page}`));
			out.push(thumbs[i] ?? texte("(vignette indisponible)"));
		});
		return out;
	}));

	mcp.registerTool("save_image", {
		title: "Enregistrer une image",
		description: `Télécharge une image et la range en ligne (dossier originaux/), avec une adresse publique, puis la montre.
source : un numéro de search_images (« k3m9-2 »), l'adresse directe d'une image, ou l'adresse d'une page web (son image principale est prise).
L'auteur, la licence et la provenance sont notés. name : nom souhaité, avec un dossier si on veut (« boutique/porsche-911 »).`,
		inputSchema: { source: z.string().min(1), name: z.string().default("") },
		annotations: { openWorldHint: true },
	}, outil(async ({ source, name }) => {
		let credits: Credits & { url: string; ping?: string } = { url: source.trim() };
		if (RESULTAT.test(source.trim())) {
			const [sid, n] = source.trim().split("-");
			const list = await env.FICHIERS.get(`${PRIVE}${sid}.json`);
			const item = list ? ((await list.json()) as Trouvaille[])[Number(n) - 1] : undefined;
			if (!item) throw new Refus(`résultat inconnu : ${source} (relancer search_images)`);
			credits = { ...item, url: item.url };
		}
		if (credits.ping && env.UNSPLASH_ACCESS_KEY) {
			await fetch(credits.ping, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } }).catch(() => undefined);
		}
		const got = await recuperer(env, credits.url, credits.page);
		const key = await ranger(env, "originaux", name || credits.title || new URL(got.url).pathname.split("/").pop()?.replace(/\.\w+$/, "") || "image",
			got.data, got.info.format, { title: credits.title, page: credits.page || got.page, license: credits.license, author: credits.author, provider: credits.provider, source: got.url });
		const licence = credits.license || `inconnue : vérifier sur ${credits.page || got.page || got.url}`;
		return [texte(`Enregistrée : ${decrire(key, adresse(origin, key), got.info, got.data.byteLength)}\nlicence : ${licence}\n${GENERATEUR}`), await apercu(env, got.data, 2048)];
	}));

	mcp.registerTool("view_image", {
		title: "Voir une image",
		description: "Montre une image rangée (son nom, ou son adresse publique), avec sa taille et son format. Une adresse d'image du web marche aussi.",
		inputSchema: { image: z.string().min(1), max_side: z.number().int().min(256).max(2048).default(1280) },
		annotations: lecture,
	}, outil(async ({ image: ref, max_side }) => {
		const got = await charger(env, origin, ref);
		const info = await mesurer(env, got.data);
		return [texte(`${got.key ? decrire(got.key, adresse(origin, got.key), info, got.data.byteLength) : `${info.width}×${info.height} px`}\n${GENERATEUR}`), await apercu(env, got.data, max_side)];
	}));

	mcp.registerTool("edit_image", {
		title: "Retoucher une image",
		description: `Retouche une image et range le résultat à part (dossier retouches/ par défaut) : l'original ne change jamais. Montre l'avant/après.
operations : liste appliquée dans l'ordre, chacune {"op": …, paramètres}. Coordonnées en pixels, ou en fractions 0–1.
- remove_background : détoure le sujet (fond transparent) ; enchaîner avec pad ou background pour un fond blanc
- background : color "#ffffff" (remplit la transparence)
- pad : aspect "1:1" (ou width + height), color, margin (marge autour du sujet, part de la taille : 0.08) → photo produit carrée sur fond uni
- trim : coupe les bords unis autour du sujet (tolerance 0–255, keep px)
- crop : box [gauche, haut, droite, bas] ; ou aspect "16:9" avec focus "center"|"top"|"bottom"|"left"|"right"|"top-left"…|"auto"|[x, y]
- resize : width et/ou height (proportions gardées), ou max_side ; upscale true pour agrandir
- rotate : angle 90, 180 ou 270 (sens inverse des aiguilles) ; flip : direction "horizontal"|"vertical"
- brightness | contrast | saturation | gamma : value (1 = inchangé, 1.1 = +10 %) ; sharpen : value (0–10, 1 conseillé) ; blur : radius
- border : width (px), color
- overlay : image (nom d'un logo rangé), position ("bottom-right", "top-left"…), scale (part de la largeur, 0.2), opacity, margin
- text : text, position, size (pt), color, opacity, font (adresse d'une police .woff2/.ttf)
Pour photo de produit type boutique : [{"op":"remove_background"},{"op":"trim"},{"op":"pad","aspect":"1:1","margin":0.08},{"op":"resize","max_side":2048}].
name : nom du résultat (avec un dossier si on veut) ; format : jpg, png, webp ou avif (par défaut celui de l'original ; png si fond transparent).`,
		inputSchema: {
			image: z.string().min(1),
			operations: z.array(z.record(z.string(), z.any())),
			name: z.string().default(""),
			format: z.string().default(""),
		},
		annotations: { openWorldHint: false },
	}, outil(async ({ image: ref, operations, name, format }) => {
		const src = await charger(env, origin, ref);
		const fmt = format || (["image/jpeg", "image/png", "image/webp", "image/avif"].includes(src.mime) ? extension(src.mime) : "jpg");
		const out = await retoucher(env, src.data, operations, fmt);
		const stem = src.key.split("/").pop()?.replace(/-[a-z2-9]{4}\.\w+$/, "") || "image";
		const key = await ranger(env, "retouches", name || stem, out.data, out.mime, { source: src.key || ref });
		const info = await mesurer(env, out.data);
		return [
			texte(`Enregistrée : ${decrire(key, adresse(origin, key), info, out.data.byteLength)}\nopérations : ${JSON.stringify(operations)}`),
			texte("avant :"), await apercu(env, src.data, 768), texte("après :"), await apercu(env, out.data, 768),
		];
	}));

	mcp.registerTool("ai_edit_image", {
		title: "Retoucher par IA",
		description: `Retouche par IA via l'API OpenAI (clé OPENAI_API_KEY requise), quand le générateur d'images de Codex (image_gen.imagegen)
n'est pas disponible, par exemple depuis Claude ; le résultat est rangé en ligne. prompt : la retouche voulue, en précisant ce qui doit rester identique (le produit, ses couleurs, ses inscriptions).
size : "auto", "1536x1024", "1024x1536" ou "1024x1024". Résultat rangé dans retouches/, avec l'avant/après.`,
		inputSchema: { image: z.string().min(1), prompt: z.string().min(3), name: z.string().default(""), size: z.string().default("auto"), quality: z.string().default("high") },
		annotations: { openWorldHint: true },
	}, outil(async ({ image: ref, prompt, name, size, quality }) => {
		if (!env.OPENAI_API_KEY) throw new Refus("régler OPENAI_API_KEY pour la retouche par IA (sinon, edit_image fait les retouches classiques)");
		const src = await charger(env, origin, ref);
		const sent = await retoucher(env, src.data, [{ op: "resize", max_side: 2048 }], "png");
		const form = new FormData();
		form.append("model", env.OPENAI_IMAGE_MODEL || "gpt-image-1");
		form.append("prompt", prompt);
		form.append("size", size);
		form.append("quality", quality);
		form.append("n", "1");
		form.append("image", new File([sent.data], "image.png", { type: "image/png" }));
		const send = (f: FormData) => fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: f });
		form.append("input_fidelity", "high");
		let r = await send(form);
		if (r.status === 400) {
			const body = await r.text();
			if (!body.includes("input_fidelity")) throw new Refus(`OpenAI a répondu 400 : ${body.slice(0, 500)}`);
			form.delete("input_fidelity"); // model without this option
			r = await send(form);
		}
		if (!r.ok) throw new Refus(`OpenAI a répondu ${r.status} : ${(await r.text()).slice(0, 500)}`);
		const b64 = ((await r.json()) as any).data?.[0]?.b64_json;
		if (!b64) throw new Refus("OpenAI n'a pas renvoyé d'image");
		const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
		const stem = src.key.split("/").pop()?.replace(/-[a-z2-9]{4}\.\w+$/, "") || "image";
		const key = await ranger(env, "retouches", name || `${stem}-ia`, data, "image/png", { source: src.key || ref, title: prompt });
		const info = await mesurer(env, data);
		return [
			texte(`Enregistrée : ${decrire(key, adresse(origin, key), info, data.byteLength)}\nretouche : ${prompt}`),
			texte("avant :"), await apercu(env, src.data, 768), texte("après :"), await apercu(env, data, 768),
		];
	}));

	mcp.registerTool("list_images", {
		title: "Lister les images",
		description: "Liste les images rangées (les plus récentes d'abord), avec leur adresse publique et les crédits à citer (auteur, licence, page). folder : pour n'en voir qu'un dossier.",
		inputSchema: { folder: z.string().default("") },
		annotations: lecture,
	}, outil(async ({ folder }) => {
		const objets: R2Object[] = [];
		let cursor: string | undefined;
		do {
			const page = await env.FICHIERS.list({ prefix: folder ? `${folder.replace(/\/+$/, "")}/` : undefined, cursor, include: ["customMetadata", "httpMetadata"] });
			objets.push(...page.objects.filter((o) => !o.key.startsWith(PRIVE)));
			cursor = page.truncated ? page.cursor : undefined;
		} while (cursor && objets.length < 1000);
		if (!objets.length) return [texte("Aucune image pour l'instant.")];
		objets.sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime());
		const lines = objets.slice(0, 200).map((o) => {
			const m = o.customMetadata || {};
			const credit = m.author || m.license ? `  —  ${m.author || "?"}, ${m.license || "licence inconnue"}, ${m.page || m.source || ""}` : m.source ? `  —  d'après ${m.source}` : "";
			return `${o.key}  (${Math.round(o.size / 1024)} Ko)  ${adresse(origin, o.key)}${credit}`;
		});
		return [texte(`${objets.length} images${objets.length > 200 ? " (les 200 plus récentes)" : ""} :\n${lines.join("\n")}`)];
	}));

	mcp.registerTool("compare_images", {
		title: "Comparer des images",
		description: "Montre plusieurs images rangées l'une après l'autre, chacune avec son nom, pour choisir entre des variantes.",
		inputSchema: { images: z.array(z.string()).min(1).max(8) },
		annotations: lecture,
	}, outil(async ({ images }) => {
		const out: Bloc[] = [];
		for (const ref of images) {
			const got = await charger(env, origin, ref);
			out.push(texte(`${got.key || ref} :`), await apercu(env, got.data, images.length > 2 ? 512 : 768));
		}
		return out;
	}));

	return mcp;
}
