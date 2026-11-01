import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { Worker } from 'node:worker_threads';

const require = createRequire(import.meta.url);

// A 145-byte synthetic ZIP64 directory with a missing required extra field.
// Run only in a terminable worker so a parser regression cannot hang the test job.
function missingZip64Extra() {
  const bytes = new Uint8Array(145);
  const view = new DataView(bytes.buffer);
  const u16 = (offset, value) => view.setUint16(offset, value, true);
  const u32 = (offset, value) => view.setUint32(offset, value, true);
  u32(0, 0x02014b50);
  u16(4, 45);
  u16(6, 45);
  u32(20, 0xffffffff);
  u32(24, 1);
  u16(28, 1);
  bytes[46] = 97;
  u32(47, 0x06064b50);
  u32(51, 44);
  u16(59, 45);
  u16(61, 45);
  u32(71, 1);
  u32(79, 1);
  u32(87, 47);
  u32(103, 0x07064b50);
  u32(111, 47);
  u32(119, 1);
  u32(123, 0x06054b50);
  u16(131, 1);
  u16(133, 1);
  u32(135, 47);
  return bytes;
}

for (const parent of ['three-stdlib', '@types/three/package.json']) {
  const parentRequire = createRequire(require.resolve(parent));
  const modulePath = parentRequire.resolve('fflate');

  test(`${parent}: retains the compressed-data and ZIP APIs`, () => {
    const api = parentRequire('fflate');
    const fixture = api.strToU8('Xynth synthetic offline archive fixture\n');
    assert.deepEqual(api.decompressSync(api.compressSync(fixture)), fixture);
    const decoded = api.unzipSync(api.zipSync({ 'synthetic.txt': fixture }));
    assert.deepEqual(decoded['synthetic.txt'], fixture);
  });

  test(`${parent}: rejects missing ZIP64 data within a bounded worker`, { timeout: 5000 }, async t => {
    const worker = new Worker(new URL('./fixtures/unzip-worker.cjs', import.meta.url), {
      workerData: { modulePath, archive: missingZip64Extra() },
    });
    t.after(() => worker.terminate());
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Archive parser exceeded its two-second bound')), 2000);
      worker.once('message', result => { clearTimeout(timer); resolve(result); });
      worker.once('error', error => { clearTimeout(timer); reject(error); });
    });
    assert.equal(result.rejected, true);
    assert.equal(result.code, 13);
  });
}
