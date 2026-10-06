import fs from 'node:fs';
import zlib from 'node:zlib';

const indexPath = new URL('../index.html', import.meta.url);
const source = fs.readFileSync(indexPath);

if (source.includes(Buffer.from('</html>'))) {
  console.log('index.html is already complete; no repair was needed.');
  process.exit(0);
}

const marker = Buffer.from('if (isHono');
const markerOffset = source.lastIndexOf(marker);

if (markerOffset === -1) {
  throw new Error('Could not locate the recovery marker in index.html.');
}

const compressedOffset = markerOffset + marker.length;
let cursor = compressedOffset;
const recoveredChunks = [];

while (cursor < source.length) {
  const result = zlib.inflateSync(source.subarray(cursor), { info: true });
  const consumedBytes = result.engine.bytesWritten;

  if (!consumedBytes) {
    throw new Error('A compressed recovery chunk consumed zero bytes.');
  }

  recoveredChunks.push(result.buffer);
  cursor += consumedBytes;
}

const repaired = Buffer.concat([
  source.subarray(0, compressedOffset),
  ...recoveredChunks,
]);

if (!repaired.includes(Buffer.from('</script>')) || !repaired.includes(Buffer.from('</html>'))) {
  throw new Error('Recovered index.html is missing its closing tags.');
}

fs.writeFileSync(indexPath, repaired);
console.log(`Recovered index.html from ${recoveredChunks.length} compressed chunks.`);
