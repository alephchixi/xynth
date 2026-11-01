const { parentPort, workerData } = require('node:worker_threads');

try {
  require(workerData.modulePath).unzipSync(workerData.archive);
  parentPort.postMessage({ rejected: false });
} catch (error) {
  parentPort.postMessage({ rejected: true, code: error?.code ?? null });
}
