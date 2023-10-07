import {
  getAllMigrations,
  executeSQL,
  executeInTransaction,
  readMigrationContent,
} from "./migrate.utils.js";
import pg from "pg";
import { composePredicates } from "funcadelic.js";

export const APPLY_MIGRATION_FILE_SUFFIX = ".apply.sql";

/**
 * Retrieves a list of applied migrations from the database.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @returns {Promise<string[]>} A promise that resolves to an array of filenames of applied migrations.
 */
export const getAppliedMigrations = async (client) => {
  if (!client) throw new Error("Client is not provided.");

  try {
    const { rows } = await client.query(
      "SELECT filename FROM migrations ORDER BY filename"
    );
    return rows.map((row) => row.filename);
  } catch (error) {
    console.error("Failed to fetch applied migrations:", error);
    throw error;
  }
};

/**
 * Applies a migration to the database.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @param {string} filename - The filename of the migration to apply.
 */
export const applyMigration = async (client, filename) => {
  if (!client || !filename)
    throw new Error("Client or filename is not provided.");

  await executeInTransaction(client, async () => {
    const migrationContent = await readMigrationContent(filename);

    await executeSQL(client, migrationContent);
    await executeSQL(client, "INSERT INTO migrations (filename) VALUES ($1)", [
      filename,
    ]);
  });
};

/**
 * Filters migrations to a specific timestamp.
 * @param {string} migration - The migration currently being filtered.
 * @param {string} migrationTimestamp - The timestamp to filter to.
 * @returns {boolean} Returns true if the migration timestamp is less than or equal to the provided timestamp, false otherwise.
 */
export const filterBeforeOrAtTimestamp = (migration, migrationTimestamp) =>
  migration.split("_")[0] <= migrationTimestamp;

/**
 * Determines which migrations to apply based on the provided parameters.
 * @param {string[]} allMigrations - All available migrations.
 * @param {string[]} appliedMigrations - Migrations that have already been applied.
 * @param {string} migrationTimestamp - The timestamp to filter to.
 * @returns {string[]} The migrations to apply.
 */
export const determineMigrationsToApply = (
  allMigrations,
  appliedMigrations,
  migrationTimestamp
) => {
  let appliedMigrationsSet = new Set(appliedMigrations);

  let predicates = [
    (migration) => migration.endsWith(APPLY_MIGRATION_FILE_SUFFIX),
    (migration) => !appliedMigrationsSet.has(migration),
  ];

  if (migrationTimestamp)
    predicates.push((migration) =>
      filterBeforeOrAtTimestamp(migration, migrationTimestamp)
    );

  return allMigrations.filter(composePredicates(...predicates));
};

/**
 * Applies all migrations in the provided list.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @param {string[]} migrationsToApply - The migrations to apply.
 */
export const applyMigrations = async (client, migrationsToApply) => {
  for (const migration of migrationsToApply.sort((a, b) =>
    a.localeCompare(b)
  )) {
    console.log(`Applying ${migration}...`);
    await applyMigration(client, migration);
    console.log(`${migration} applied successfully.`);
  }
};

/**
 * Executes all migrations up to a specific timestamp.
 * @param {pg.Client} client - The PostgreSQL client instance to execute the migrations on.
 * @param {string} [migrationTimestamp] - The timestamp to stop at. If not provided, all migrations will be executed.
 * @throws {Error} If the client is not provided.
 * @throws {Error} If there is a failure during the migration process.
 * @returns {Promise<void>} A promise that resolves when all migrations have been executed.
 */
export const handleUp = async (client, migrationTimestamp) => {
  if (!client) throw new Error("Client is not provided.");

  try {
    const allMigrations = await getAllMigrations();
    const appliedMigrations = await getAppliedMigrations(client);
    const migrationsToApply = determineMigrationsToApply(
      allMigrations,
      appliedMigrations,
      migrationTimestamp
    );

    if (migrationsToApply.length === 0) {
      console.log("No new migrations to execute.");
      return;
    }

    console.log("Executing migrations:");
    await applyMigrations(client, migrationsToApply);
  } catch (error) {
    console.error("Failed to execute migrations:", error);
    throw error;
  }
};

export default handleUp;
