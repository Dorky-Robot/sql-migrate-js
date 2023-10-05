import { executeSQL, readMigrationContent } from "./migrate.utils.js";
import {
  getAppliedMigrations,
  APPLY_MIGRATION_FILE_SUFFIX,
} from "./migrate.up.js";
import pg from "pg";

const REVERT_MIGRATION_FILE_SUFFIX = ".revert.sql";

/**
 * Filters migrations based on a given timestamp.
 * Only migrations that were applied after or at the given timestamp are included.
 *
 * @param {string} migration - The filename of the migration.
 * @param {string} migrationTimestamp - The timestamp to filter by.
 * @returns {boolean} Whether the migration was applied after or at the given timestamp.
 */
export const filterAfterOrAtTimestamp = (migration, migrationTimestamp) => {
  const migrationTime = migration.split("_")[0];
  return Number(migrationTime) >= Number(migrationTimestamp);
};

/**
 * Reverts a migration.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @param {string} filename - The filename of the migration to revert.
 * @returns {Promise<void>} A promise that resolves when the migration has been reverted.
 */
export const revertMigration = async (client, filename) => {
  if (!filename.endsWith(REVERT_MIGRATION_FILE_SUFFIX)) {
    throw new Error(
      "Invalid migration file. The filename must end with '.revert.sql'."
    );
  }
  const migrationContent = await readMigrationContent(filename);
  await executeSQL(client, migrationContent);

  const applyFilename = filename.replace(
    REVERT_MIGRATION_FILE_SUFFIX,
    APPLY_MIGRATION_FILE_SUFFIX
  );

  await executeSQL(client, "DELETE FROM migrations WHERE filename = $1", [
    applyFilename,
  ]);
};

/**
 * Transforms the filename of an applied migration to its corresponding revert migration filename.
 * @param {string} filename - The filename of the applied migration.
 * @returns {string} The filename of the revert migration.
 */
export const appliedToRevertMigration = (filename) =>
  filename.replace(".apply.", ".revert.");

/**
 * Determines which migrations to revert based on the applied migrations and a given timestamp.
 * Only migrations that were applied after or at the given timestamp and end with '.revert.sql' are included.
 *
 * @param {Array<string>} revertMigrations - The filenames of the revert migrations.
 * @param {string} migrationTimestamp - The timestamp to filter by.
 * @returns {Array<string>} The filenames of the migrations to revert.
 */
export const determineMigrationsToRevert = (
  revertMigrations,
  migrationTimestamp
) => {
  let migrations = revertMigrations;

  revertMigrations.forEach((filename) => {
    if (!filename.endsWith(".revert.sql")) {
      throw new Error(
        "Invalid migration file. The filename must end with '.revert.sql'."
      );
    }
  });

  if (migrationTimestamp) {
    migrations = revertMigrations.filter((migration) =>
      filterAfterOrAtTimestamp(migration, migrationTimestamp)
    );
  }

  return migrations;
};

/**
 * Sorts the migrations in reverse chronological order.
 * @param {string[]} migrations - An array of migration filenames.
 * @returns {string[]} The sorted migration filenames.
 */
const sortMigrationsInDescendingOrder = (migrations) => {
  return migrations.sort((a, b) => {
    // Assuming filenames are in the format "YYYYMMDDHHmmss_migration-name.sql"
    const timestampA = a.split("_")[0];
    const timestampB = b.split("_")[0];
    return timestampB.localeCompare(timestampA); // Sort in descending order
  });
};

/**
 * Handles the migration down process.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @param {string} migrationTimestamp - The timestamp to filter by.
 * @throws {Error} If the client is not provided.
 * @throws {Error} If there is a failure during the migration process.
 * @returns {Promise<void>} A promise that resolves when all migrations have been reverted.
 */
export const handleDown = async (client, migrationTimestamp) => {
  if (!client) throw new Error("Client is not provided.");
  try {
    const appliedMigrations = await getAppliedMigrations(client);
    const sortedAppliedMigrations =
      sortMigrationsInDescendingOrder(appliedMigrations);
    const allRevertMigrations = sortedAppliedMigrations.map(
      appliedToRevertMigration
    );
    const migrationsToRevert = determineMigrationsToRevert(
      allRevertMigrations,
      migrationTimestamp
    );

    if (migrationsToRevert.length === 0) {
      console.info("No migrations match the criteria to revert.");
      return;
    }

    console.info("Reverting migrations:");
    for (const migration of migrationsToRevert) {
      console.info(`Reverting ${migration}...`);
      await revertMigration(client, migration);
      console.info(`${migration} reverted successfully.`);
    }
  } catch (error) {
    console.error("Failed to revert migration:", error);
    throw error;
  }
};

export default handleDown;
