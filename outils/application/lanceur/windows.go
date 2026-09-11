//go:build windows

package main

import (
	"os/exec"
	"syscall"
	"unsafe"
)

func cacher(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}

func ouvrirParDefaut(chemin string) error {
	return exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", chemin).Start()
}

func alerte(titre, texte string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	proc := user32.NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString(titre)
	m, _ := syscall.UTF16PtrFromString(texte)
	proc.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x00000040)
}
