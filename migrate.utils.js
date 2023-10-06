import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";

/**
 * @typedef {import("pg").Client} Client
 */

export const ENV = process.env.NODE_ENV || "development";
dotenv.config({ path: `.db.${ENV}` });
if (!process.env.DB_USER) {
  throw new Error("DB_USER is not defined in the environment variables.");
}

export const MIGRATIONS_DIR = new URL(`./migrations_${ENV}/`, import.meta.url)
  .pathname;

export const DB_CONFIG = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
};

/**
 * Retrieves all migration files from the migrations directory.
 * @returns {Promise<string[]>} - A promise that resolves to an array of filenames of all migrations.
 */
export const getAllMigrations = async () =>
  await fs.promises.readdir(MIGRATIONS_DIR);

/**
 * Reads the content of a migration file.
 * @param {string} filename - The name of the migration file.
 * @returns {Promise<string>} - A promise that resolves to the content of the migration file.
 * @throws {Error} If reading the file fails.
 */
export const readMigrationContent = async (filename) => {
  return await fs.promises.readFile(
    path.join(MIGRATIONS_DIR, filename),
    "utf-8"
  );
};

/**
 * Executes SQL within a transaction.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @param {function} action - The function containing SQL operations to execute.
 */
export async function executeInTransaction(client, action) {
  try {
    await client.query("BEGIN");
    await action();
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

// Load environment variables
dotenv.config({ path: `.env.${ENV}` });

/**
 * Executes a SQL query using a database client.
 *
 * @param {Client} client - The database client.
 * @param {string} sql - The SQL query to execute.
 * @param {Array} [params=[]] - The parameters for the SQL query.
 * @returns {Promise<pg.QueryResult>} - A promise that resolves to the result of the query.
 * @throws {Error} If the query fails.
 */
export async function executeSQL(client, sql, params = []) {
  try {
    await client.query("BEGIN;");
    const result = await client.query(sql, params);
    await client.query("COMMIT;");
    return result;
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  }
}

/**
 * Filters migrations based on a filter function.
 * @param {string[]} allMigrations - All available migrations.
 * @param {string[]} appliedMigrations - Migrations that have already been applied.
 * @param {function} filterFn - The filter function to apply.
 * @returns {string[]} The filtered migrations.
 */
export const filterMigrations = (allMigrations, appliedMigrations, filterFn) =>
  allMigrations.filter(
    (migration) => !appliedMigrations.includes(migration) && filterFn(migration)
  );

/**
 * Filters migrations to a specific timestamp.
 * @param {string[]} allMigrations - All available migrations.
 * @param {string[]} appliedMigrations - Migrations that have already been applied.
 * @param {string} migrationTimestamp - The timestamp to filter to.
 * @returns {string[]} The filtered migrations.
 */
export const filterMigrationsToTimestamp = (
  allMigrations,
  appliedMigrations,
  migrationTimestamp
) =>
  filterMigrations(allMigrations, appliedMigrations, (migration) => {
    const migrationTime = migration.split("_")[0];
    return (
      migrationTime <= migrationTimestamp && migration.endsWith(".apply.sql")
    );
  });

/**
 * !! For testing only !!
 * Higher-order function to handle client setup and teardown.
 *
 * @typedef {import("pg").Client} Client
 * @param {function(Client): Promise<void>} testFn - The function to execute with the client.
 * @returns {Promise<void>} - A promise that resolves when the function has been executed and the client has been disconnected.
 * @throws {Error} If the function or the cleanup fails.
 */
export const withClient = async (testFn) => {
  const client = new pg.Client(DB_CONFIG);
  await client.connect();
  try {
    await testFn(client);
    await cleanupDatabase(client);
  } catch (error) {
    console.error("Transaction failed", error);
    throw error;
  } finally {
    await client.end();
  }
};

/**
 * !! For testing only !!
 * Cleans up the database by dropping all tables.
 *
 * @param {Client} client - The database client.
 * @returns {Promise<pg.QueryResult>} - A promise that resolves when all tables have been dropped.
 * @throws {Error} If the cleanup fails.
 */
async function cleanupDatabase(client) {
  // Temporarily disable foreign key checks
  await client.query("SET session_replication_role = replica;");

  // Retrieve a list of all tables in the public schema
  const { rows } = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `);

  // Iterate over each table and drop it, if it exists
  for (let { tablename } of rows) {
    await client.query(`DROP TABLE IF EXISTS ${tablename} CASCADE;`);
  }

  // Re-enable foreign key checks
  await client.query("SET session_replication_role = DEFAULT;");
}
