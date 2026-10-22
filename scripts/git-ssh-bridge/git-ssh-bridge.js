#!/usr/bin/env node
// GIT_SSH shim: bridges git <-> GitHub over SSH using the ssh2 library.
// Invoked by git as:  shim [-p port] [-l user] hostname command [args...]
// Uses ed25519 deploy key at scripts/git-ssh-bridge/keys/id_ed25519
'use strict';
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const args = process.argv.slice(2);
let port = 22, user = 'git', host = null;
const cmdParts = [];
let afterHost = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!afterHost) {
    if (a === '-p') { port = parseInt(args[++i], 10); continue; }
    if (a === '-l') { user = args[++i]; continue; }
    if (a === '-o') { i++; continue; } // skip ssh options
    if (a.startsWith('-')) continue;
    // git may pass host with user prefix: "git@github.com"
    const at = a.lastIndexOf('@');
    if (at !== -1) {
      user = a.slice(0, at);
      host = a.slice(at + 1);
    } else {
      host = a;
    }
    afterHost = true; continue;
  }
  cmdParts.push(a);
}
if (!host || cmdParts.length === 0) {
  console.error('git-ssh-bridge: missing host or command');
  process.exit(255);
}
const cmd = cmdParts.join(' ');

const keyPath = path.join(__dirname, 'keys', 'id_ed25519');
let privateKey;
try {
  privateKey = fs.readFileSync(keyPath, 'utf8');
} catch (e) {
  console.error('git-ssh-bridge: deploy key not found at ' + keyPath);
  process.exit(255);
}

const conn = new Client();
let exiting = false;

conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('git-ssh-bridge: exec failed: ' + err.message);
      conn.end();
      process.exit(255);
    }
    // Wire local stdin/stdout/stderr to the remote command
    process.stdin.pipe(stream.stdin);
    stream.stdout.pipe(process.stdout);
    stream.stderr.pipe(process.stderr);

    stream.on('exit', (code, signal) => {
      exiting = true;
      process.stdout.write('', () => {});
      conn.end();
      // Give pending stdout writes a moment to flush
      setTimeout(() => process.exit(code === null ? 1 : code), 120);
    });
    stream.on('close', () => {
      if (!exiting) { conn.end(); process.exit(0); }
    });
  });
});

conn.on('error', (err) => {
  console.error('git-ssh-bridge: ' + err.message);
  process.exit(255);
});

conn.connect({
  host,
  port,
  username: user,
  privateKey,
  readyTimeout: 20000,
  keepaliveInterval: 10000,
});
