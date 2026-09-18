package main

import (
	"log"
	"os"
	"path/filepath"
)

// Le journal : blonay.log à côté de l'exécutable, comme dans une application
// portable — ou dans le dossier de l'application si ce dossier n'est pas
// inscriptible. Il ne note que ce que fait le lanceur (fenêtre, repli,
// erreurs), jamais le nom ni le contenu d'un document.
func ouvrirJournal(dossierApp string) {
	candidats := []string{}
	if exe, err := os.Executable(); err == nil {
		candidats = append(candidats, filepath.Join(filepath.Dir(exe), "blonay.log"))
	}
	candidats = append(candidats, filepath.Join(dossierApp, "blonay.log"))
	for _, c := range candidats {
		// Un journal qui enfle ne sert à rien : au-delà d'un demi-méga, on repart de zéro.
		if i, err := os.Stat(c); err == nil && i.Size() > 512<<10 {
			os.Remove(c)
		}
		f, err := os.OpenFile(c, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
		if err != nil {
			continue
		}
		log.SetOutput(f)
		log.SetFlags(log.Ldate | log.Ltime)
		return
	}
	log.SetOutput(os.Stderr)
}
