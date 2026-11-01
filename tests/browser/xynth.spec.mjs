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
      body = { bitcoin: { usd: 95000 } };
    } else if (url.hostname === 'mempool.space') {
      const fixtures = {
        '/api/v1/mining/hashrate/3d': { currentHashrate: 450e18 },
        '/api/mempool/recent': [{ txid: 'synthetic', size: 250, fee: 0.000025, value: 10000000 }],
        '/api/v1/fees/recommended': { economyFee: 5, hourFee: 10, halfHourFee: 15, fastestFee: 30 },
        '/api/mempool': { vsize: 100000000 },
      };
      body = fixtures[url.pathname];
    } else if (url.hostname === 'api.etherscan.io' && url.pathname === '/api') {
      if (url.searchParams.get('action') === 'gasoracle') body = { status: '1', result: { ProposeGasPrice: '20' } };
      if (url.searchParams.get('action') === 'eth_getBlockByNumber') body = { result: { gasUsed: '0xe4e1c0', gasLimit: '0x1c9c380' } };
    } else if (url.hostname === 'api.mainnet-beta.solana.com' && request.method() === 'POST') {
      const rpc = request.postDataJSON();
      if (rpc.method === 'getRecentPerformanceSamples') body = { jsonrpc: '2.0', id: 1, result: [{ numTransactions: 240000, samplePeriodSecs: 60 }] };
      if (rpc.method === 'getEpochInfo') body = { jsonrpc: '2.0', id: 1, result: { epoch: 700, slotIndex: 21600, slotsInEpoch: 432000 } };
      if (body) rpcMethods.add(rpc.method);
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
  await expect.poll(() => rpcMethods.size).toBe(2);
  for (const title of ['THE MONSTER', 'THE GHOST', 'THE ATMOSPHERE', 'THE ACCELERATOR']) {
    await expect(page.locator('.module-title').filter({ hasText: title })).toBeVisible();
  }
  const monster = page.locator('.module').filter({ has: page.getByText('THE MONSTER', { exact: true }) });
  await monster.getByRole('button', { name: 'ACTIVE', exact: true }).click();
  await expect(monster).toHaveClass(/muted-style/);
  await monster.getByRole('button', { name: 'OFFLINE', exact: true }).click();
  await expect(monster).not.toHaveClass(/muted-style/);
  await expect.poll(() => monster.locator('.module-data').innerText()).toContain('95.0k');
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
