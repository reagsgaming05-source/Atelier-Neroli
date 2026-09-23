@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Compta Blonay
rem ==========================================================================
rem  Compta Blonay : lance le programme de CE PC, après l'avoir remis à jour
rem  depuis le serveur quand une nouvelle version y a été posée.
rem
rem  Le programme tourne toujours depuis ce PC (%LOCALAPPDATA%\ComptaBlonay) :
rem  lancé à travers le réseau, il est lent et la sécurité du réseau le bloque.
rem  Le serveur ne sert qu'à distribuer la dernière version - une seule copie à
rem  remplacer, et chaque poste se met à jour à son prochain lancement.
rem
rem  Posé par « Installer sur ce PC.cmd ». Aucune connexion à Internet.
rem ==========================================================================
set "ICI=%LOCALAPPDATA%\ComptaBlonay"
set "REGLAGE=%LOCALAPPDATA%\ComptaBlonay-serveur.txt"
set "VERROU=%LOCALAPPDATA%\ComptaBlonay-maj.verrou"
set "SERVEUR="
if exist "%REGLAGE%" set /p SERVEUR=<"%REGLAGE%"

rem Un seul lanceur à la fois met ce PC à jour : un second double-clic pendant une
rem copie attend qu'elle se termine, au lieu de copier par-dessus. Le verrou, c'est
rem le fichier tenu ouvert en écriture par le bloc ci-dessous ; Windows le relâche quand
rem ce lanceur se termine, même fermé en pleine copie : il ne reste jamais bloqué.
set /a ATTENTE=0
:verrou
2>nul (
  9>"%VERROU%" (
    call :mettre_a_jour
    (call )
  )
) || (
  set /a ATTENTE+=1
  if !ATTENTE!==1 echo Une mise à jour est déjà en cours sur ce PC : on attend qu'elle se termine...
  if !ATTENTE! lss 600 ( ping -n 2 127.0.0.1 >nul & goto verrou )
)

if not exist "%ICI%\ComptaBlonay.exe" (
  echo Compta Blonay n'est pas encore installé sur ce PC.
  echo Lancez « Installer sur ce PC » depuis le dossier du programme sur le serveur.
  if not defined COMPTA_SANS_LANCER pause
  exit /b 1
)
if not defined COMPTA_SANS_LANCER start "" "%ICI%\ComptaBlonay.exe"

rem Le lanceur se tient lui-même à jour, avec la copie reçue du serveur - sinon une
rem correction du lanceur obligerait à repasser sur chaque PC. En dernier, et sur
rem UNE ligne : cmd relit son script au fil de l'exécution, mais une ligne est lue
rem en entier avant de s'exécuter ; la remplacer pendant qu'elle tourne ne coupe rien.
if exist "%ICI%\Compta Blonay.cmd" (fc /b "%ICI%\Compta Blonay.cmd" "%~f0" >nul 2>&1 || copy /y "%ICI%\Compta Blonay.cmd" "%~f0" >nul 2>&1) & exit /b 0
exit /b 0


:mettre_a_jour
rem Déjà ouvert sur ce PC : ses fichiers sont verrouillés, et une copie par-dessus
rem mélangerait deux versions. On se contente de le rappeler au premier plan.
tasklist /FI "IMAGENAME eq ComptaBlonay.exe" 2>nul | find /I "ComptaBlonay.exe" >nul && exit /b 0

if not defined SERVEUR exit /b 0
echo Recherche d'une nouvelle version sur le serveur...
if not exist "!SERVEUR!\ComptaBlonay.exe" (
  echo Serveur injoignable : !SERVEUR!
  echo Compta Blonay démarre avec la version déjà présente sur ce PC.
  exit /b 0
)

rem Même version des deux côtés : rien à copier, le démarrage reste immédiat.
rem Sans version sur le serveur, on ne peut rien comparer : on recopie.
set "V_SERVEUR="
set "V_ICI="
if exist "!SERVEUR!\version.txt" set /p V_SERVEUR=<"!SERVEUR!\version.txt"
if exist "!ICI!\version.txt" set /p V_ICI=<"!ICI!\version.txt"
if exist "!ICI!\ComptaBlonay.exe" if defined V_SERVEUR if "!V_SERVEUR!"=="!V_ICI!" goto reglages

echo Mise à jour de Compta Blonay depuis le serveur. Ne fermez pas cette fenêtre...
rem /MIR : ce PC devient la copie exacte du serveur, fichiers retirés compris.
rem Sauf, et par leur chemin complet (un nom seul viserait aussi les sous-dossiers) :
rem  - data\         le profil de ce poste et son journal ;
rem  - version.txt   noté en dernier, voir plus bas ;
rem  - donnees.txt, vocabulaire-noms.js : traités à part, voir « reglages ».
robocopy "!SERVEUR!" "!ICI!" /MIR /XD "!SERVEUR!\data" "!ICI!\data" /XF "!SERVEUR!\version.txt" "!ICI!\version.txt" "!SERVEUR!\donnees.txt" "!ICI!\donnees.txt" "!SERVEUR!\vocabulaire-noms.js" "!ICI!\vocabulaire-noms.js" /R:2 /W:3 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo La copie depuis le serveur n'a pas abouti : elle reprendra au prochain lancement.
  ping -n 4 127.0.0.1 >nul
  exit /b 0
)
rem La version n'est notée qu'une fois tout le reste copié : une copie interrompue
rem est ainsi reprise au lancement suivant, au lieu de passer pour terminée.
if exist "!SERVEUR!\version.txt" copy /y "!SERVEUR!\version.txt" "!ICI!\version.txt" >nul

:reglages
rem Ce qui se règle une fois pour tous les postes, sur le serveur : l'emplacement
rem des données partagées et le fichier des noms. Absents du serveur, on garde ceux
rem de ce PC : effacer donnees.txt renverrait ce poste sur une caisse à part.
for %%F in (donnees.txt vocabulaire-noms.js) do (
  if exist "!SERVEUR!\%%F" copy /y "!SERVEUR!\%%F" "!ICI!\%%F" >nul
)
exit /b 0
