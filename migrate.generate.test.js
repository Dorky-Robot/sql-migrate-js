import assert from "assert";
import path from "path";
import fs from "fs";
import { MIGRATIONS_DIR } from "./migrate.utils.js";
import {
  generateTimestamp,
  formatMigrationName,
  fullMigrationFilePath,
  createMigrationFile,
  handleGenerate,
} from "./migrate.generate.js";

const cleanupGeneratedFiles = (testBody) => {
  let generatedFiles = [];
  return () => {
    try {
      testBody(generatedFiles);
    } finally {
      generatedFiles.forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }
  };
};

describe("generateTimestamp", () => {
  it("should return a string", () => {
    const result = generateTimestamp();
    assert.strictEqual(typeof result, "string");
  });

  it("should return a timestamp in the format YYYYMMDDHHmmss", () => {
    const result = generateTimestamp();
    const timestampFormat =
      /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])([01][0-9]|2[0-3])([0-5][0-9]){2}$/;

    assert.strictEqual(timestampFormat.test(result), true);
  });
});

describe("formatMigrationName", () => {
  it("should return a string when a migration name is provided", () => {
    const migrationName = "create_likes-table";
    const result = formatMigrationName(migrationName);
    assert.strictEqual(typeof result, "string");
  });

  it("should replace underscores with hyphens", () => {
    const migrationName = "create_likes_table";
    const result = formatMigrationName(migrationName);
    assert.strictEqual(result, "create-likes-table");
  });

  it("should replace spaces with hyphens", () => {
    const migrationName = "create likes table";
    const result = formatMigrationName(migrationName);
    assert.strictEqual(result, "create-likes-table");
  });

  it("should replace camel case with hyphens", () => {
    const migrationName = "createLikesTable";
    const result = formatMigrationName(migrationName);
    assert.strictEqual(result, "create-likes-table");
  });
});

describe("fullMigrationFilePath", () => {
  it("should return a string", () => {
    const timestamp = "20220101101010";
    const formattedName = "create-likes-table";
    const suffix = ".revert.sql";
    const result = fullMigrationFilePath(timestamp, formattedName, suffix);
    assert.strictEqual(typeof result, "string");
  });

  it("should return a filename with the correct format", () => {
    const timestamp = "20220101101010";
    const formattedName = "create-likes-table";
    const suffix = ".apply.sql";
    const result = fullMigrationFilePath(timestamp, formattedName, suffix);
    const expected = path.join(
      MIGRATIONS_DIR,
      `${timestamp}_${formattedName}${suffix}`
    );
    assert.strictEqual(result, expected);
  });
});

describe("createMigrationFile", () => {
  it(
    "should return a string",
    cleanupGeneratedFiles((generatedFiles) => {
      const filename = "20220101101010_create-likes-table.apply.sql";
      const content = "-- SQL statements for applying the migration";
      const result = createMigrationFile(filename, content);
      generatedFiles.push(filename);
      assert.strictEqual(typeof result, "string");
    })
  );

  it("should throw an error if file creation fails", () => {
    const filename = null;
    const content = "-- SQL statements for applying the migration";
    assert.throws(() => createMigrationFile(filename, content), Error);
  });

  it(
    "should write content to the file",
    cleanupGeneratedFiles((generatedFiles) => {
      const filename = "20220101101010_create-likes-table.apply.sql";
      const content = "-- SQL statements for applying the migration";
      createMigrationFile(filename, content);
      generatedFiles.push(filename);
      const fileContent = fs.readFileSync(filename, "utf8");
      assert.strictEqual(fileContent, content);
    })
  );
});

describe("handleGenerate", () => {
  it(
    "should return an object",
    cleanupGeneratedFiles((generatedFiles) => {
      const migrationName = "createLikesTable";
      const result = handleGenerate(migrationName);
      generatedFiles.push(result.applyFileName);
      generatedFiles.push(result.revertFileName);
      assert.strictEqual(typeof result, "object");
    })
  );

  it("should throw an error if migration generation fails", () => {
    const migrationName = null;
    assert.throws(() => handleGenerate(migrationName), Error);
  });

  it(
    "should generate files with the correct format",
    cleanupGeneratedFiles((generatedFiles) => {
      const migrationName = "createLikesTable";
      const result = handleGenerate(migrationName);
      generatedFiles.push(result.applyFileName);
      generatedFiles.push(result.revertFileName);

      // Use the formatted migration name for assertions
      const formattedMigrationName = formatMigrationName(migrationName);

      assert.strictEqual(
        result.applyFileName.includes(formattedMigrationName),
        true
      );
      assert.strictEqual(
        result.revertFileName.includes(formattedMigrationName),
        true
      );
    })
  );
});
