import fs from "fs";
import path from "path";
import { MIGRATIONS_DIR } from "./migrate.utils.js";

const APPLY_MIGRATION_FILE_SUFFIX = ".apply.sql";
const REVERT_MIGRATION_FILE_SUFFIX = ".revert.sql";

/**
 * Generates a timestamp in the format YYYYMMDDHHmmss.
 * @returns {string} The generated timestamp.
 */
export const generateTimestamp = () => {
  const date = new Date();
  const YYYY = date.getUTCFullYear();
  const MM = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are 0-based
  const DD = String(date.getUTCDate()).padStart(2, "0");
  const HH = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");

  return `${YYYY}${MM}${DD}${HH}${mm}${ss}`;
};

/**
 * Formats the migration name by replacing underscores with hyphens, spaces with hyphens,
 * camel case with hyphens, and making all characters lowercase.
 *
 * @param {string} migrationName - The original migration name.
 * @returns {string} The formatted migration name.
 */
export const formatMigrationName = (migrationName) => {
  return (
    migrationName
      // Replace spaces with hyphens
      .replace(/ /g, "-")
      // Replace underscores with hyphens
      .replace(/_/g, "-")
      // Convert camel case to hyphen-separated format
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      // Convert the entire string to lowercase
      .toLowerCase()
  );
};

/**
 * Constructs the migration filename.
 * @param {string} timestamp - The timestamp prefix.
 * @param {string} formattedName - The formatted migration name.
 * @param {string} suffix - The file suffix.
 * @returns {string} The constructed filename.
 */
export const fullMigrationFilePath = (timestamp, formattedName, suffix) =>
  path.join(MIGRATIONS_DIR, `${timestamp}_${formattedName}${suffix}`);

/**
 * Creates a migration file with the given filename and content.
 * @param {string} filename - The filename of the migration file.
 * @param {string} content - The content of the migration file.
 * @returns {string} The created filename.
 * @throws {Error} If there's an error during file creation.
 */
export const createMigrationFile = (filename, content) => {
  try {
    fs.writeFileSync(filename, content);
    console.log(`File created: ${filename}`);
    return filename;
  } catch (error) {
    console.error(`Failed to create migration file: ${filename}`, error);
    throw new Error(`Error creating migration file: ${filename}`);
  }
};

/**
 * Handles the migration generation process.
 * @param {string} migrationName - The name of the migration.
 * @returns {Object} An object containing the names of the generated files.
 * @throws {Error} If there's a failure during the migration generation process.
 */
export const handleGenerate = (migrationName) => {
  const timestamp = generateTimestamp();
  const formattedName = formatMigrationName(migrationName);
  const applyFileName = fullMigrationFilePath(
    timestamp,
    formattedName,
    APPLY_MIGRATION_FILE_SUFFIX
  );
  const revertFileName = fullMigrationFilePath(
    timestamp,
    formattedName,
    REVERT_MIGRATION_FILE_SUFFIX
  );

  createMigrationFile(
    applyFileName,
    "-- SQL statements for applying the migration"
  );
  createMigrationFile(
    revertFileName,
    "-- SQL statements for reverting the migration"
  );

  console.log(`Generated files: ${applyFileName} and ${revertFileName}`);

  return {
    applyFileName,
    revertFileName,
  };
};

export default handleGenerate;
