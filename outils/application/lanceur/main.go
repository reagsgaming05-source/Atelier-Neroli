// Blonay PDF — application de bureau en un seul fichier.
//
// L'outil complet est contenu dans cet exécutable. Au lancement, il est déposé
// dans le dossier de l'utilisateur, puis affiché dans une fenêtre d'application :
// ni onglet, ni barre d'adresse, ni menu de navigateur.
//
// Aucun accès réseau : l'outil travaille uniquement en mémoire, sur les
// documents que vous lui donnez.
package main

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
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

func main() {
	page, err := deposer()
	if err != nil {
		alerte(nom, "Impossible de préparer l'application :\n\n"+err.Error())
		return
	}
	url := adresse(page)
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
			return
		}
	}
	// Aucun moteur d'affichage trouvé : ouverture par le programme par défaut.
	if err := ouvrirParDefaut(page); err != nil {
		alerte(nom, "Aucun navigateur Microsoft Edge ou Google Chrome n'a été trouvé.\n\n"+
			"Le fichier a été déposé ici :\n"+page+"\n\nOuvrez-le en double-cliquant dessus.")
	}
}
