"""Décompte DGEO — automatisation des décomptes de courses d'école et de camps.

Lit un dossier PDF scanné (formulaire de décompte + pièces justificatives),
en extrait les pièces, propose la part à charge de l'État de Vaud pour les
accompagnants titrés et génère le fichier Excel « Décompte DGEO ».

Tout le traitement est local (Tesseract OCR) : aucune donnée ne quitte le poste.
"""

__version__ = "0.1.0"
