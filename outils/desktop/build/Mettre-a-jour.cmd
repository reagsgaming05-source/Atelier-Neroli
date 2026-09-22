@echo off
rem ===========================================================================
rem  Blonay PDF - mise a jour de la version portable.
rem
rem  Posez le zip telecharge sur ce fichier, ou double-cliquez simplement :
rem  le zip est cherche a cote, puis dans vos telechargements.
rem
rem  Ce script ne va rien chercher sur Internet et n'envoie rien : il se
rem  contente de remplacer les fichiers du dossier par ceux du zip.
rem
rem  Il ne touche jamais au sous-dossier "data" : vos tampons, votre signature
rem  memorisee, vos fichiers recents et le travail mis de cote y vivent, et
rem  une mise a jour n'a aucune raison de les emporter.
rem
rem  (Les commentaires de ce fichier sont sans accents : ils sont lus par
rem  cmd.exe, dont le comportement sur les accents depend du poste. Les
rem  messages affiches, eux, passent par la page de code 65001 ci-dessous.)
rem ===========================================================================
chcp 65001 >nul 2>&1
setlocal EnableExtensions

rem Le script se recopie dans un dossier temporaire et se relance de la :
rem sinon il se ferait remplacer par sa propre nouvelle version pendant que
rem cmd.exe le lit encore, ligne par ligne, et l'execution partirait en vrille.
if defined BLONAY_MAJ goto :travail
set "BLONAY_MAJ=1"
set "COPIE=%TEMP%\blonay-maj-%RANDOM%%RANDOM%.cmd"
copy /y "%~f0" "%COPIE%" >nul
if errorlevel 1 (
  echo Impossible de se copier dans le dossier temporaire.
  pause
  exit /b 1
)
call "%COPIE%" "%~dp0" "%~1"
set "SORTIE=%ERRORLEVEL%"
del "%COPIE%" >nul 2>&1
exit /b %SORTIE%

:travail
set "DOSSIER=%~1"
set "ZIP=%~2"
echo.
echo   Blonay PDF — mise à jour
echo   ════════════════════════
echo.
echo   Dossier de l'application : %DOSSIER%
echo.

rem --- 1. Retrouver le zip ---------------------------------------------------
if not "%ZIP%"=="" goto :zip_trouve
if exist "%DOSSIER%BlonayPDF-windows.zip" (
  set "ZIP=%DOSSIER%BlonayPDF-windows.zip"
  goto :zip_trouve
)
if exist "%USERPROFILE%\Downloads\BlonayPDF-windows.zip" (
  set "ZIP=%USERPROFILE%\Downloads\BlonayPDF-windows.zip"
  goto :zip_trouve
)
echo   Le zip de la nouvelle version est introuvable.
echo.
echo   Téléchargez « BlonayPDF-windows.zip », puis posez-le sur ce fichier
echo   ou déposez-le à côté de BlonayPDF.exe avant de relancer.
goto :echec

:zip_trouve
if not exist "%ZIP%" (
  echo   Fichier introuvable : %ZIP%
  goto :echec
)
echo   Nouvelle version : %ZIP%
echo.

rem --- 2. L'application doit etre fermee -------------------------------------
rem Windows verrouille un executable en cours : la copie echouerait a moitie.
rem Lancee par l'application elle-meme (BLONAY_MAJ_AUTO), la mise a jour attend
rem qu'elle finisse de se fermer : refuser une seconde trop tot obligerait a
rem tout recommencer a la main.
set "ESSAIS=0"
set "ANNONCE="
:attente
tasklist /FI "IMAGENAME eq BlonayPDF.exe" 2>nul | find /I "BlonayPDF.exe" >nul
if errorlevel 1 goto :fermee
if not defined BLONAY_MAJ_AUTO goto :ouverte
if not defined ANNONCE (
  set "ANNONCE=1"
  echo   Attente de la fermeture de Blonay PDF…
)
set /a ESSAIS+=1
if %ESSAIS% GEQ 30 goto :ouverte
rem Une minute au plus, deux secondes a la fois. « ping » plutot que « timeout » :
rem timeout.exe echoue quand l'entree standard est detournee, ce qui arrive des
rem que le script est lance par un programme.
ping -n 3 127.0.0.1 >nul
goto :attente

:ouverte
echo   Blonay PDF est ouvert. Fermez la fenêtre, puis relancez cette mise à jour.
goto :echec

:fermee

rem --- 3. Ouvrir le zip a l'ecart --------------------------------------------
set "ATELIER=%TEMP%\blonay-maj-%RANDOM%%RANDOM%"
mkdir "%ATELIER%" 2>nul
echo   Ouverture du zip…
tar -xf "%ZIP%" -C "%ATELIER%" 2>nul
if errorlevel 1 (
  rem tar manque sur les Windows anterieurs a 2018 : PowerShell prend le relais.
  powershell -NoProfile -Command "try { Expand-Archive -LiteralPath $env:ZIP -DestinationPath $env:ATELIER -Force } catch { exit 1 }"
)

rem --- 4. Verifier avant de toucher a quoi que ce soit ------------------------
set "SOURCE=%ATELIER%\BlonayPDF"
if not exist "%SOURCE%\BlonayPDF.exe" set "SOURCE=%ATELIER%"
if not exist "%SOURCE%\BlonayPDF.exe" (
  echo   Ce zip ne contient pas BlonayPDF.exe : rien n'a été touché.
  goto :echec
)

rem --- 5. Remplacer, sans jamais supprimer ------------------------------------
rem Pas de /MIR : robocopy recopie et remplace, mais n'efface rien. Le
rem sous-dossier "data" reste donc intact, ainsi que tout ce que vous auriez
rem pose dans le dossier.
echo   Remplacement des fichiers…
robocopy "%SOURCE%" "%DOSSIER%." /E /XD "data" /R:2 /W:2 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo   La copie a échoué. L'application n'a peut-être été remplacée qu'en partie :
  echo   décompressez le zip par-dessus le dossier à la main, sans toucher à « data ».
  goto :echec
)

rd /s /q "%ATELIER%" >nul 2>&1
echo.
echo   Mise à jour terminée. Vos tampons, signatures et récents sont conservés.
rem Repere en ASCII pur : lisible par un script quel que soit l'encodage.
echo BLONAY-MAJ: OK
if defined BLONAY_MAJ_AUTO (
  echo   Redémarrage de l'application…
  rem Les flux sont detournes vers nul : sans cela l'application heriterait de
  rem la sortie du script, et le programme qui l'a lance attendrait la fermeture
  rem du tuyau — donc celle de l'application, qui vient a peine de s'ouvrir.
  start "" "%DOSSIER%BlonayPDF.exe" >nul 2>&1
  exit /b 0
)
echo   Lancez BlonayPDF.exe ; « Aide › À propos » indique la version installée.
echo.
pause
exit /b 0

:echec
if exist "%ATELIER%" rd /s /q "%ATELIER%" >nul 2>&1
echo.
pause
exit /b 1
