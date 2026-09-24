// Charge .env et .env.local pour les scripts exécutés hors de Next.js.
for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* fichier absent : valeurs par défaut */
  }
}
