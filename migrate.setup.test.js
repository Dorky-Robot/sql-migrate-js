import assert from "assert";
import { withClient } from "./migrate.utils.js";
import { handleSetup, doesMigrationsTableExist } from "./migrate.setup.js";

describe("doesMigrationsTableExist", () => {
  it("should return false if migrations table does not exist", async () => {
    await withClient(async (client) => {
      const exists = await doesMigrationsTableExist(client);
      assert.strictEqual(exists, false);
    });
  });

  it("should check if migrations table exists", async () => {
    await withClient(async (client) => {
      await handleSetup(client); // Ensure migrations table is set up
      const exists = await doesMigrationsTableExist(client);
      assert.strictEqual(exists, true);
    });
  });
});

describe("handleSetup", () => {
  it("should setup migration table", async () => {
    await withClient(async (client) => {
      await handleSetup(client);
      const existsAfterSetup = await doesMigrationsTableExist(client);
      assert.strictEqual(
        existsAfterSetup,
        true,
        "Migrations table should exist after setup."
      );
    });
  });

  it("should be idempotent", async () => {
    await withClient(async (client) => {
      await handleSetup(client);
      await handleSetup(client); // Run setup again
      const exists = await doesMigrationsTableExist(client);
      assert.strictEqual(exists, true);
    });
  });

  it("should have the correct columns", async () => {
    await withClient(async (client) => {
      await handleSetup(client);
      const result = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'migrations'"
      );
      const expectedColumns = ["id", "filename", "applied_at"].sort();
      const actualColumns = result.rows.map((row) => row.column_name).sort();
      assert.deepStrictEqual(actualColumns, expectedColumns);
    });
  });

  it("should set default values correctly", async () => {
    await withClient(async (client) => {
      await handleSetup(client);
      await client.query(
        "INSERT INTO migrations (filename) VALUES ('test_migration.sql')"
      );
      const result = await client.query(
        "SELECT applied_at FROM migrations WHERE filename = 'test_migration.sql'"
      );
      assert.ok(result.rows[0].applied_at);
    });
  });
});
