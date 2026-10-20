import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export interface Env {
	OAUTH_KV: KVNamespace;
	FICHIERS: R2Bucket;
	IMAGES: ImagesBinding;
	OAUTH_PROVIDER: OAuthHelpers;
	/** Secret: the password asked on the sign-in page. */
	MOT_DE_PASSE?: string;
	/** Secret, optional: a key accepted as « Authorization: Bearer … » (Codex, scripts). */
	CLE_API?: string;
	PEXELS_API_KEY?: string;
	UNSPLASH_ACCESS_KEY?: string;
	PIXABAY_API_KEY?: string;
	BRAVE_API_KEY?: string;
	SERPAPI_API_KEY?: string;
	OPENAI_API_KEY?: string;
	OPENAI_IMAGE_MODEL: string;
	/** Font used to write text on pictures (woff2, ttf or otf at a public address). */
	POLICE: string;
}

/** Compares two secrets in constant time. */
export async function memeSecret(a: string, b: string): Promise<boolean> {
	const enc = new TextEncoder();
	const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
	return crypto.subtle.timingSafeEqual(x, y);
}
