# Images pour Codex, en ligne

Le serveur d'images de [`../codex-images`](../codex-images), hébergé sur Cloudflare comme le connecteur de la boutique : **rien à installer sur chaque ordinateur**. Codex (ou Claude, même sur le téléphone) s'y branche par une simple adresse.

Avec lui, Codex peut :

1. **chercher** des images sur internet et les regarder (une vignette par résultat) ;
2. **les enregistrer** : chaque image est rangée en ligne avec une adresse publique, et son auteur et sa licence sont notés ;
3. **les retoucher avec son propre générateur d'images** (`image_gen`). Le serveur lui montre l'image, et Codex la passe à son générateur avec `num_last_images_to_include = 1`. Le résultat est rangé par Codex sur l'ordinateur, dans `generated_images/` ;
4. faire **les gestes simples sans IA** (`edit_image`) : détourer, fond blanc, format carré pour une fiche produit, recadrer, redimensionner, ajouter le logo ;
5. **envoyer une image sur la boutique Shopify** : l'outil Shopify reçoit l'adresse publique et va chercher l'image lui-même.

| Outil | Rôle |
|---|---|
| `search_images` | Chercher (banques d'images libres, ou tout le web avec une clé Brave ou SerpAPI) |
| `save_image` | Ranger une image trouvée, ou celle d'une page web |
| `view_image` | Montrer une image rangée (à faire juste avant le générateur de Codex) |
| `edit_image` | Retouches exactes, sans IA (détourage, fond, format, recadrage, logo, texte…) |
| `compare_images` | Mettre des variantes l'une après l'autre |
| `list_images` | Toutes les images, leurs adresses et les crédits à citer |
| `ai_edit_image` | Retouche IA par l'API OpenAI, si le générateur de Codex n'est pas disponible (par exemple depuis Claude) |

> Les images sont rangées **en ligne**, pas dans le dossier du projet. Pour avoir les fichiers d'origine sur l'ordinateur, utilise le serveur local [`../codex-images`](../codex-images). Les deux peuvent coexister.

## Mise en ligne (une seule fois, depuis le Mac, environ 5 minutes)

Il faut : le compte Cloudflare (celui de `conseiller-neroli`), et Node.js (sinon : `brew install node`).

**0. Activer R2** (le stockage des images) : dans le tableau de bord Cloudflare → **R2** → activer. C'est gratuit jusqu'à 10 Go ; Cloudflare peut demander une carte.

**1. Récupérer le code** dans le Terminal :

```bash
git clone https://github.com/reagsgaming05-source/Atelier-Neroli.git
cd Atelier-Neroli
git checkout claude/exciting-mayer-4xnwpm
cd outils/images-cloud
npm install
```

**2. Se connecter à Cloudflare et mettre en ligne :**

```bash
npx wrangler login     # ouvre le navigateur : accepter
npx wrangler deploy    # crée le stockage tout seul, puis donne l'adresse du serveur
```

L'adresse ressemble à `https://images-briquetterie.jonathan-aljundi.workers.dev`.

**3. Choisir le mot de passe** (demandé une fois par appareil au moment de brancher le serveur) :

```bash
npx wrangler secret put MOT_DE_PASSE
```

C'est fini. Ouvre l'adresse du serveur dans le navigateur : la page doit afficher « Serveur MCP d'images ».

## Brancher Codex

Dans le Terminal (même ordinateur ou un autre), en remplaçant l'adresse par la tienne :

```bash
codex mcp add images --url https://images-briquetterie.jonathan-aljundi.workers.dev/mcp
codex mcp login images     # ouvre la page du serveur : entrer le mot de passe, puis Autoriser
```

Puis, pour qu'il travaille sans demander, dans `~/.codex/config.toml` :

```toml
[mcp_servers.images]
url = "https://images-briquetterie.jonathan-aljundi.workers.dev/mcp"
default_tools_approval_mode = "approve"
tool_timeout_sec = 300
```

Redémarre Codex et tape `/mcp` : `images` doit apparaître avec ses 7 outils. Essaie par exemple :

> Trouve une belle photo de boîte de briques de construction, enregistre-la, puis retouche-la avec ton générateur d'images : fond blanc pur, lumière de studio douce, sans rien changer à la boîte.

<details><summary>Sans passer par la page de connexion : une clé fixe</summary>

Choisis une longue clé (`openssl rand -hex 24`), règle-la sur le serveur avec `npx wrangler secret put CLE_API`, puis mets dans `config.toml` :

```toml
[mcp_servers.images]
url = "https://images-briquetterie.jonathan-aljundi.workers.dev/mcp"
http_headers = { "Authorization" = "Bearer LA-CLÉ" }
default_tools_approval_mode = "approve"
tool_timeout_sec = 300
```
</details>

## Brancher Claude (ordinateur, web, téléphone)

claude.ai → **Paramètres → Connecteurs → Ajouter un connecteur personnalisé**, adresse `https://images-briquetterie.jonathan-aljundi.workers.dev/mcp`. La page du serveur s'ouvre : mot de passe, puis Autoriser. Le connecteur est alors disponible sur tous tes appareils.

## Clés facultatives

Avec `npx wrangler secret put NOM`, puis la valeur :

| Nom | Pour quoi | Où l'obtenir |
|---|---|---|
| `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY` | de plus belles photos libres | pexels.com/api, unsplash.com/developers, pixabay.com/api/docs (gratuit) |
| `BRAVE_API_KEY` ou `SERPAPI_API_KEY` | chercher sur tout le web (photos de produits, de marques) | api-dashboard.search.brave.com, serpapi.com |
| `OPENAI_API_KEY` | `ai_edit_image` (inutile avec le générateur de Codex) | platform.openai.com |

Sans clé, la recherche passe par Openverse et Wikimedia Commons.

## Bon à savoir

- **Coût** : l'offre gratuite de Cloudflare suffit pour un usage personnel. Elle compte 100 000 requêtes par jour, 10 Go de stockage et 5 000 transformations d'images par mois ; chaque geste d'`edit_image` compte pour une transformation.
- **Sécurité** : sans le mot de passe (ou la clé), personne ne peut se servir du serveur. Les adresses des images sont publiques mais impossibles à deviner. Le serveur ne peut joindre que l'internet public.
- **Une erreur 1102 ou « exceeded CPU »** veut dire que l'offre gratuite est trop juste : l'offre Workers payante (5 $ par mois) la lève.
- **Mettre à jour** après une modification du code : `git pull`, puis `npx wrangler deploy`.

## Vérifier le serveur

`test/essai.mjs` vérifie le serveur lancé en local par `npx wrangler dev` : la connexion par mot de passe, la clé fixe, les fichiers publics et chaque outil. Il faut un fichier `.dev.vars` contenant `MOT_DE_PASSE=essai-mot-de-passe` et `CLE_API=cle-essai-123`.

La simulation locale de Cloudflare ne fait que redimensionner, recadrer, étendre le fond et tourner. Le détourage, la luminosité, le contraste, le logo et le texte ne se vérifient donc qu'une fois le serveur en ligne.
