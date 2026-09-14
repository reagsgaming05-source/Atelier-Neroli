//go:build windows

package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
	"unicode/utf16"
	"unsafe"

	"github.com/jchv/go-webview2"
	"github.com/jchv/go-webview2/webviewloader"
	"golang.org/x/sys/windows"
)

// ---------------------------------------------------------------------
//  La fenêtre de l'application
// ---------------------------------------------------------------------
//
// Une fenêtre Windows ordinaire, avec le moteur d'affichage WebView2 dedans —
// celui que Windows 10 et 11 embarquent. Ni onglet, ni barre d'adresse, ni
// profil de navigateur, ni Edge dans la barre des tâches : une application,
// qui ne s'installe pas. Enregistrer ouvre la boîte « Enregistrer sous » de
// Windows ; fermer demande confirmation si des modifications n'ont pas été
// exportées. Sans WebView2 sur le poste, on revient au navigateur.

func fenetreNative(page, url string, pieces []piece) bool {
	v, err := webviewloader.GetInstalledVersion()
	if err != nil || v == "" {
		log.Printf("WebView2 absent (%v)", err)
		return false
	}
	log.Printf("WebView2 %s", v)
	dossier := filepath.Dir(page)
	// Le moteur imprime directement (la page le sait : #impression=directe)
	// et ne cherche rien sur le réseau.
	os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", strings.Join([]string{
		"--kiosk-printing",
		"--disable-background-networking",
		"--disable-component-update",
		"--no-pings",
		"--disable-features=MediaRouter,DialMediaRouteProvider,CastMediaRouteProvider,Translate,OptimizationHints,NetworkTimeServiceQuerying",
	}, " "))
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		DataPath:  filepath.Join(dossier, "profil-webview"),
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title: nom, Width: 1500, Height: 950, IconId: 1, Center: true,
		},
	})
	if w == nil {
		log.Printf("la fenêtre n'a pas pu être créée")
		return false
	}
	defer w.Destroy()
	log.Printf("fenêtre ouverte")
	w.SetSize(880, 560, webview2.HintMin)

	// Les documents reçus, injectés avant le premier script de la page :
	// aucune copie sur le disque.
	if len(pieces) > 0 {
		if js, err := json.Marshal(pieces); err == nil {
			w.Init("window.__blonayOuvrir=" + string(js) + ";")
		}
	}
	poserEnregistrement(w)
	poserFermeture(w)
	w.Navigate(url)
	w.Run()
	return true
}

// ---------------------------------------------------------------------
//  Enregistrer sous… : la boîte de Windows, le fichier écrit par morceaux
// ---------------------------------------------------------------------

type enregistrement struct {
	f      *os.File
	chemin string
}

var (
	enregistrements = map[int]*enregistrement{}
	enregSeq        int
	enregMu         sync.Mutex
)

func poserEnregistrement(w webview2.WebView) {
	// La page demande d'abord où enregistrer, puis envoie le contenu par
	// morceaux, puis termine. En cas d'échec de la boîte, elle se rabat sur
	// le téléchargement du moteur.
	w.Bind("blonayEnregistrerDebut", func(nomPropose string) (map[string]interface{}, error) {
		chemin, annule, err := dialogueEnregistrer(uintptr(w.Window()), nomPropose)
		if err != nil {
			log.Printf("enregistrer : %v", err)
			return map[string]interface{}{"erreur": err.Error()}, nil
		}
		if annule {
			return map[string]interface{}{"annule": true}, nil
		}
		f, err := os.Create(chemin + ".part")
		if err != nil {
			return map[string]interface{}{"erreur": err.Error()}, nil
		}
		enregMu.Lock()
		enregSeq++
		jeton := enregSeq
		enregistrements[jeton] = &enregistrement{f: f, chemin: chemin}
		enregMu.Unlock()
		return map[string]interface{}{"jeton": jeton, "chemin": chemin}, nil
	})
	w.Bind("blonayEnregistrerBout", func(jeton int, b64 string) error {
		enregMu.Lock()
		e := enregistrements[jeton]
		enregMu.Unlock()
		if e == nil {
			return errors.New("enregistrement inconnu")
		}
		octets, err := base64.StdEncoding.DecodeString(b64)
		if err != nil {
			return err
		}
		_, err = e.f.Write(octets)
		return err
	})
	w.Bind("blonayEnregistrerFin", func(jeton int) (string, error) {
		enregMu.Lock()
		e := enregistrements[jeton]
		delete(enregistrements, jeton)
		enregMu.Unlock()
		if e == nil {
			return "", errors.New("enregistrement inconnu")
		}
		if err := e.f.Close(); err != nil {
			return "", err
		}
		os.Remove(e.chemin)
		if err := os.Rename(e.chemin+".part", e.chemin); err != nil {
			return "", err
		}
		return e.chemin, nil
	})
	w.Bind("blonayEnregistrerAbandon", func(jeton int) error {
		enregMu.Lock()
		e := enregistrements[jeton]
		delete(enregistrements, jeton)
		enregMu.Unlock()
		if e != nil {
			e.f.Close()
			os.Remove(e.chemin + ".part")
		}
		return nil
	})
}

// OPENFILENAMEW, tel que Windows l'attend (152 octets en 64 bits).
type openFileNameW struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        uintptr
	dwReserved        uint32
	flagsEx           uint32
}

const (
	ofnOverwritePrompt = 0x00000002
	ofnNoChangeDir     = 0x00000008
	ofnPathMustExist   = 0x00000800
	ofnExplorer        = 0x00080000
)

var (
	comdlg32                 = windows.NewLazySystemDLL("comdlg32.dll")
	procGetSaveFileNameW     = comdlg32.NewProc("GetSaveFileNameW")
	procCommDlgExtendedError = comdlg32.NewProc("CommDlgExtendedError")
)

// Une suite de chaînes terminées par des zéros, comme l'attend le filtre.
func filtreUTF16(segments ...string) []uint16 {
	var out []uint16
	for _, s := range segments {
		out = append(out, utf16.Encode([]rune(s))...)
		out = append(out, 0)
	}
	return append(out, 0)
}

func dialogueEnregistrer(hwnd uintptr, nomPropose string) (chemin string, annule bool, err error) {
	if unsafe.Sizeof(openFileNameW{}) != 152 {
		return "", false, errors.New("structure de dialogue inattendue")
	}
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(nomPropose), "."))
	var filtre []uint16
	switch ext {
	case "pdf":
		filtre = filtreUTF16("Document PDF (*.pdf)", "*.pdf", "Tous les fichiers (*.*)", "*.*")
	case "zip":
		filtre = filtreUTF16("Archive ZIP (*.zip)", "*.zip", "Tous les fichiers (*.*)", "*.*")
	case "png", "jpg", "jpeg":
		filtre = filtreUTF16("Image (*."+ext+")", "*."+ext, "Tous les fichiers (*.*)", "*.*")
	case "txt":
		filtre = filtreUTF16("Texte (*.txt)", "*.txt", "Tous les fichiers (*.*)", "*.*")
	default:
		filtre = filtreUTF16("Tous les fichiers (*.*)", "*.*")
	}
	tampon := make([]uint16, 32768)
	nomW, err := windows.UTF16FromString(nomPropose)
	if err != nil {
		return "", false, err
	}
	copy(tampon, nomW)
	titre, _ := windows.UTF16PtrFromString("Enregistrer sous")
	var defExt *uint16
	if ext != "" {
		defExt, _ = windows.UTF16PtrFromString(ext)
	}
	ofn := openFileNameW{
		lStructSize:  uint32(unsafe.Sizeof(openFileNameW{})),
		hwndOwner:    hwnd,
		lpstrFilter:  &filtre[0],
		nFilterIndex: 1,
		lpstrFile:    &tampon[0],
		nMaxFile:     uint32(len(tampon)),
		lpstrTitle:   titre,
		flags:        ofnOverwritePrompt | ofnPathMustExist | ofnNoChangeDir | ofnExplorer,
		lpstrDefExt:  defExt,
	}
	r, _, _ := procGetSaveFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	runtime.KeepAlive(filtre)
	runtime.KeepAlive(tampon)
	runtime.KeepAlive(titre)
	runtime.KeepAlive(defExt)
	if r == 0 {
		code, _, _ := procCommDlgExtendedError.Call()
		if code == 0 {
			return "", true, nil
		}
		return "", false, fmt.Errorf("boîte d'enregistrement : erreur %d", code)
	}
	return windows.UTF16ToString(tampon), false, nil
}

// ---------------------------------------------------------------------
//  Fermeture : la page a le dernier mot
// ---------------------------------------------------------------------

// user32 est déclaré dans windows.go.
var (
	procSetWindowLongPtrW = user32.NewProc("SetWindowLongPtrW")
	procCallWindowProcW   = user32.NewProc("CallWindowProcW")
	procDestroyWindow     = user32.NewProc("DestroyWindow")
)

const (
	gwlpWndProc = ^uintptr(3) // -4
	wmClose     = 0x0010
)

// La fenêtre ne se ferme pas d'un coup : la page vérifie d'abord si des
// modifications n'ont pas été exportées et, le cas échéant, demande. Elle
// répond par blonayQuitter(true) pour partir, (false) pour rester. Sans
// réponse en deux secondes (page figée), on part quand même.
func poserFermeture(w webview2.WebView) {
	hwnd := uintptr(w.Window())
	var (
		mu       sync.Mutex
		attente  bool
		original uintptr
	)
	fermer := func() {
		w.Dispatch(func() { procDestroyWindow.Call(hwnd) })
	}
	w.Bind("blonayQuitter", func(oui bool) error {
		mu.Lock()
		enAttente := attente
		attente = false
		mu.Unlock()
		if oui && enAttente {
			fermer()
		}
		return nil
	})
	proc := windows.NewCallback(func(h, msg, wp, lp uintptr) uintptr {
		if msg == wmClose {
			mu.Lock()
			deja := attente
			attente = true
			mu.Unlock()
			if !deja {
				w.Eval("(window.__blonayFermer ? window.__blonayFermer() : window.blonayQuitter(true))")
				go func() {
					time.Sleep(2 * time.Second)
					mu.Lock()
					toujours := attente
					mu.Unlock()
					if toujours {
						// La page n'a pas répondu : on considère qu'elle n'a
						// rien à défendre.
						mu.Lock()
						attente = false
						mu.Unlock()
						fermer()
					}
				}()
			}
			return 0
		}
		r, _, _ := procCallWindowProcW.Call(original, h, msg, wp, lp)
		return r
	})
	original, _, _ = procSetWindowLongPtrW.Call(hwnd, gwlpWndProc, proc)
}
