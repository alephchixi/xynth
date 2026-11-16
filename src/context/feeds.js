// Live feeds for Xynth: each reading tries its sources in order and reports which one answered.
// Parsers are pure so they can be tested without a network. A reading that no source answers
// returns null, and the interface marks the value it then shows as simulated.

export const TIMEOUT_MS = 6000;
// A live value older than this is shown as stale rather than live.
export const STALE_MS = 90_000;

const MEMPOOL = 'https://mempool.space/api';
const BLOCKSTREAM = 'https://blockstream.info/api';
const BLOCKCHAIN_STATS = 'https://api.blockchain.info/stats';
const COINGECKO = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
const ETH_RPCS = [
  ['publicnode', 'https://ethereum-rpc.publicnode.com'],
  ['dRPC', 'https://eth.drpc.org'],
];
const SOL_RPCS = [
  ['publicnode', 'https://solana-rpc.publicnode.com'],
  ['Solana RPC', 'https://api.mainnet-beta.solana.com'],
];

// Every origin the instrument may contact, for the response policy and the tests.
export const FEED_ORIGINS = [
  'https://api.coingecko.com',
  'https://mempool.space',
  'https://blockstream.info',
  'https://api.blockchain.info',
  ...ETH_RPCS.map(([, url]) => url),
  ...SOL_RPCS.map(([, url]) => url),
];

const finite = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const hex = (value) => (typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value) ? parseInt(value, 16) : null);
const round2 = (value) => Math.round(value * 100) / 100;

// --- Parsers -------------------------------------------------------------------------------

export const parseCoinGeckoPrice = (body) => finite(body?.bitcoin?.usd);
export const parseBlockchainPrice = (body) => finite(body?.market_price_usd);

/** mempool.space reports hashes per second; the instrument works in EH/s. */
export const parseMempoolHashrate = (body) => {
  const value = finite(body?.currentHashrate);
  return value === null ? null : value / 1e18;
};
/** blockchain.info reports GH/s. */
export const parseBlockchainHashrate = (body) => {
  const value = finite(body?.hash_rate);
  return value === null ? null : value / 1e9;
};

/**
 * Recent mempool transactions, in the Esplora format shared by mempool.space and Blockstream:
 * `fee` in satoshis, `vsize` in virtual bytes, `value` in satoshis.
 */
export const parseRecentTransactions = (body) => {
  if (!Array.isArray(body) || body.length === 0) return null;
  const sizes = body.map((tx) => finite(tx?.vsize) ?? finite(tx?.size) ?? 0);
  const totalSize = sizes.reduce((sum, size) => sum + size, 0);
  const totalFee = body.reduce((sum, tx) => sum + (finite(tx?.fee) ?? 0), 0);
  const totalValue = body.reduce((sum, tx) => sum + (finite(tx?.value) ?? 0), 0);
  if (totalSize <= 0) return null;
  return {
    count: body.length,
    avgSize: Math.round(totalSize / body.length),
    avgFee: round2(totalFee / totalSize), // sat/vB
    totalValue: (totalValue / 1e8).toFixed(2), // BTC
  };
};

/** mempool.space recommended fees, in sat/vB. */
export const parseRecommendedFees = (body) => {
  const high = finite(body?.fastestFee);
  const medium = finite(body?.hourFee) ?? finite(body?.halfHourFee);
  const low = finite(body?.economyFee) ?? finite(body?.minimumFee);
  return high === null || medium === null || low === null ? null : { low, medium, high };
};
/** Blockstream fee estimates by confirmation target, in sat/vB: next block, about an hour, about a day. */
export const parseFeeEstimates = (body) => {
  const high = finite(body?.['1']), medium = finite(body?.['6']), low = finite(body?.['144']);
  return high === null || medium === null || low === null ? null : { low: round2(low), medium: round2(medium), high: round2(high) };
};

/** Mempool size in MB, from either service's `vsize` in virtual bytes. */
export const parseMempoolSize = (body) => {
  const vsize = finite(body?.vsize);
  return vsize === null ? null : Math.round(vsize / 1e4) / 100;
};

/** A JSON-RPC batch of `eth_gasPrice` and the latest block. Gas in Gwei, use in per cent. */
export const parseEthereumBatch = (body) => {
  if (!Array.isArray(body)) return null;
  const byId = new Map(body.map((item) => [item?.id, item?.result]));
  const gasWei = hex(byId.get(1));
  const block = byId.get(2);
  const used = hex(block?.gasUsed), limit = hex(block?.gasLimit);
  if (gasWei === null || used === null || !limit) return null;
  return { gasPrice: gasWei / 1e9, blockUtil: Math.min(100, Math.max(0, (used / limit) * 100)) };
};

/** A JSON-RPC batch of recent performance samples and epoch info. */
export const parseSolanaBatch = (body) => {
  if (!Array.isArray(body)) return null;
  const byId = new Map(body.map((item) => [item?.id, item?.result]));
  const sample = byId.get(1)?.[0];
  const epoch = byId.get(2);
  const transactions = finite(sample?.numTransactions), period = finite(sample?.samplePeriodSecs);
  if (transactions === null || !period || finite(epoch?.epoch) === null || !finite(epoch?.slotsInEpoch)) return null;
  return {
    tps: Math.round(transactions / period),
    epoch: epoch.epoch,
    epochProgress: (finite(epoch.slotIndex) ?? 0) / epoch.slotsInEpoch,
  };
};

// --- Fetching ------------------------------------------------------------------------------

async function json(url, init = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

const rpc = (url, calls, fetchImpl) => json(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(calls.map(([method, params], index) => ({ jsonrpc: '2.0', id: index + 1, method, params }))),
}, fetchImpl);

/**
 * Tries each source in order. Returns `{ value, source }` from the first that answers with a
 * value the parser accepts, or `null` when none does.
 */
export async function firstLive(sources, fetchImpl = fetch) {
  for (const [source, load, parse] of sources) {
    try {
      const value = parse(await load(fetchImpl));
      if (value !== null && value !== undefined) return { value, source };
    } catch {
      // The next source is tried; a reading no source answers is reported as null.
    }
  }
  return null;
}

export const READINGS = {
  price: [
    ['CoinGecko', (f) => json(COINGECKO, {}, f), parseCoinGeckoPrice],
    ['blockchain.info', (f) => json(BLOCKCHAIN_STATS, {}, f), parseBlockchainPrice],
  ],
  hashrate: [
    ['mempool.space', (f) => json(`${MEMPOOL}/v1/mining/hashrate/3d`, {}, f), parseMempoolHashrate],
    ['blockchain.info', (f) => json(BLOCKCHAIN_STATS, {}, f), parseBlockchainHashrate],
  ],
  transactions: [
    ['mempool.space', (f) => json(`${MEMPOOL}/mempool/recent`, {}, f), parseRecentTransactions],
    ['Blockstream', (f) => json(`${BLOCKSTREAM}/mempool/recent`, {}, f), parseRecentTransactions],
  ],
  fees: [
    ['mempool.space', (f) => json(`${MEMPOOL}/v1/fees/recommended`, {}, f), parseRecommendedFees],
    ['Blockstream', (f) => json(`${BLOCKSTREAM}/fee-estimates`, {}, f), parseFeeEstimates],
  ],
  mempool: [
    ['mempool.space', (f) => json(`${MEMPOOL}/mempool`, {}, f), parseMempoolSize],
    ['Blockstream', (f) => json(`${BLOCKSTREAM}/mempool`, {}, f), parseMempoolSize],
  ],
  ethereum: ETH_RPCS.map(([name, url]) => [name, (f) => rpc(url, [['eth_gasPrice', []], ['eth_getBlockByNumber', ['latest', false]]], f), parseEthereumBatch]),
  solana: SOL_RPCS.map(([name, url]) => [name, (f) => rpc(url, [['getRecentPerformanceSamples', [1]], ['getEpochInfo', []]], f), parseSolanaBatch]),
};

/** How a value on screen came to be there: `live`, `stale` or `simulated`. */
export function provenance(reading, now = Date.now()) {
  if (!reading) return { state: 'simulated', source: null };
  return { state: now - reading.at > STALE_MS ? 'stale' : 'live', source: reading.source };
}
