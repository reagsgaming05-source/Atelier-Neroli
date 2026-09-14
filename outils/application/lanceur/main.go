// Blonay PDF — application de bureau en un seul fichier.
//
// L'outil complet est contenu dans cet exécutable. Au lancement, il est déposé
// dans le dossier de l'utilisateur, puis affiché dans une fenêtre d'application :
// ni onglet, ni barre d'adresse, ni menu de navigateur.
//
// Quand l'application est le programme par défaut des PDF, Windows la lance
// avec le chemin du fichier double-cliqué : ce document s'ouvre alors
// directement, à la place de l'exemple.
//
// Aucun accès réseau : l'outil travaille uniquement en mémoire, sur les
// documents que vous lui donnez.
package main

import (
	"bytes"
	"compress/gzip"
	"crypto/rand"
	"crypto/sha256"
	_ "embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

//go:embed blonay-pdf.html.gz
var compresse []byte

// L'icône de la fenêtre doit être un vrai fichier posé à côté de la page :
// une icône encodée dans la page n'est pas chargée par le moteur d'affichage,
// et la barre des tâches affiche alors un globe générique.
//
//go:embed icon-32.png
var icone32 []byte

//go:embed icon-48.png
var icone48 []byte

//go:embed icon-256.png
var icone256 []byte

const nom = "Blonay PDF"

// Au-delà, le navigateur peinerait à avaler le document d'un bloc.
const tailleMax = 200 << 20

// Le temps laissé à la page pour lire le fichier d'ouverture avant qu'il
// soit effacé. Large : un poste lent qui démarre Edge à froid doit y tenir.
const delaiEffacement = 2 * time.Minute

// Emplacements habituels des navigateurs sur Windows.
func navigateurs() []string {
	pf := os.Getenv("ProgramFiles")
	pf86 := os.Getenv("ProgramFiles(x86)")
	local := os.Getenv("LocalAppData")
	return []string{
		filepath.Join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(pf, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(local, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(local, "Microsoft", "Edge", "Application", "msedge.exe"),
	}
}

func existe(p string) bool {
	if p == "" {
		return false
	}
	i, err := os.Stat(p)
	return err == nil && !i.IsDir()
}

// Dépose l'outil dans le dossier de l'utilisateur et renvoie son chemin.
func deposer() (string, error) {
	base := os.Getenv("LocalAppData")
	if base == "" {
		base = os.TempDir()
	}
	dossier := filepath.Join(base, nom)
	if err := os.MkdirAll(dossier, 0o755); err != nil {
		return "", err
	}
	// Nom de fichier stable : un raccourci épinglé par l'utilisateur doit
	// continuer de fonctionner après une mise à jour de l'application.
	somme := sha256.Sum256(compresse)
	version := hex.EncodeToString(somme[:8])
	cible := filepath.Join(dossier, "blonay-pdf.html")
	marque := filepath.Join(dossier, "version.txt")
	if existe(cible) {
		if connue, err := os.ReadFile(marque); err == nil && string(connue) == version {
			return cible, nil
		}
	}
	lecteur, err := gzip.NewReader(bytes.NewReader(compresse))
	if err != nil {
		return "", err
	}
	defer lecteur.Close()
	contenu, err := io.ReadAll(lecteur)
	if err != nil {
		return "", err
	}
	temporaire := cible + ".part"
	if err := os.WriteFile(temporaire, contenu, 0o644); err != nil {
		return "", err
	}
	if err := os.Rename(temporaire, cible); err != nil {
		return "", err
	}
	for nom, image := range map[string][]byte{
		"icon-32.png":  icone32,
		"icon-48.png":  icone48,
		"icon-256.png": icone256,
	} {
		os.WriteFile(filepath.Join(dossier, nom), image, 0o644)
	}
	os.WriteFile(marque, []byte(version), 0o644)
	// ménage des fichiers laissés par les versions précédentes
	if entrees, err := os.ReadDir(dossier); err == nil {
		for _, e := range entrees {
			if strings.HasPrefix(e.Name(), "blonay-pdf-") && strings.HasSuffix(e.Name(), ".html") {
				os.Remove(filepath.Join(dossier, e.Name()))
			}
		}
	}
	return cible, nil
}

func adresse(chemin string) string {
	u := strings.ReplaceAll(chemin, "\\", "/")
	u = strings.ReplaceAll(u, " ", "%20")
	if !strings.HasPrefix(u, "/") {
		u = "/" + u
	}
	return "file://" + u
}

// ---------------------------------------------------------------------
//  Documents confiés au lancement
// ---------------------------------------------------------------------

// Ce que l'outil sait ouvrir : les fichiers que Windows lui confie quand il
// est le programme par défaut, ou qu'on dépose sur son icône.
func accepte(chemin string) bool {
	switch strings.ToLower(filepath.Ext(chemin)) {
	case ".pdf", ".png", ".jpg", ".jpeg", ".webp":
		return true
	}
	return false
}

type piece struct {
	Nom string `json:"nom"`
	B64 string `json:"b64"`
}

// Dépose les documents demandés, encodés, dans un fichier d'ouverture à côté
// de la page, et renvoie son nom. Une page file:// n'a pas le droit de lire
// un fichier voisin, mais elle peut le charger comme script : c'est ce que
// fait l'outil quand son adresse porte #ouvrir=<nom>.
func deposerOuverture(dossier string, chemins []string) (string, error) {
	pieces := make([]piece, 0, len(chemins))
	for _, c := range chemins {
		contenu, err := os.ReadFile(c)
		if err != nil {
			return "", err
		}
		if len(contenu) > tailleMax {
			return "", fmt.Errorf("%s dépasse %d Mo", filepath.Base(c), tailleMax>>20)
		}
		pieces = append(pieces, piece{Nom: filepath.Base(c), B64: base64.StdEncoding.EncodeToString(contenu)})
	}
	js, err := json.Marshal(pieces)
	if err != nil {
		return "", err
	}
	aleatoire := make([]byte, 12)
	if _, err := rand.Read(aleatoire); err != nil {
		return "", err
	}
	nomFichier := "ouverture-" + hex.EncodeToString(aleatoire) + ".js"
	contenu := append(append([]byte("window.__blonayOuvrir="), js...), ';')
	if err := os.WriteFile(filepath.Join(dossier, nomFichier), contenu, 0o600); err != nil {
		return "", err
	}
	return nomFichier, nil
}

// Efface un fichier d'ouverture : vidé puis supprimé, pour qu'aucune copie
// du document ne traîne dans le dossier.
func effacer(chemin string) {
	os.Truncate(chemin, 0)
	os.Remove(chemin)
}

// Les fichiers d'ouverture d'un lancement précédent qui n'auraient pas été
// effacés (fermeture forcée, coupure de courant).
func menageOuvertures(dossier string) {
	entrees, err := os.ReadDir(dossier)
	if err != nil {
		return
	}
	for _, e := range entrees {
		if !strings.HasPrefix(e.Name(), "ouverture-") || !strings.HasSuffix(e.Name(), ".js") {
			continue
		}
		if i, err := e.Info(); err == nil && time.Since(i.ModTime()) > delaiEffacement {
			effacer(filepath.Join(dossier, e.Name()))
		}
	}
}

func main() {
	// Les documents reçus sur la ligne de commande : double-clic sur un PDF
	// dont l'application est le programme par défaut, ou dépôt sur son icône.
	var demandes []string
	for _, a := range os.Args[1:] {
		if accepte(a) && existe(a) {
			demandes = append(demandes, a)
		}
	}

	// Comme toute application, un second lancement revient à la fenêtre
	// déjà ouverte au lieu d'en ouvrir une deuxième. Un document à ouvrir,
	// lui, a droit à sa propre fenêtre.
	if len(demandes) == 0 {
		if h := fenetreOuverte(nom); h != 0 {
			activerFenetre(h)
			return
		}
	}

	page, err := deposer()
	if err != nil {
		alerte(nom, "Impossible de préparer l'application :\n\n"+err.Error())
		return
	}
	dossier := filepath.Dir(page)
	menageOuvertures(dossier)

	url := adresse(page)
	ouverture := ""
	if len(demandes) > 0 {
		o, err := deposerOuverture(dossier, demandes)
		if err != nil {
			alerte(nom, "Le document n'a pas pu être préparé :\n\n"+err.Error())
		} else {
			ouverture = filepath.Join(dossier, o)
			url += "#ouvrir=" + o
		}
	}

	lance := false
	for _, nav := range navigateurs() {
		if !existe(nav) {
			continue
		}
		// Le moteur d'affichage est lancé sans aucune fonction de découverte
		// réseau : rien n'écoute, donc le pare-feu n'a rien à signaler.
		cmd := exec.Command(nav,
			"--app="+url,
			"--window-size=1500,950",
			"--no-first-run",
			"--no-default-browser-check",
			"--no-service-autorun",
			"--no-pings",
			"--media-router=0",
			"--disable-background-networking",
			"--disable-component-update",
			"--disable-default-apps",
			"--disable-sync",
			"--disable-client-side-phishing-detection",
			"--disable-component-extensions-with-background-pages",
			"--disable-features=MediaRouter,DialMediaRouteProvider,CastMediaRouteProvider,"+
				"MediaRouterComponentExtension,Translate,OptimizationHints,NetworkTimeServiceQuerying",
		)
		cacher(cmd)
		if err := cmd.Start(); err == nil {
			lance = true
			break
		}
	}
	if !lance {
		// Aucun moteur d'affichage trouvé : ouverture par le programme par
		// défaut. Avec un document, c'est l'adresse complète qu'il faut lui
		// donner, pour que #ouvrir=… arrive jusqu'à la page.
		cible := page
		if ouverture != "" {
			cible = url
		}
		if err := ouvrirParDefaut(cible); err != nil {
			alerte(nom, "Aucun navigateur Microsoft Edge ou Google Chrome n'a été trouvé.\n\n"+
				"Le fichier a été déposé ici :\n"+page+"\n\nOuvrez-le en double-cliquant dessus.")
		}
	}

	// Le temps que la page lise le fichier d'ouverture, puis plus aucune
	// copie du document sur le disque.
	if ouverture != "" {
		time.Sleep(delaiEffacement)
		effacer(ouverture)
	}
}
