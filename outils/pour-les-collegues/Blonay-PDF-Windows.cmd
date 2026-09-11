@echo off
rem ============================================================
rem  Blonay PDF
rem  Ouvre l'outil dans une fenetre d'application,
rem  sans onglet ni barre d'adresse.
rem  Rien n'est installe sur le poste : ce fichier ne fait que
rem  demarrer le navigateur deja present sur la machine.
rem ============================================================
setlocal
set "PAGE=%~dp0blonay-pdf.html"
if not exist "%PAGE%" goto introuvable
set "URL=file:///%PAGE:\=/%"

set "NAV=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%NAV%" goto lancer
set "NAV=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%NAV%" goto lancer
set "NAV=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%NAV%" goto lancer
set "NAV=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%NAV%" goto lancer
set "NAV=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%NAV%" goto lancer

rem Aucun navigateur a l'emplacement habituel : ouverture classique.
start "" "%PAGE%"
goto fin

:lancer
start "" "%NAV%" --app="%URL%" --window-size=1500,950
goto fin

:introuvable
echo.
echo   Le fichier blonay-pdf.html est introuvable.
echo   Gardez les deux fichiers dans le meme dossier.
echo.
pause

:fin
endlocal
