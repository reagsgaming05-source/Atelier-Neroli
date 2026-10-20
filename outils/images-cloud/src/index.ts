import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { autoriser } from "./connexion";
import { memeSecret, type Env } from "./env";
import { PRIVE } from "./images";
import { serveur } from "./outils";

/** The MCP endpoint, stateless: a fresh server for each request. */
const mcp = {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = new URL(request.url).origin;
		const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
		await serveur(env, origin).connect(transport);
		return transport.handleRequest(request);
	},
};

/** Public files: what Shopify, a browser or another tool fetches. */
async function fichier(request: Request, env: Env, url: URL): Promise<Response> {
	const key = decodeURIComponent(url.pathname.slice(3));
	if (!key || key.startsWith(PRIVE)) return new Response("introuvable", { status: 404 });
	const obj = await env.FICHIERS.get(key, { onlyIf: request.headers, range: request.headers });
	if (!obj) return new Response("introuvable", { status: 404 });
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("ETag", obj.httpEtag);
	headers.set("Access-Control-Allow-Origin", "*");
	if (!("body" in obj)) return new Response(null, { status: 304, headers });
	return new Response(request.method === "HEAD" ? null : obj.body, { headers });
}

const accueil = (origin: string) =>
	new Response(`Serveur MCP d'images.\nAdresse du connecteur : ${origin}/mcp\nFichiers : ${origin}/f/<nom>\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });

const fournisseurs = new Map<string, OAuthProvider<Env>>();

/** The sign-in rules depend on the server's own address, known only at the first request. */
function fournisseur(origin: string): OAuthProvider<Env> {
	let p = fournisseurs.get(origin);
	if (!p) {
		const resource = `${origin}/mcp`;
		p = new OAuthProvider<Env>({
			apiRoute: "/mcp",
			apiHandler: mcp,
			defaultHandler: {
				fetch: (request, env) => (new URL(request.url).pathname === "/authorize" ? autoriser(request, env as Env) : Promise.resolve(accueil(origin))),
			},
			authorizeEndpoint: "/authorize",
			tokenEndpoint: "/oauth/token",
			clientRegistrationEndpoint: "/oauth/register",
			clientIdMetadataDocumentEnabled: true,
			scopesSupported: ["images", "offline_access"],
			resourceMetadata: { resource, authorization_servers: [origin] },
			refreshTokenTTL: 365 * 86400,
			refreshTokenIdleTTL: 60 * 86400,
			// A fixed key for clients set up by hand (Codex: bearer_token_env_var), besides the sign-in page.
			resolveExternalToken: async ({ token, env }) =>
				env.CLE_API && (await memeSecret(token, env.CLE_API)) ? { props: { qui: "cle" }, audience: resource } : null,
		});
		fournisseurs.set(origin, p);
	}
	return p;
}

export default {
	fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/f/") && (request.method === "GET" || request.method === "HEAD")) return fichier(request, env, url);
		return fournisseur(url.origin).fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
