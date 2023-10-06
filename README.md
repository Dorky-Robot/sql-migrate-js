# Simple Postgres Migrations

A minimalistic PostgreSQL migrations tool inspired by the Rails migration process. Easily generate, apply, or revert database migrations using Node.js.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Generating Migrations](#generating-migrations)
  - [Applying Migrations](#applying-migrations)
  - [Reverting Migrations](#reverting-migrations)
  - [Setup](#setup)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Features

- Generate migration files with unique timestamps
- Easily apply or revert migrations
- Clean and simple CLI interface

## Installation

\```bash
git clone https://github.com/your-github-username/simple-postgres-migrations.git
cd simple-postgres-migrations
npm install
\```

## Usage

### Generating Migrations

To generate migration files:

\```bash
node migrate.js generate <migration-name>
\```

This will generate two files: one for applying the migration and another for reverting it.

### Applying Migrations

To apply all pending migrations:

\```bash
node migrate.js up
\```

### Reverting Migrations

To revert the last applied migration:

\```bash
node migrate.js down
\```

### Setup

For first-time setup:

\```bash
node migrate.js setup
\```

## Configuration

You must provide a `.db.test`, `.db.development`, or `.db.production` to specify the database config for a given environment in `migrate.utils.js` with your PostgreSQL connection details:

\```javascript
export const DB_CONFIG = {
host: 'localhost',
port: 5432,
user: 'your-username',
password: 'your-password',
database: 'your-database-name'
};
\```

Ensure the `MIGRATIONS_DIR` in `migrate.utils.js` points to your desired migrations directory:

\```javascript
export const MIGRATIONS_DIR = path.join(\_\_dirname, 'migrations');
\```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
