@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Installer Compta Blonay sur ce PC
rem ==========================================================================
rem  À lancer UNE FOIS par PC, depuis le dossier du programme SUR LE SERVEUR
rem  (double-clic sur ce fichier, là où il est, à côté de ComptaBlonay.exe).
rem
rem  Il copie le programme sur ce PC, retient l'adresse du serveur, et pose sur
rem  le bureau un raccourci « Compta Blonay ». Ce raccourci met ensuite le PC à
rem  jour tout seul, à chaque lancement, dès qu'une nouvelle version est posée
rem  sur le serveur. Relancer ce fichier ne fait aucun mal.
rem ==========================================================================
set "SERVEUR=%~dp0"
if "!SERVEUR:~-1!"=="\" set "SERVEUR=!SERVEUR:~0,-1!"
if not exist "!SERVEUR!\ComptaBlonay.exe" (
  echo Ce fichier doit être lancé depuis le dossier de Compta Blonay sur le serveur,
  echo à côté de ComptaBlonay.exe. Rien n'a été installé.
  if not defined COMPTA_SANS_LANCER pause
  exit /b 1
)
echo Installation de Compta Blonay sur ce PC.
echo Version de référence : !SERVEUR!
> "%LOCALAPPDATA%\ComptaBlonay-serveur.txt" echo !SERVEUR!
rem Le lanceur vit HORS du dossier du programme : la mise à jour le réécrirait
rem pendant qu'il s'exécute, et cmd lit ses scripts au fil de l'exécution.
copy /y "!SERVEUR!\Compta Blonay.cmd" "%LOCALAPPDATA%\ComptaBlonay-lanceur.cmd" >nul
if errorlevel 1 (
  echo Impossible de copier le lanceur sur ce PC. Rien n'a été installé.
  if not defined COMPTA_SANS_LANCER pause
  exit /b 1
)
if not defined COMPTA_SANS_RACCOURCI (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$b=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $b 'Compta Blonay.lnk')); $s.TargetPath=(Join-Path $env:LOCALAPPDATA 'ComptaBlonay-lanceur.cmd'); $s.WorkingDirectory=$env:LOCALAPPDATA; $s.IconLocation=(Join-Path $env:LOCALAPPDATA 'ComptaBlonay\ComptaBlonay.exe')+',0'; $s.Description='Compta Blonay - mis a jour depuis le serveur'; $s.Save()"
  if errorlevel 1 (
    echo Le raccourci n'a pas pu être posé sur le bureau. Le programme est installé :
    echo il se lance par !LOCALAPPDATA!\ComptaBlonay-lanceur.cmd
  ) else (
    echo Raccourci « Compta Blonay » posé sur le bureau.
  )
)
call "%LOCALAPPDATA%\ComptaBlonay-lanceur.cmd"
exit /b !errorlevel!
