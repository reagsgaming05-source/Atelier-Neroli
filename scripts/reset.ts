// Supprime la base locale puis la recrée avec les données initiales.
import "./env";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./data/atelier-neroli.db";
const file = url.startsWith("file:") ? path.resolve(url.slice("file:".length)) : null;

async function main() {
  // Le fichier doit être supprimé AVANT d'ouvrir la connexion (import dynamique ci-dessous).
  if (file) {
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      fs.rmSync(file + suffix, { force: true });
    }
    console.log(`✔ Base supprimée : ${file}`);
  }
  const { runMigrations } = await import("./migrate");
  const { runSeed } = await import("./seed");
  await runMigrations();
  await runSeed();
  console.log("✔ Base recréée.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
