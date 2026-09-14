#!/usr/bin/env bash
# Lance le logiciel de décompte DGEO (100% local) et ouvre le navigateur.
set -e
cd "$(dirname "$0")"
if [ ! -x ".venv/bin/python" ]; then
    echo "Création de l'environnement Python..."
    python3 -m venv .venv
    .venv/bin/python -m pip install --upgrade pip >/dev/null
    .venv/bin/python -m pip install -r requirements.txt
fi
exec .venv/bin/python -m decompte "$@"
