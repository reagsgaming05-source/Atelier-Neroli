# Images du web pour Codex

Un serveur MCP qui donne à Codex de quoi **chercher des images sur internet, les télécharger dans le projet et les voir**, pour qu'il les **retouche avec son propre générateur d'images**, seul, sans rien demander.

Une version en ligne, sans rien à installer sur chaque ordinateur, se trouve dans [`../images-cloud`](../images-cloud).

## Pourquoi Codex n'y arrive pas tout seul

1. **Le réseau est coupé dans ses commandes.** Codex exécute ses commandes (`curl`, `python`…) dans un bac à sable sans internet. Sa recherche web lui donne des pages et des liens, mais il n'a aucun moyen de télécharger le fichier. Dans l'application Codex, le réglage `network_access = true` n'est même pas pris en compte.
2. **Il ne « voit » pas un fichier qu'il n'a pas.** Pour juger une retouche, l'image doit lui être renvoyée. Sans le fichier, il travaille à l'aveugle.
3. **Pas de Pillow dans le bac à sable**, et sans réseau il ne peut pas l'installer.

Le serveur règle les trois problèmes. Codex le lance hors du bac à sable, donc il a internet. Chaque outil renvoie l'image elle-même au modèle (vignettes, aperçu, avant/après), et toutes les retouches sont faites par le serveur.

## Ce que Codex peut faire avec

La retouche est faite par **le générateur d'images de Codex** (`image_gen`). `download_image` lui donne le chemin du fichier, et Codex le passe à son générateur avec `referenced_image_paths`. Le résultat est rangé par Codex dans `generated_images/`. Il faut un abonnement ChatGPT payant (le générateur n'existe pas sur l'offre gratuite).

| Outil | Rôle |
|---|---|
| `search_images` | Cherche des images. Renvoie la liste (numéro `r1`, `r2`…, taille, licence, auteur) et **une planche de vignettes numérotées** que le modèle regarde pour choisir. |
| `download_image` | Télécharge un résultat (`"r3"`), l'adresse directe d'une image, ou une page web, dont il prend l'image principale. Le fichier va dans `originaux/`, avec un `.json` qui note la source, l'auteur et la licence. |
| `view_image` | Montre une image enregistrée. |
| `edit_image` | Gestes exacts sans IA, sans clé ni coût : recadrage (dont format 16:9, 1:1…), redimensionnement, redressement, **perspective (façades, murs)**, contraste et balance des blancs automatiques, niveaux, luminosité, saturation, température, netteté, débruitage, vignettage, noir et blanc, fond étendu, texte, logo. Le résultat va dans `retouches/` et l'outil montre l'avant/après. L'original n'est jamais modifié. |
| `ai_edit_image` | Retouche IA par l'API OpenAI, seulement si le générateur de Codex n'est pas disponible. Il faut une clé OpenAI. |
| `compare_images` | Met plusieurs images côte à côte pour choisir. |
| `list_images` | Liste les images, avec les crédits à citer sur le site. |

Par défaut, la recherche se limite aux **images libres d'usage commercial et modifiables** : c'est ce qu'il faut pour le site d'une entreprise. Une photo prise au hasard sur Google n'est pas libre de droits.

## Installation

### 1. Installer uv

uv lance le serveur et installe tout seul ce dont il a besoin.

- Windows (PowerShell) : `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
- Mac / Linux : `curl -LsSf https://astral.sh/uv/install.sh | sh`

### 2. Copier le dossier

Copie ce dossier `codex-images` où tu veux, par exemple `C:\Users\<toi>\outils\codex-images`.

### 3. Déclarer le serveur à Codex

Ajoute ceci à `~/.codex/config.toml` (sous Windows : `C:\Users\<toi>\.codex\config.toml`). Un modèle complet se trouve dans [`config.toml.exemple`](config.toml.exemple).

```toml
[mcp_servers.images]
command = "uv"
args = ["run", "--script", "C:/Users/<toi>/outils/codex-images/serveur_images.py"]
startup_timeout_sec = 120              # au premier lancement, uv installe les paquets
tool_timeout_sec = 300                 # une retouche par IA peut prendre une à deux minutes
default_tools_approval_mode = "approve"  # aucune demande de confirmation pour ces outils

[mcp_servers.images.env]
IMAGES_DIR = "C:/Users/<toi>/projets/briqueterie/images"   # où ranger les images : dans le projet
```

Tu peux aussi passer par la commande :

```
codex mcp add images --env IMAGES_DIR=C:/Users/<toi>/projets/briqueterie/images -- uv run --script C:/Users/<toi>/outils/codex-images/serveur_images.py
```

Sans uv : `pip install -r requirements.txt`, puis `command = "python"` et `args = ["C:/…/serveur_images.py"]`.

### 4. Le laisser travailler seul

Dans le même `config.toml` :

```toml
approval_policy = "never"        # Codex ne s'arrête plus pour demander
sandbox_mode = "workspace-write" # il écrit librement dans le projet, nulle part ailleurs
```

Ensuite, copie [`AGENTS.exemple.md`](AGENTS.exemple.md) dans le projet de la briqueterie sous le nom `AGENTS.md`, ou ajoute son contenu à ton `AGENTS.md`. Codex y apprend la démarche : chercher, choisir sur la planche, télécharger, retoucher, vérifier, noter les crédits.

### 5. Vérifier

Redémarre Codex, puis tape `/mcp` : le serveur `images` doit apparaître avec ses 7 outils. Essaie par exemple :

> Trouve une belle photo de boîte de briques de construction, télécharge-la, puis retouche-la avec ton générateur d'images : fond blanc pur, lumière de studio douce, sans rien changer à la boîte.

## Clés facultatives (meilleurs résultats)

Sans aucune clé, la recherche passe par **Openverse** et **Wikimedia Commons** : gratuit, libre de droits, mais souvent moins « pro ». Avec une clé gratuite des banques de photos, les images sont nettement plus belles. Ajoute chaque clé sous `[mcp_servers.images.env]` :

| Variable | Où l'obtenir | Coût |
|---|---|---|
| `PEXELS_API_KEY` | pexels.com/api | gratuit |
| `UNSPLASH_ACCESS_KEY` | unsplash.com/developers (« Access Key ») | gratuit |
| `PIXABAY_API_KEY` | pixabay.com/api/docs | gratuit |
| `BRAVE_API_KEY` | api-dashboard.search.brave.com (recherche sur tout le web, `source="web"`) | offre gratuite limitée |
| `SERPAPI_API_KEY` | serpapi.com (Google Images, `source="web"`) | offre gratuite limitée |
| `OPENAI_API_KEY` | platform.openai.com (pour `ai_edit_image`) | payant à l'usage |
| `OPENAI_IMAGE_MODEL` | modèle d'image à utiliser | `gpt-image-1` par défaut |

`config.toml` reste sur ton ordinateur : ne le mets pas dans un dépôt avec tes clés dedans.

## Sécurité

- Le serveur écrit **uniquement** dans `IMAGES_DIR`, jamais par-dessus un fichier existant.
- Il refuse de télécharger depuis le réseau local (box, NAS, `localhost`). Une page web piégée ne peut donc pas s'en servir pour fouiller ton réseau.
- Taille maximale d'un fichier : 40 Mo (`IMAGES_MAX_MB` pour changer).

## Vérifier le serveur

`test_serveur.py` vérifie le serveur sans internet. Il monte un faux site d'images sur l'ordinateur : les « photos » de ce site sont des murs de briques dessinés par le script, pas de vraies images. Puis il fait jouer à un client le rôle de Codex :

```
uv run --with mcp --with httpx --with pillow python test_serveur.py
```
