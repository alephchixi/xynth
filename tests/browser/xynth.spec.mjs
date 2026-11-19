import { expect, test } from '@playwright/test';

test('the built synthesizer initializes with offline feeds and retains its controls', async ({ page }) => {
  const errors = [];
  const unexpectedRequests = [];
  const mockedFeeds = new Set();
  const rpcMethods = new Set();
  let audioReady = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || message.text().startsWith('Audio Update Error:')) errors.push(message.text());
    if (message.text() === 'Audio Initialized Successfully') audioReady = true;
  });
  page.on('dialog', async dialog => { errors.push('Unexpected application dialog'); await dialog.dismiss(); });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let body;
    if (url.hostname === 'api.coingecko.com' && url.pathname === '/api/v3/simple/price') {
      body = { bitcoin: { usd: 96000 } };
    } else if (url.hostname === 'mempool.space') {
      const fixtures = {
        '/api/v1/mining/hashrate/3d': { currentHashrate: 450e18 },
        '/api/mempool/recent': [{ txid: 'synthetic', vsize: 250, fee: 2500, value: 10000000 }],
        '/api/v1/fees/recommended': { economyFee: 5, hourFee: 10, halfHourFee: 15, fastestFee: 30 },
        '/api/mempool': { vsize: 100000000 },
      };
      body = fixtures[url.pathname];
    } else if (url.hostname === 'ethereum-rpc.publicnode.com' && request.method() === 'POST') {
      const batch = request.postDataJSON();
      body = batch.map(({ id, method }) => {
        rpcMethods.add(method);
        return { jsonrpc: '2.0', id, result: method === 'eth_gasPrice' ? '0x7735940' : { gasUsed: '0xe4e1c0', gasLimit: '0x1c9c380' } };
      });
    } else if (url.hostname === 'solana-rpc.publicnode.com' && request.method() === 'POST') {
      const batch = request.postDataJSON();
      body = batch.map(({ id, method }) => {
        rpcMethods.add(method);
        return { jsonrpc: '2.0', id, result: method === 'getRecentPerformanceSamples'
          ? [{ numTransactions: 240000, samplePeriodSecs: 60 }]
          : { epoch: 700, slotIndex: 21600, slotsInEpoch: 432000 } };
      });
    }
    if (body) {
      mockedFeeds.add(url.hostname);
      return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
    }
    unexpectedRequests.push(url.origin + url.pathname);
    return route.abort();
  });

  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('Xynth');
  const initialize = page.getByRole('button', { name: 'INITIALIZE SYSTEM' });
  await expect(initialize).toBeVisible();
  expect(audioReady).toBe(false);
  await initialize.click();
  await expect(initialize).toHaveCount(0);
  await expect.poll(() => audioReady).toBe(true);
  await expect(page.getByText('System Failure', { exact: true })).toHaveCount(0);
  await expect.poll(() => mockedFeeds.size).toBe(4);
  await expect.poll(() => rpcMethods.size).toBe(4);
  // Every value on screen names the source that answered it.
  await expect.poll(() => page.locator('.module-provenance [data-state="live"]').count(), { timeout: 10_000 }).toBe(7);
  await expect(page.locator('.module-provenance [data-state="simulated"]')).toHaveCount(0);
  await expect(page.locator('.module-provenance').first()).toContainText('PRICE: LIVE · CoinGecko');
  await expect(page.locator('.module').filter({ hasText: 'THE ATMOSPHERE' }).locator('.module-data')).toContainText('Gas: 0.125 Gwei');
  for (const title of ['THE MONSTER', 'THE GHOST', 'THE ATMOSPHERE', 'THE ACCELERATOR']) {
    await expect(page.locator('.module-title').filter({ hasText: title })).toBeVisible();
  }
  const monster = page.locator('.module').filter({ has: page.getByText('THE MONSTER', { exact: true }) });
  const modulation = monster.locator('.control-group').filter({ hasText: 'MEMECOIN TIMBRE' });
  await modulation.getByRole('combobox').selectOption('doge');
  await expect(modulation.getByRole('combobox')).toHaveValue('doge');
  await monster.getByRole('button', { name: 'ACTIVE', exact: true }).click();
  await expect(monster).toHaveClass(/muted-style/);
  await monster.getByRole('button', { name: 'OFFLINE', exact: true }).click();
  await expect(monster).not.toHaveClass(/muted-style/);
  await expect.poll(() => monster.locator('.module-data').innerText(), { timeout: 10_000 }).toContain('96.0k');
  await expect.poll(async () => Number(await modulation.locator('canvas + div').innerText()), { timeout: 10_000 }).toBeLessThanOrEqual(0.2);
  const slider = monster.getByRole('slider').last();
  await slider.press('Home');
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('0.01');
  const webglCanvas = page.locator('#top-visualizers > div').nth(1).locator('canvas');
  await expect(webglCanvas).toBeVisible();
  expect(await webglCanvas.evaluate(canvas => {
    const context = canvas.getContext('webgl2');
    return Boolean(context && !context.isContextLost() && context.drawingBufferWidth && context.drawingBufferHeight);
  })).toBe(true);
  expect(unexpectedRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('silent services fall back to the next source, and a feed with none is marked simulated', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const fixtures = {
      'api.coingecko.com/api/v3/simple/price': { bitcoin: { usd: 65000 } },
      'api.blockchain.info/stats': { hash_rate: 1.1e12, market_price_usd: 65000 },
      'blockstream.info/api/mempool/recent': [{ txid: 'b', vsize: 200, fee: 400, value: 5000000 }],
      'blockstream.info/api/fee-estimates': { 1: 1.2, 6: 0.13, 144: 0.11 },
      'blockstream.info/api/mempool': { vsize: 33500000 },
    };
    const body = fixtures[url.hostname + url.pathname];
    if (url.hostname === 'ethereum-rpc.publicnode.com') {
      return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(request.postDataJSON().map(({ id, method }) => ({ jsonrpc: '2.0', id, result: method === 'eth_gasPrice' ? '0x3b9aca00' : { gasUsed: '0x10', gasLimit: '0x20' } }))) });
    }
    if (['api.mainnet-beta.solana.com', 'solana-rpc.publicnode.com'].includes(url.hostname)) {
      return route.fulfill({ status: 403, headers, contentType: 'application/json', body: JSON.stringify({ jsonrpc: '2.0', error: { code: 403, message: 'Access forbidden' }, id: 1 }) });
    }
    if (body) return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
    return route.abort(); // mempool.space and anything else stay silent
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'INITIALIZE SYSTEM' }).click();
  const provenance = page.locator('.module-provenance');
  await expect.poll(() => provenance.allInnerTexts().then(texts => texts.join(' | ')), { timeout: 20_000 })
    .toContain('HASHRATE: LIVE · blockchain.info');
  const text = (await provenance.allInnerTexts()).join(' | ');
  expect(text).toContain('TRANSACTIONS: LIVE · Blockstream');
  expect(text).toContain('FEES: LIVE · Blockstream');
  expect(text).toContain('GAS AND BLOCK: LIVE · publicnode');
  expect(text).toContain('THROUGHPUT AND EPOCH: SIMULATED');
  await expect(page.locator('.module').filter({ hasText: 'THE ACCELERATOR' }).locator('.module-data')).toContainText('Epoch —');
  expect(errors).toEqual([]);
});
