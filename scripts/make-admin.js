// One-time first-admin bootstrap (run once per environment).
// Usage: set ADMIN_BOOTSTRAP_SECRET in .env, register your own account in the
// app, then run:  npm run make-admin -- <your-username>
// Remove ADMIN_BOOTSTRAP_SECRET from .env afterwards. Once an admin exists this
// script refuses to run; further teacher/admin accounts come from invite codes
// generated in the teacher dashboard (Phase 4).
require('dotenv').config();
const readline = require('readline');
const { pool } = require('../db');

function ask(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(String(answer).trim());
    });
  });
}

(async () => {
  if (!process.env.ADMIN_BOOTSTRAP_SECRET) {
    console.error('Set ADMIN_BOOTSTRAP_SECRET in .env before running this script.');
    process.exit(1);
  }
  const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin'");
  if (admins.length) {
    console.error('An admin already exists (' + admins.map((a) => a.username).join(', ') + '). Use invite codes instead.');
    process.exit(1);
  }
  const username = process.argv[2] || (await ask('Username to promote to admin: '));
  const given = process.argv[3] || (await ask('Confirm the ADMIN_BOOTSTRAP_SECRET: '));
  if (given !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    console.error('That does not match ADMIN_BOOTSTRAP_SECRET.');
    process.exit(1);
  }
  const upd = await pool.query(
    "UPDATE users SET role = 'admin' WHERE username_normalized = $1 RETURNING username",
    [username.toLowerCase()]
  );
  if (!upd.rowCount) {
    console.error('No user found with that username.');
    process.exit(1);
  }
  console.log('Promoted ' + upd.rows[0].username + ' to admin.');
  console.log('Now remove ADMIN_BOOTSTRAP_SECRET from .env so this script cannot run again.');
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
