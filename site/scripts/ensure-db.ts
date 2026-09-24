// Exécuté avant `next dev` / `next build` : crée la base, applique les migrations et les données initiales.
import "./env";
import { runMigrations } from "./migrate";
import { runSeed } from "./seed";

runMigrations()
  .then(runSeed)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Impossible d'initialiser la base de données :", err);
    process.exit(1);
  });
