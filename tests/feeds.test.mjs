import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  FEED_ORIGINS, READINGS, STALE_MS, firstLive, provenance,
  parseBlockchainHashrate, parseEthereumBatch, parseFeeEstimates, parseMempoolHashrate, parseMempoolSize,
  parseRecentTransactions, parseRecommendedFees, parseSolanaBatch,
} from '../src/context/feeds.js';

test('hashrate is reported in EH/s from either source', () => {
  assert.equal(parseMempoolHashrate({ currentHashrate: 450e18 }), 450);
  assert.equal(parseBlockchainHashrate({ hash_rate: 1.1e12 }), 1100);
  assert.equal(parseMempoolHashrate({}), null);
});

test('recent transactions use vsize and fees in satoshis', () => {
  const parsed = parseRecentTransactions([
    { txid: 'a', fee: 500, vsize: 250, value: 10_000_000 },
    { txid: 'b', fee: 300, vsize: 150, value: 5_000_000 },
  ]);
  assert.deepEqual(parsed, { count: 2, avgSize: 200, avgFee: 2, totalValue: '0.15' });
  assert.equal(parseRecentTransactions([]), null);
});

test('fees keep sub-satoshi values instead of falling back', () => {
  assert.deepEqual(parseRecommendedFees({ fastestFee: 2, hourFee: 1, economyFee: 0.5 }), { low: 0.5, medium: 1, high: 2 });
  assert.deepEqual(parseFeeEstimates({ 1: 1.194, 6: 0.129, 144: 0.112 }), { low: 0.11, medium: 0.13, high: 1.19 });
  assert.equal(parseMempoolSize({ vsize: 33_535_165 }), 33.54);
  assert.equal(parseMempoolSize({ vsize: 400_000 }), 0.4);
});

test('Ethereum gas below one Gwei is kept as measured', () => {
  const parsed = parseEthereumBatch([
    { id: 2, result: { gasUsed: '0x1c9c380', gasLimit: '0x3938700' } },
    { id: 1, result: '0x7735940' }, // 0.125 Gwei
  ]);
  assert.equal(parsed.gasPrice, 0.125);
  assert.equal(parsed.blockUtil, 50);
  assert.equal(parseEthereumBatch([{ id: 1, error: { code: 403 } }]), null);
});

test('Solana throughput and epoch come from one batch', () => {
  assert.deepEqual(parseSolanaBatch([
    { id: 1, result: [{ numTransactions: 120_000, samplePeriodSecs: 60 }] },
    { id: 2, result: { epoch: 1088, slotIndex: 216_000, slotsInEpoch: 432_000 } },
  ]), { tps: 2000, epoch: 1088, epochProgress: 0.5 });
  assert.equal(parseSolanaBatch({ jsonrpc: '2.0', error: { code: 403, message: 'Access forbidden' } }), null);
});

test('a reading falls back to the next source and reports which one answered', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(new URL(url).hostname);
    if (url.startsWith('https://mempool.space')) throw new Error('timeout');
    return { ok: true, json: async () => ({ hash_rate: 1e12 }) };
  };
  assert.deepEqual(await firstLive(READINGS.hashrate, fetchImpl), { value: 1000, source: 'blockchain.info' });
  assert.deepEqual(calls, ['mempool.space', 'api.blockchain.info']);
  const silent = async () => ({ ok: false, status: 403, json: async () => ({}) });
  assert.equal(await firstLive(READINGS.solana, silent), null);
});

test('provenance distinguishes live, stale and simulated values', () => {
  const now = 1_000_000;
  assert.deepEqual(provenance(null, now), { state: 'simulated', source: null });
  assert.deepEqual(provenance({ source: 'Blockstream', at: now - 1000 }, now), { state: 'live', source: 'Blockstream' });
  assert.deepEqual(provenance({ source: 'Blockstream', at: now - STALE_MS - 1 }, now), { state: 'stale', source: 'Blockstream' });
});

test('the response policy allows exactly the feed origins', async () => {
  const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
  const connect = headers.match(/connect-src ([^;]+);/)[1].split(/\s+/);
  const feeds = connect.filter((origin) => !["'self'", 'https://cloudflareinsights.com'].includes(origin));
  assert.deepEqual([...feeds].sort(), [...new Set(FEED_ORIGINS)].sort());
});
