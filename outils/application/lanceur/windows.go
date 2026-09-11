//go:build windows

package main

import (
	"os/exec"
	"strings"
	"syscall"
	"unsafe"
)

var (
	user32            = syscall.NewLazyDLL("user32.dll")
	procEnumWindows   = user32.NewProc("EnumWindows")
	procGetClassName  = user32.NewProc("GetClassNameW")
	procGetWindowText = user32.NewProc("GetWindowTextW")
	procIsVisible     = user32.NewProc("IsWindowVisible")
	procIsIconic      = user32.NewProc("IsIconic")
	procShowWindow    = user32.NewProc("ShowWindow")
	procSetForeground = user32.NewProc("SetForegroundWindow")
	procSwitchTo      = user32.NewProc("SwitchToThisWindow")
	procMessageBox    = user32.NewProc("MessageBoxW")
)

// Les fenêtres du moteur d'affichage portent cette classe.
const classeFenetre = "Chrome_WidgetWin_1"

func texte(proc *syscall.LazyProc, h uintptr, taille int) string {
	tampon := make([]uint16, taille)
	proc.Call(h, uintptr(unsafe.Pointer(&tampon[0])), uintptr(taille))
	return syscall.UTF16ToString(tampon)
}

// Cherche une fenêtre déjà ouverte de l'application.
func fenetreOuverte(titre string) uintptr {
	var trouvee uintptr
	rappel := syscall.NewCallback(func(h uintptr, _ uintptr) uintptr {
		if visible, _, _ := procIsVisible.Call(h); visible == 0 {
			return 1
		}
		if texte(procGetClassName, h, 128) != classeFenetre {
			return 1
		}
		// Le titre de la fenêtre est celui de la page ; certains moteurs
		// y ajoutent un suffixe.
		if !strings.HasPrefix(texte(procGetWindowText, h, 256), titre) {
			return 1
		}
		trouvee = h
		return 0 // fenêtre trouvée, on arrête le parcours
	})
	procEnumWindows.Call(rappel, 0)
	return trouvee
}

// Ramène au premier plan la fenêtre déjà ouverte.
func activerFenetre(h uintptr) {
	if reduite, _, _ := procIsIconic.Call(h); reduite != 0 {
		procShowWindow.Call(h, 9) // SW_RESTORE
	}
	if ok, _, _ := procSetForeground.Call(h); ok == 0 {
		procSwitchTo.Call(h, 1)
	}
}

func cacher(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}

func ouvrirParDefaut(chemin string) error {
	return exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", chemin).Start()
}

func alerte(titre, texte string) {
	t, _ := syscall.UTF16PtrFromString(titre)
	m, _ := syscall.UTF16PtrFromString(texte)
	procMessageBox.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x00000040)
}
