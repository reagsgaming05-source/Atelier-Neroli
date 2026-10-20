import { AuthorizationError, CimdFetchError, type ConsentDescription } from "@cloudflare/workers-oauth-provider";
import { memeSecret, type Env } from "./env";

const echapper = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STYLE = `body{font:16px/1.5 system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;color:#222;background:#faf8f5}
h1{font-size:1.3rem}input[type=password]{width:100%;padding:.6rem;font-size:1rem;border:1px solid #bbb;border-radius:6px;box-sizing:border-box}
button{padding:.6rem 1.2rem;font-size:1rem;border-radius:6px;border:0;margin:.8rem .4rem 0 0;cursor:pointer}
.oui{background:#b8432f;color:#fff}.non{background:#ddd}.note{color:#666;font-size:.9rem}`;

const page = (titre: string, corps: string, status = 200, headers = new Headers()) => {
	headers.set("Content-Type", "text/html; charset=utf-8");
	return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre}</title><style>${STYLE}</style><body>${corps}</body></html>`, { status, headers });
};

function formulaire(details: ConsentDescription, handle: string): string {
	const nom = echapper(details.clientName);
	const origine = details.clientDomain ? `Publiée par <strong>${echapper(details.clientDomain)}</strong>.` : "Cette application s'est inscrite elle-même : son nom n'est pas vérifié.";
	const portees = details.scope.map((s) => `<input type="hidden" name="scope" value="${echapper(s)}">`).join("");
	return `<h1>Autoriser ${nom} à utiliser le serveur d'images ?</h1>
<p>${origine} L'accès sera envoyé à <strong>${echapper(details.redirectHost)}</strong>.</p>
${details.redirectIsLoopback ? "<p><strong>L'accès part vers une application de cet ordinateur.</strong> Continuer seulement si tu viens de lancer la connexion depuis elle.</p>" : ""}
<form method="post">
<input type="hidden" name="handle" value="${echapper(handle)}">${portees}
<label>Mot de passe du serveur<br><input type="password" name="password" autocomplete="current-password" autofocus required></label>
<button class="oui" name="decision" value="approve">Autoriser</button><button class="non" name="decision" value="deny" formnovalidate>Refuser</button>
</form><p class="note">Le mot de passe est celui réglé avec <code>wrangler secret put MOT_DE_PASSE</code>.</p>`;
}

/** The sign-in page: a password, then the client gets its access. */
export async function autoriser(request: Request, env: Env): Promise<Response> {
	const oauth = env.OAUTH_PROVIDER;
	try {
		if (!env.MOT_DE_PASSE) return page("Serveur non réglé", "<h1>Serveur non réglé</h1><p>Régler d'abord le mot de passe : <code>npx wrangler secret put MOT_DE_PASSE</code>.</p>", 503);
		if (request.method === "GET") {
			const demande = await oauth.parseAuthRequest(request);
			const details = await oauth.describeConsent(demande);
			const consent = await oauth.beginConsent(demande);
			return page("Connexion", formulaire(details, consent.handle), 200, consent.headers);
		}
		if (request.method !== "POST") return new Response("méthode non permise", { status: 405 });
		const form = await request.formData();
		const handle = String(form.get("handle") || "");
		if (form.get("decision") !== "approve") {
			const refus = await oauth.denyConsent(request, handle);
			return new Response(null, { status: 302, headers: refus.headers });
		}
		if (!(await memeSecret(String(form.get("password") || ""), env.MOT_DE_PASSE))) {
			await new Promise((r) => setTimeout(r, 1500)); // slows down guessing
			return page("Mot de passe incorrect", `<h1>Mot de passe incorrect</h1><p><a href="javascript:history.back()">Revenir et réessayer</a></p>`, 403);
		}
		const accord = await oauth.approveConsent(request, handle, { scope: form.getAll("scope").map(String) });
		const { redirectTo } = await oauth.completeAuthorization({
			request: accord.request, userId: "proprietaire", metadata: {}, scope: accord.request.scope, props: { qui: "proprietaire" },
		});
		accord.headers.set("Location", redirectTo);
		return new Response(null, { status: 302, headers: accord.headers });
	} catch (error) {
		if (error instanceof AuthorizationError && error.redirectTo) return Response.redirect(error.redirectTo, 302);
		if (error instanceof AuthorizationError || error instanceof CimdFetchError) {
			const message = error instanceof AuthorizationError ? error.description : "Cette application n'a pas pu être vérifiée.";
			return page("Connexion impossible", `<h1>Connexion impossible</h1><p>${echapper(message)}</p><p>Recommencer depuis l'application.</p>`, 400);
		}
		throw error;
	}
}
