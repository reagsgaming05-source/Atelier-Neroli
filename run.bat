@echo off
REM Lance le logiciel de decompte DGEO (100%% local) et ouvre le navigateur.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Creation de l'environnement Python...
    python -m venv .venv || (echo Python 3.10+ est requis. Voir README.md & pause & exit /b 1)
    ".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt || (echo Echec de l'installation des dependances. & pause & exit /b 1)
)
".venv\Scripts\python.exe" -m decompte %*
pause
