#!/usr/bin/env node
// Probe: verify the deploy key is registered and get the GitHub username.
// A valid key prints:  Hi <username>! You've successfully authenticated...
// An unregistered key prints:  Permission denied (publickey).
'use strict';
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const privateKey = fs.readFileSync(path.join(__dirname, 'keys', 'id_ed25519'), 'utf8');
const [host, port] = process.argv[2] === 'port443' ? ['ssh.github.com', 443] : ['github.com', 22];

const conn = new Client();
let stderrData = '';

conn.on('ready', () => {
  conn.exec('exit', (err, stream) => {
    if (err) { console.error('exec error: ' + err.message); process.exit(2); }
    stream.on('data', (d) => { stderrData += d.toString(); });
    stream.on('close', () => {
      console.log(stderrData.trim());
      conn.end();
      process.exit(/successfully authenticated/.test(stderrData) ? 0 : 1);
    });
  });
});
conn.on('error', (err) => {
  console.error('CONNECT ERROR: ' + err.message);
  process.exit(2);
});
conn.connect({ host, port, username: 'git', privateKey, readyTimeout: 20000 });
