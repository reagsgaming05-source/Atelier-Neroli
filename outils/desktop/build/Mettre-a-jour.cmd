@echo off
rem ===========================================================================
rem  Aktum PDF - mise a jour de la version portable.
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
if defined AKTUM_MAJ goto :travail
set "AKTUM_MAJ=1"
set "COPIE=%TEMP%\aktum-maj-%RANDOM%%RANDOM%.cmd"
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
echo   Aktum PDF — mise à jour
echo   ════════════════════════
echo.
echo   Dossier de l'application : %DOSSIER%
echo.

rem --- 1. Retrouver le zip ---------------------------------------------------
if not "%ZIP%"=="" goto :zip_trouve
if exist "%DOSSIER%AktumPDF-windows.zip" (
  set "ZIP=%DOSSIER%AktumPDF-windows.zip"
  goto :zip_trouve
)
if exist "%USERPROFILE%\Downloads\AktumPDF-windows.zip" (
  set "ZIP=%USERPROFILE%\Downloads\AktumPDF-windows.zip"
  goto :zip_trouve
)
echo   Le zip de la nouvelle version est introuvable.
echo.
echo   Téléchargez « AktumPDF-windows.zip », puis posez-le sur ce fichier
echo   ou déposez-le à côté d’AktumPDF.exe avant de relancer.
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
rem Lancee par l'application elle-meme (AKTUM_MAJ_AUTO), la mise a jour attend
rem qu'elle finisse de se fermer : refuser une seconde trop tot obligerait a
rem tout recommencer a la main.
set "ESSAIS=0"
set "ANNONCE="
:attente
tasklist /FI "IMAGENAME eq AktumPDF.exe" 2>nul | find /I "AktumPDF.exe" >nul
if errorlevel 1 goto :fermee
if not defined AKTUM_MAJ_AUTO goto :ouverte
if not defined ANNONCE (
  set "ANNONCE=1"
  echo   Attente de la fermeture d’Aktum PDF…
)
set /a ESSAIS+=1
if %ESSAIS% GEQ 30 goto :ouverte
rem Une minute au plus, deux secondes a la fois. « ping » plutot que « timeout » :
rem timeout.exe echoue quand l'entree standard est detournee, ce qui arrive des
rem que le script est lance par un programme.
ping -n 3 127.0.0.1 >nul
goto :attente

:ouverte
echo   Aktum PDF est ouvert. Fermez la fenêtre, puis relancez cette mise à jour.
goto :echec

:fermee

rem --- 3. Copier a l'ecart, verifier la signature de la COPIE ----------------
rem Ce zip arrive d'un dossier ou tout le monde ecrit. Il n'est execute que
rem s'il est signe par l'editeur, et c'est la copie, posee dans un dossier a
rem soi, qui est verifiee puis ouverte : un zip remplace entre la verification
rem et l'ouverture ne passerait pas. La verification est faite par l'application
rem DEJA installee (en mode Node), qui porte la cle publique de l'editeur ; la
rem nouvelle version n'a pas voix au chapitre.
set "ATELIER=%TEMP%\aktum-maj-%RANDOM%%RANDOM%"
mkdir "%ATELIER%" 2>nul
echo   Copie de l'archive…
copy /y "%ZIP%" "%ATELIER%\maj.zip" >nul
if errorlevel 1 (
  echo   L'archive n'a pas pu être copiée : rien n'a été touché.
  goto :echec
)
copy /y "%ZIP%.signature.json" "%ATELIER%\maj.zip.signature.json" >nul 2>&1
echo   Vérification de la signature de l'éditeur…
rem L'application elle-même, sans fenêtre, dans son mode « vérifier » : « start /wait » pour attendre un programme à fenêtres, et son code de
rem sortie ET la ligne qu'elle écrit doivent dire que la signature est bonne — l'un sans l'autre ne suffit pas.
del "%ATELIER%\verif.txt" 2>nul
start "" /wait "%DOSSIER%AktumPDF.exe" --verifier-maj "%ATELIER%\maj.zip" "%ATELIER%\verif.txt"
set "VERIF=%ERRORLEVEL%"
findstr /b /c:"SIGNATURE-OK" "%ATELIER%\verif.txt" >nul 2>&1
if errorlevel 1 set "VERIF=2"
if not "%VERIF%"=="0" (
  echo.
  echo   Cette archive n'est pas signée par l'éditeur, ou a été modifiée :
  echo   elle n'est PAS installée, et rien n'a été touché. Pour une vraie mise à jour,
  echo   reprenez « AktumPDF-windows.zip » ET son fichier « .signature.json » depuis
  echo   la page de téléchargement de l'éditeur.
  goto :echec
)
set "ZIP=%ATELIER%\maj.zip"
echo   Signature vérifiée.
echo   Ouverture du zip…
tar -xf "%ZIP%" -C "%ATELIER%" 2>nul
if errorlevel 1 (
  rem tar manque sur les Windows anterieurs a 2018 : PowerShell prend le relais.
  powershell -NoProfile -Command "try { Expand-Archive -LiteralPath $env:ZIP -DestinationPath $env:ATELIER -Force } catch { exit 1 }"
)

rem --- 4. Verifier avant de toucher a quoi que ce soit ------------------------
set "SOURCE=%ATELIER%\AktumPDF"
if not exist "%SOURCE%\AktumPDF.exe" set "SOURCE=%ATELIER%"
if not exist "%SOURCE%\AktumPDF.exe" (
  echo   Ce zip ne contient pas AktumPDF.exe : rien n'a été touché.
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
echo AKTUM-MAJ: OK
if defined AKTUM_MAJ_AUTO (
  echo   Redémarrage de l'application…
  rem Les flux sont detournes vers nul : sans cela l'application heriterait de
  rem la sortie du script, et le programme qui l'a lance attendrait la fermeture
  rem du tuyau — donc celle de l'application, qui vient a peine de s'ouvrir.
  start "" "%DOSSIER%AktumPDF.exe" >nul 2>&1
  exit /b 0
)
echo   Lancez AktumPDF.exe ; « Aide › À propos » indique la version installée.
echo.
pause
exit /b 0

:echec
if exist "%ATELIER%" rd /s /q "%ATELIER%" >nul 2>&1
echo.
pause
exit /b 1
