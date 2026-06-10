#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "📦 Construyendo versión de producción de ChristmasGamesApp (Tauri)..."

# Instala dependencias si faltan
npm install

# Compila el bundle para macOS usando Tauri CLI
npm run tauri build

echo "✅ Build completado exitosamente. Revisa la carpeta src-tauri/target/release/bundle/"
