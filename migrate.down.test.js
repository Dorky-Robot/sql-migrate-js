import assert from "assert";
import { withClient } from "./migrate.utils.js";
import { handleSetup } from "./migrate.setup.js";
import {
  revertMigration,
  filterAfterOrAtTimestamp,
  appliedToRevertMigration,
  determineMigrationsToRevert,
  handleDown,
} from "./migrate.down.js";
import { handleUp, getAppliedMigrations } from "./migrate.up.js";

describe("filterAfterOrAtTimestamp", () => {
  it("should return true if the migration timestamp is after or at the provided timestamp", () => {
    const migration = "20230922034400004_create_likes_table.apply.sql";
    const migrationTimestamp = "20230922034400003";
    const result = filterAfterOrAtTimestamp(migration, migrationTimestamp);
    assert.strictEqual(result, true);
  });

  it("should return false if the migration timestamp is before the provided timestamp", () => {
    const migration = "20230922034400002_create_posts_table.apply.sql";
    const migrationTimestamp = "20230922034400003";
    const result = filterAfterOrAtTimestamp(migration, migrationTimestamp);
    assert.strictEqual(result, false);
  });
});

describe("revertMigration", () => {
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

  it("should check that the table is no longer in the db after migration", async () => {
    await withClient(async (client) => {
      const filename = "20230922034400002_create_posts_table.revert.sql";
      await handleSetup(client);
      await revertMigration(client, filename);
      try {
        await client.query(`SELECT * FROM posts`);
        assert.fail("Table 'posts' still exists in the database");
      } catch (error) {
        assert.strictEqual(error.message, 'relation "posts" does not exist');
      }
    });
  });

  it("should throw an error if the migration file does not end with '.revert.sql'", async () => {
    await withClient(async (client) => {
      const filename = "20230922034400002_create_posts_table.apply.sql";
      await handleSetup(client);
      try {
        await revertMigration(client, filename);
        assert.fail("Expected error was not thrown");
      } catch (error) {
        assert.strictEqual(
          error.message,
          "Invalid migration file. The filename must end with '.revert.sql'."
        );
      }
    });
  });
});

describe("appliedToRevertMigration", () => {
  it("should transform the filename of an applied migration to its corresponding revert migration filename", () => {
    const filename = "20230922034400002_create_posts_table.apply.sql";
    const expected = "20230922034400002_create_posts_table.revert.sql";
    const result = appliedToRevertMigration(filename);
    assert.strictEqual(result, expected);
  });
});

describe("determineMigrationsToRevert", () => {
  it("should return all migrations if no timestamp is provided", () => {
    const migrations = [
      "20230922034400002_create_posts_table.revert.sql",
      "20230922034400003_create_comments_table.revert.sql",
    ];
    const result = determineMigrationsToRevert(migrations);
    assert.deepStrictEqual(result, migrations);
  });

  it("should filter migrations based on the provided timestamp", () => {
    const migrations = [
      "20230922034400002_create_posts_table.revert.sql",
      "20230922034400003_create_comments_table.revert.sql",
    ];
    const timestamp = "20230922034400003";
    const expected = ["20230922034400003_create_comments_table.revert.sql"];
    const result = determineMigrationsToRevert(migrations, timestamp);
    assert.deepStrictEqual(result, expected);
  });

  it("should throw an error if a migration does not end with '.revert.sql'", () => {
    const migrations = [
      "20230922034400002_create_posts_table.revert.sql",
      "invalid_migration.sql",
    ];
    assert.throws(
      () => determineMigrationsToRevert(migrations),
      /Invalid migration file. The filename must end with '.revert.sql'./
    );
  });
});

describe("handleDown", () => {
  it("should throw an error if client is not provided", () =>
    assert.rejects(
      handleDown(null, "20230922034400003"),
      new Error("Client is not provided.")
    ));

  it("should handle the migration down process", async () => {
    await withClient(async (client) => {
      const migrationTimestamp = "20230922034400003";

      await handleSetup(client);
      await handleUp(client);

      const appliedMigrations = await getAppliedMigrations(client);
      const allRevertMigrations = appliedMigrations.map(
        appliedToRevertMigration
      );
      const migrationsToRevert = determineMigrationsToRevert(
        allRevertMigrations,
        migrationTimestamp
      );

      assert.strictEqual(migrationsToRevert.length > 0, true);

      for (const migration of migrationsToRevert.reverse()) {
        await revertMigration(client, migration);
      }
    });
  });

  it("should throw an error if there is a failure during the migration process", async () => {
    await withClient(async (client) => {
      const migrationTimestamp = "20220922034400003";

      await assert.rejects(
        handleDown(client, migrationTimestamp),
        /relation "migrations" does not exist/
      );
    });
  });
});
