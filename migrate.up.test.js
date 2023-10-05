import assert from "assert";
import {
  applyMigration,
  filterBeforeOrAtTimestamp,
  getAppliedMigrations,
  handleUp,
  determineMigrationsToApply,
} from "./migrate.up.js";
import { withClient } from "./migrate.utils.js";
import { handleSetup } from "./migrate.setup.js";

describe("Migration Up Module", () => {
  describe("getAppliedMigrations", () => {
    it("should get list of applied migrations", async () => {
      await withClient(async (client) => {
        await handleSetup(client);
        const migrations = await getAppliedMigrations(client);
        assert(Array.isArray(migrations));
      });
    });

    it("should return migrations with correct filename", async () => {
      await withClient(async (client) => {
        await handleSetup(client);
        const filename = "20230922034400001_create_users_table.apply.sql";
        await applyMigration(client, filename);
        const migrations = await getAppliedMigrations(client);
        assert(migrations.includes(filename));
      });
    });

    it("should handle no applied migrations", async () => {
      await withClient(async (client) => {
        await handleSetup(client);
        const migrations = await getAppliedMigrations(client);
        assert.strictEqual(migrations.length, 0);
      });
    });
  });

  describe("applyMigration", () => {
    it("should apply a migration and insert it into the migrations table", async () => {
      await withClient(async (client) => {
        await handleSetup(client);
        const filename = "20230922034400001_create_users_table.apply.sql";
        await applyMigration(client, filename);

        const migrationsAfterApply = await getAppliedMigrations(client);
        assert(migrationsAfterApply.includes(filename));
      });
    });

    it("should throw an error if migration file is not found", async () => {
      await withClient(async (client) => {
        const filename = "non_existent_migration.apply.sql";
        try {
          await applyMigration(client, filename);
          assert.fail("Expected an error to be thrown");
        } catch (error) {
          assert.strictEqual(error.code, "ENOENT");
        }
      });
    });
  });

  describe("filterBeforeOrAtTimestamp", () => {
    it("should return true if the migration timestamp is less than or equal to the provided timestamp", () => {
      const migration = "20230922034400002_create_posts_table.apply.sql";
      const migrationTimestamp = "20230922034400003";
      const result = filterBeforeOrAtTimestamp(migration, migrationTimestamp);
      assert.strictEqual(result, true);
    });

    it("should return false if the migration timestamp is greater than the provided timestamp", () => {
      const migration = "20230922034400004_create_likes_table.apply.sql";
      const migrationTimestamp = "20230922034400003";
      const result = filterBeforeOrAtTimestamp(migration, migrationTimestamp);
      assert.strictEqual(result, false);
    });
  });

  describe("determineMigrationsToApply", () => {
    it("should determine the correct migrations to apply", () => {
      const allMigrations = [
        "20230922034400001_create_users_table.apply.sql",
        "20230922034400002_create_posts_table.apply.sql",
        "20230922034400003_create_comments_table.apply.sql",
        "20230922034400004_create_likes_table.apply.sql",
      ];
      const appliedMigrations = [
        "20230922034400001_create_users_table.apply.sql",
      ];
      const migrationTimestamp = "20230922034400003";
      const expected = [
        "20230922034400002_create_posts_table.apply.sql",
        "20230922034400003_create_comments_table.apply.sql",
      ];
      const result = determineMigrationsToApply(
        allMigrations,
        appliedMigrations,
        migrationTimestamp
      );
      assert.deepStrictEqual(result, expected);
    });

    it("should return an empty array if all migrations are applied", () => {
      const allMigrations = ["20230922034400001_create_users_table.apply.sql"];
      const appliedMigrations = [
        "20230922034400001_create_users_table.apply.sql",
      ];
      const migrationTimestamp = "20230922034400001";
      const result = determineMigrationsToApply(
        allMigrations,
        appliedMigrations,
        migrationTimestamp
      );
      assert.deepStrictEqual(result, []);
    });
  });

  describe("handleUp", () => {
    it("should apply all migrations up to a specific timestamp", async () => {
      await withClient(async (client) => {
        await handleSetup(client);
        const migrationTimestamp = "20230922034400002";
        await handleUp(client, migrationTimestamp);
        const migrationsAfterApply = await getAppliedMigrations(client);
        const expected = [
          "20230922034400001_create_users_table.apply.sql",
          "20230922034400002_create_posts_table.apply.sql",
        ];
        assert.deepStrictEqual(migrationsAfterApply, expected);
      });
    });

    it("should apply all migrations if no timestamp is provided", async () => {
      await withClient(async (client) => {
        await handleSetup(client);
        await handleUp(client);
        const migrationsAfterApply = await getAppliedMigrations(client);
        const expected = [
          "20230922034400001_create_users_table.apply.sql",
          "20230922034400002_create_posts_table.apply.sql",
          "20230922034400003_create_comments_table.apply.sql",
        ];
        assert.deepStrictEqual(migrationsAfterApply, expected);
      });
    });
  });
});
