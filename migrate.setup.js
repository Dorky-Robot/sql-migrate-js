import { executeSQL } from "./migrate.utils.js";

/**
 * @typedef {import("pg").Client} Client
 */

/**
 * Checks if the migrations table exists in the database.
 *
 * @param {Client} client - The database client.
 * @returns {Promise<boolean>} - A promise that resolves to true if the migrations table exists, false otherwise.
 */
export const doesMigrationsTableExist = async (client) => {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = 'migrations'
    );
  `);
  return result.rows[0].exists;
};

/**
 * Creates the migrations table in the database.
 *
 * @param {Client} client - The database client.
 * @returns {Promise<pg.QueryResult>} - A promise that resolves when the table is created.
 */
const createMigrationsTable = async (client) => {
  return executeSQL(
    client,
    `
    CREATE TABLE migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    `
  );
};

/**
 * Creates the migrations table in the database if it doesn't exist.
 *
 * @param {Client} client - The database client.
 * @returns {Promise<pg.QueryResult>} - A promise that resolves when the table is created or if it already exists.
 */
export const handleSetup = async (client) => {
  if (await doesMigrationsTableExist(client)) {
    console.log("Migration table already exists. Setup skipped.");
    return;
  }
  await createMigrationsTable(client);
  console.log("Migration table set up successfully.");
};

export default handleSetup;
