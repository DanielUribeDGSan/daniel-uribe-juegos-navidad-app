#!/bin/bash
echo "🚀 Preparando ChristmasGamesApp (Tauri)..."
cd "$(dirname "$0")"

# Levanta el entorno de desarrollo de Tauri (React + Rust)
npm run tauri dev
