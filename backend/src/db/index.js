const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Point it at your Supabase Postgres connection string.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Converts '?' placeholders (SQLite style) to '$1, $2, ...' (Postgres style)
// so the route files barely had to change when we moved off SQLite.
function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function all(sql, params = []) {
  const result = await pool.query(toPositional(sql), params);
  return result.rows;
}

async function get(sql, params = []) {
  const result = await pool.query(toPositional(sql), params);
  return result.rows[0];
}

async function run(sql, params = []) {
  const result = await pool.query(toPositional(sql), params);
  return { rowCount: result.rowCount };
}

// For the seasons.js archive flow, which needs several statements to succeed
// or fail together. Grabs one dedicated client so BEGIN/COMMIT/ROLLBACK apply
// to the same connection, then hands back the same get/all/run shape.
async function withTransaction(callback) {
  const client = await pool.connect();
  const tx = {
    all: async (sql, params = []) => (await client.query(toPositional(sql), params)).rows,
    get: async (sql, params = []) => (await client.query(toPositional(sql), params)).rows[0],
    run: async (sql, params = []) => ({ rowCount: (await client.query(toPositional(sql), params)).rowCount }),
  };
  try {
    await client.query('BEGIN');
    const result = await callback(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

module.exports = { pool, all, get, run, withTransaction, init };
