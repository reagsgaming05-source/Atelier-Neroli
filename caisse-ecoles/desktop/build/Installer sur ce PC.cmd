@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Installer Compta Blonay sur ce PC
rem ==========================================================================
rem  À lancer UNE FOIS par PC, depuis le dossier du programme SUR LE SERVEUR :
rem      \\SERVEUR\Partage\ComptaBlonay\Installation sur plusieurs PC\
rem
rem  Il copie le programme sur ce PC, retient l'adresse du serveur, vérifie où
rem  sont les données de la caisse, et pose sur le bureau un raccourci
rem  « Compta Blonay ». Ce raccourci met ensuite le PC à jour tout seul, à chaque
rem  lancement, dès qu'une nouvelle version est posée sur le serveur.
rem  Relancer ce fichier ne fait aucun mal.
rem ==========================================================================
rem Lancé depuis une adresse \\SERVEUR\..., cmd commence par un avertissement sur
rem les « chemins UNC » : sans conséquence ici (tout se fait par chemins complets),
rem mais il fait croire à un échec. On l'efface.
cls
echo.
echo   INSTALLATION DE COMPTA BLONAY SUR CE PC
echo   =======================================
echo.

rem Le programme de référence est le dossier au-dessus de celui-ci.
for %%I in ("%~dp0..") do set "SERVEUR=%%~fI"
if "!SERVEUR:~-1!"=="\" set "SERVEUR=!SERVEUR:~0,-1!"
set "ICI=%LOCALAPPDATA%\ComptaBlonay"
if not exist "!SERVEUR!\ComptaBlonay.exe" (
  echo Ce fichier doit rester dans le dossier « Installation sur plusieurs PC »,
  echo à côté du programme ComptaBlonay, sur le serveur. Rien n'a été installé.
  goto echec
)
if /i "!SERVEUR!"=="!ICI!" (
  echo Ce dossier est déjà la copie de Compta Blonay installée sur ce PC.
  echo Lancez « Installer sur ce PC » depuis le dossier du programme sur le serveur.
  goto echec
)

rem Où est ce dossier ? Une lettre de lecteur réseau (Z:) est remplacée par l'adresse
rem \\SERVEUR\... qu'elle désigne : la lettre peut changer d'un PC à l'autre, pas
rem l'adresse. Un dossier de CE PC (C:, une clé USB) n'est pas un serveur : chaque PC
rem aurait sa propre caisse ; on le dit avant d'aller plus loin.
if not "!SERVEUR:~0,2!"=="\\" (
  set "GENRE="
  for /f "usebackq delims=" %%R in (`powershell -NoProfile -Command "$d=[IO.DriveInfo]::new('!SERVEUR:~0,1!'); if ($d.DriveType -eq 'Network') { $r=(Get-PSDrive -Name '!SERVEUR:~0,1!' -ErrorAction SilentlyContinue).DisplayRoot; if ($r) { $r } else { 'RESEAU' } } else { 'LOCAL' }" 2^>nul`) do set "GENRE=%%R"
  if "!GENRE:~0,2!"=="\\" set "SERVEUR=!GENRE!!SERVEUR:~2!"
  if "!GENRE!"=="LOCAL" (
    echo Ce dossier est sur ce PC, pas sur le serveur :
    echo     !SERVEUR!
    echo.
    echo Pour utiliser Compta Blonay sur ce seul PC, il n'y a rien à installer :
    echo fermez cette fenêtre et ouvrez simplement « ComptaBlonay » dans ce dossier.
    echo.
    set "REPONSE="
    set /p "REPONSE=Installer quand même depuis ce dossier ? Tapez O pour oui, N pour non, puis Entrée : "
    if /i not "!REPONSE!"=="O" goto abandon
    echo.
  )
)

rem Compta Blonay ouvert sur ce PC : ses fichiers sont verrouillés, la copie ne
rem pourrait pas se faire. On attend qu'il soit fermé.
:attendre_fermeture
tasklist /FI "IMAGENAME eq ComptaBlonay.exe" 2>nul | find /I "ComptaBlonay.exe" >nul && (
  echo Compta Blonay est ouvert sur ce PC. Fermez-le, puis appuyez sur une touche
  echo pour continuer l'installation.
  if defined COMPTA_SANS_LANCER exit /b 2
  pause >nul
  goto attendre_fermeture
)

rem Les données de la caisse : c'est donnees.txt, dans le dossier du programme sur le
rem serveur, qui les désigne pour tous les PC. Sans lui, ce PC aurait sa propre caisse,
rem vide, sans que personne s'en aperçoive. Quand il manque mais que le dossier des
rem données est à sa place habituelle (à côté du dossier du programme), on l'écrit.
for %%I in ("!SERVEUR!\..") do set "PARENT=%%~fI"
if "!PARENT:~-1!"=="\" set "PARENT=!PARENT:~0,-1!"
set "DONNEES_PROPOSEES=!PARENT!\ComptaBlonay-donnees"
if /i not "!PARENT!"=="!SERVEUR!" if not exist "!SERVEUR!\donnees.txt" if exist "!DONNEES_PROPOSEES!\caisse\" (
  (
    echo # Compta Blonay : où sont les registres, les justificatifs et les scans de TOUS les PC.
    echo # Écrit par « Installer sur ce PC ». Une seule ligne compte : l'adresse du dossier.
    echo !DONNEES_PROPOSEES!
  ) > "!SERVEUR!\donnees.txt" 2>nul
)
set "DONNEES="
if exist "!SERVEUR!\donnees.txt" for /f "usebackq eol=# delims=" %%L in ("!SERVEUR!\donnees.txt") do if not defined DONNEES set "DONNEES=%%~L"
if not defined DONNEES (
  echo ATTENTION : le serveur ne dit pas où sont les données de la caisse.
  echo Ce PC aurait sa PROPRE caisse, vide, séparée de celle des collègues.
  echo.
  echo Si la caisse est déjà sur le serveur : fermez cette fenêtre, et suivez l'étape
  echo « donnees.txt » du LISEZMOI, puis relancez « Installer sur ce PC ».
  echo.
  set "REPONSE="
  set /p "REPONSE=Continuer quand même avec une caisse propre à ce PC ? Tapez O ou N, puis Entrée : "
  if /i not "!REPONSE!"=="O" goto abandon
  echo.
)

echo Programme copié depuis : !SERVEUR!
if defined DONNEES echo Données de la caisse   : !DONNEES!
echo.
> "%LOCALAPPDATA%\ComptaBlonay-serveur.txt" echo !SERVEUR!
rem Le lanceur vit HORS du dossier du programme : la mise à jour le réécrirait
rem pendant qu'il s'exécute, et cmd lit ses scripts au fil de l'exécution.
copy /y "%~dp0lanceur.cmd" "%LOCALAPPDATA%\ComptaBlonay-lanceur.cmd" >nul
if errorlevel 1 (
  echo Impossible de copier le lanceur sur ce PC. Rien n'a été installé.
  goto echec
)
if not exist "!ICI!\ComptaBlonay.exe" (
  echo Première installation : environ 350 Mo à copier, cela peut prendre quelques
  echo minutes. Ne fermez pas cette fenêtre.
  echo.
)
set "COMPTA_SANS_DEMARRER=1"
call "%LOCALAPPDATA%\ComptaBlonay-lanceur.cmd"
set "CODE=!errorlevel!"
set "COMPTA_SANS_DEMARRER="
if not "!CODE!"=="0" goto echec

if not defined COMPTA_SANS_RACCOURCI (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$b=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $b 'Compta Blonay.lnk')); $s.TargetPath=(Join-Path $env:LOCALAPPDATA 'ComptaBlonay-lanceur.cmd'); $s.WorkingDirectory=$env:LOCALAPPDATA; $s.IconLocation=(Join-Path $env:LOCALAPPDATA 'ComptaBlonay\ComptaBlonay.exe')+',0'; $s.Description='Compta Blonay - mis a jour depuis le serveur'; $s.Save()"
  if errorlevel 1 (
    echo Le raccourci n'a pas pu être posé sur le bureau. Compta Blonay est installé :
    echo il se lance par !LOCALAPPDATA!\ComptaBlonay-lanceur.cmd
    echo.
  )
)
echo ==========================================================================
echo   Installation terminée.
echo   Désormais, ouvrez Compta Blonay avec le raccourci « Compta Blonay » du
echo   bureau : il met ce PC à jour tout seul quand une nouvelle version est
echo   posée sur le serveur.
echo ==========================================================================
echo.
if defined COMPTA_SANS_LANCER exit /b 0
echo Appuyez sur une touche pour ouvrir Compta Blonay.
pause >nul
start "" "!ICI!\ComptaBlonay.exe"
exit /b 0

:abandon
echo Rien n'a été installé.
if not defined COMPTA_SANS_LANCER pause
exit /b 1

:echec
echo.
if not defined COMPTA_SANS_LANCER pause
exit /b 1
