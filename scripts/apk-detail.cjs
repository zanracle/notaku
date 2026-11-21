const fs = require('fs');
const buf = fs.readFileSync(process.argv[2]);

let eocd = -1;
for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
  if (buf.readUInt32LE(i) === 0x06054b50) {
    eocd = i;
    break;
  }
}
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

const filter = process.argv[3] || '';
const rows = entries.filter((e) => e.name.startsWith(filter)).sort((a, b) => b.compSize - a.compSize);
for (const row of rows.slice(0, 15)) {
  console.log((row.compSize / 1024 / 1024).toFixed(2).padStart(8), 'MB ', row.name);
}
