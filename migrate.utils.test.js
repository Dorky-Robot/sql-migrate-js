import assert from "assert";
import {
  ENV,
  MIGRATIONS_DIR,
  DB_CONFIG,
  getAllMigrations,
  readMigrationContent,
  executeInTransaction,
  executeSQL,
  filterMigrations,
  filterMigrationsToTimestamp,
  withClient,
} from "./migrate.utils.js";

describe("Migration Utilities", () => {
  it("should have correct environment variables", () => {
    assert(ENV);
    assert(MIGRATIONS_DIR);
    assert(DB_CONFIG);
  });

  it("should get all migrations", async () => {
    const migrations = await getAllMigrations();
    assert(Array.isArray(migrations));
  });

  it("should read migration content", async () => {
    const migrations = await getAllMigrations();
    if (migrations.length > 0) {
      const content = await readMigrationContent(migrations[0]);
      assert(typeof content === "string");
    }
  });
});

it("should execute SQL within a transaction", async () => {
  await withClient(async (client) => {
    const action = async () => {
      await client.query("SELECT 1");
    };
    await executeInTransaction(client, action);
    assert(true);
  }).catch(() => {
    assert(false, "Transaction failed");
  });
});
