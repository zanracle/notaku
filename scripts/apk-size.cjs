const fs = require('fs');

const file = process.argv[2];
const buf = fs.readFileSync(file);

// Cari End of Central Directory (EOCD)
let eocd = -1;
for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
  if (buf.readUInt32LE(i) === 0x06054b50) {
    eocd = i;
    break;
  }
}
if (eocd < 0) throw new Error('EOCD tidak ditemukan');

const count = buf.readUInt16LE(eocd + 10);
let offset = buf.readUInt32LE(eocd + 16);
const entries = [];

for (let i = 0; i < count; i++) {
  if (buf.readUInt32LE(offset) !== 0x02014b50) break;
  const compSize = buf.readUInt32LE(offset + 20);
  const uncompSize = buf.readUInt32LE(offset + 24);
  const nameLen = buf.readUInt16LE(offset + 28);
  const extraLen = buf.readUInt16LE(offset + 30);
  const commentLen = buf.readUInt16LE(offset + 32);
  const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);
  entries.push({ name, compSize, uncompSize });
  offset += 46 + nameLen + extraLen + commentLen;
}

entries.sort((a, b) => b.compSize - a.compSize);
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

console.log('total entri:', entries.length);
for (const e of entries.slice(0, 22)) console.log(mb(e.compSize).padStart(9), String(e.uncompSize / 1024 / 1024).padStart(8) + ' MB ', e.name);

const groups = {};
for (const e of entries) {
  const key = e.name.startsWith('lib/')
    ? 'lib/' + e.name.split('/')[1]
    : e.name.startsWith('res/')
      ? 'res/'
      : e.name.startsWith('assets/')
        ? 'assets/'
        : e.name;
  groups[key] = (groups[key] || 0) + e.compSize;
}
console.log('\n--- grup teratas ---');
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 14)) {
  console.log(mb(v).padStart(9), k);
}
