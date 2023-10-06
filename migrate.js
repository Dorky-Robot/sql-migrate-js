#!/usr/bin/env node

import pg from "pg";
import { DB_CONFIG } from "./migrate.utils.js";

import handleSetup from "./migrate.setup.js";
import handleUp from "./migrate.up.js";
import handleDown from "./migrate.down.js";
import handleGenerate from "./migrate.generate.js";

const { Client } = pg; // Utility function to execute SQL with proper error handling

const getClient = async () => {
  const client = new Client(DB_CONFIG);
  await client.connect();
  return client;
};

const closeClient = async (client) => {
  await client.end();
};

const main = async () => {
  const client = await getClient();

  try {
    const [command, option, migrationTimestamp] = process.argv.slice(2);

    switch (command) {
      case "setup":
        await handleSetup(client);
        break;
      case "generate":
        await handleGenerate(option);
        break;
      case "up":
        await handleUp(client, option, migrationTimestamp);
        break;
      case "down":
        await handleDown(client);
        break;
      default:
        console.error("Unknown command:", command);
    }
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await closeClient(client);
  }
};

main();
