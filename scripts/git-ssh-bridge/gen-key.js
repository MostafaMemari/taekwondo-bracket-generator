// Generate ed25519 SSH keypair in OpenSSH format (for GitHub deploy key)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sshpk = require('sshpk');

const outDir = path.join(__dirname, 'keys');
fs.mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

// Convert to OpenSSH format via sshpk
const pk = sshpk.parsePrivateKey(privPem, 'pem');
const privOpenSSH = pk.toString('openssh');
const pubSSH = sshpk.parseKey(pubPem, 'pem').toString('ssh') + '\n';

fs.writeFileSync(path.join(outDir, 'id_ed25519'), privOpenSSH, { mode: 0o600 });
fs.writeFileSync(path.join(outDir, 'id_ed25519.pub'), pubSSH, { mode: 0o644 });

console.log('KEY OK');
console.log('---PUBLIC KEY---');
console.log(pubSSH.trim());
