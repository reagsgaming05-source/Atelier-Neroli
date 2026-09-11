//go:build !windows

package main

import "os/exec"

func fenetreOuverte(titre string) uintptr { return 0 }

func activerFenetre(h uintptr) {}

func cacher(cmd *exec.Cmd) {}

func ouvrirParDefaut(chemin string) error {
	return exec.Command("xdg-open", chemin).Start()
}

func alerte(titre, texte string) {
	println(titre + " : " + texte)
}
