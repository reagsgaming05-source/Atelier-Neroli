import "./env";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "../src/lib/db";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("✔ Base de données à jour.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
