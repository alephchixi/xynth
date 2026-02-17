import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AudioContext } from './AudioContext';

export const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const { isReady, updateBitcoin, updateTransport, updateResources, updateEthereum, updateSolana } = useContext(AudioContext);

    // Core Data
    const [data, setData] = useState({
        bitcoin: { hashrate: 450, price: 95000, muted: false, label: "Loading..." },
        transport: { count: 0, avgSize: 0, avgFee: 0, totalValue: 0, muted: false, label: "Loading..." },
        resources: {
            mempoolSize: 0,
            mempoolFees: { low: 0, medium: 0, high: 0 },
            muted: false,
            label: "Loading...",
            lowFeeHz: 0,
            highFeeHz: 0
        },
        ethereum: { gasPrice: 0, blockUtil: 0, muted: false, label: "Loading..." },
        solana: { tps: 0, epoch: 0, epochProgress: 0, muted: false, label: "Loading..." },
        life: { stats: { birthsToday: 0, deathsToday: 0 }, muted: false, label: "Loading..." }
    });

    // Modulation State (Restored)
    const [modSettings, setModSettings] = useState({
        memecoin: 'fartcoin', // fartcoin, pepe, wif, doge
        polymarket: 'election' // election, sports, pop
    });

    // Life Synth State
    const [lifeSettings, setLifeSettings] = useState({
        scale: 'minor',
        key: 'C'
    });

    const [modHistory, setModHistory] = useState([]);
    const marketDataRef = useRef({
        bitcoin: 95000,
        hashrate: 0,
        txCount: 0,
        txAvgSize: 0,
        txAvgFee: 0,
        txTotalValue: 0,
        mempoolSize: 0,
        mempoolFees: { low: 0, medium: 0, high: 0 },
        ethGasPrice: 0,
        ethBlockUtil: 0,
        solanaTps: 0,
        solanaEpoch: 0,
        solanaEpochProgress: 0
    });

    // Main Loop
    const fetchData = () => {
        try {
            const hashrate = marketDataRef.current.hashrate || (400 + Math.random() * 100);
            const btcPrice = marketDataRef.current.bitcoin;

            const txCount = marketDataRef.current.txCount || Math.floor(2000 + Math.random() * 1000);
            const txAvgSize = marketDataRef.current.txAvgSize || Math.floor(500 + Math.random() * 500);
            const txAvgFee = marketDataRef.current.txAvgFee || Math.floor(20 + Math.random() * 30);
            const txTotalValue = marketDataRef.current.txTotalValue || (Math.random() * 100).toFixed(2);

            const mempoolSize = marketDataRef.current.mempoolSize || Math.floor(100 + Math.random() * 50);
            const mempoolFees = marketDataRef.current.mempoolFees.low ? marketDataRef.current.mempoolFees : {
                low: Math.floor(10 + Math.random() * 10),
                medium: Math.floor(30 + Math.random() * 20),
                high: Math.floor(80 + Math.random() * 40)
            };

            const ethGasPrice = marketDataRef.current.ethGasPrice || Math.floor(20 + Math.random() * 30);
            const ethBlockUtil = marketDataRef.current.ethBlockUtil || (50 + Math.random() * 50);
            const solanaTps = marketDataRef.current.solanaTps || Math.floor(2000 + Math.random() * 1000);
            const solanaEpoch = marketDataRef.current.solanaEpoch || 0;
            const solanaEpochProgress = marketDataRef.current.solanaEpochProgress || 0;

            // Map mempool fees to notes for audio synthesis
            const lowFeeNote = `C${Math.floor(2 + mempoolFees.low / 50)}`;
            const highFeeNote = `C${Math.floor(3 + mempoolFees.high / 100)}`;

            // Memecoin Frequency Modulation Target
            // instead of LFO, we pass the coin type to AudioContext to select a frequency base
            // Volatility still adds texture
            let volatility = Math.random();
            if (modSettings.memecoin === 'doge') volatility *= 0.2;
            if (modSettings.memecoin === 'pepe') volatility *= 0.8;
            if (modSettings.memecoin === 'fartcoin') volatility = Math.pow(volatility, 0.4);

            // Update history
            setModHistory(prev => {
                const newHist = [...prev, volatility];
                if (newHist.length > 50) newHist.shift();
                return newHist;
            });


            // Define jitter variables in outer scope
            let jitterTps = solanaTps;
            let jitterEpochProgress = solanaEpochProgress;

            let audioFeedback = {};
            if (isReady) {
                try {
                    // Bitcoin: Price + Hashrate + Memecoin Type + Volatility
                    updateBitcoin(hashrate, btcPrice, modSettings.memecoin, volatility);

                    // Polymarket Flow Simulation
                    let flow = 0;
                    if (modSettings.polymarket === 'election') flow = 0.9;
                    if (modSettings.polymarket === 'sports') flow = 0.6;
                    if (modSettings.polymarket === 'pop') flow = 0.3;
                    // Add some variance
                    flow += (Math.random() - 0.5) * 0.1;
                    flow = Math.max(0, Math.min(1, flow));

                    // Jitter for noticeable Variation
                    const jitterCount = Math.floor(txCount + (Math.random() - 0.5) * 200);
                    const jitterFee = Math.max(1, Math.floor(txAvgFee + (Math.random() - 0.5) * 5));

                    updateTransport(jitterCount, flow, jitterFee);

                    // Remove duplicate updateEthereum
                    updateEthereum(ethGasPrice, ethBlockUtil);

                    // Solana: TPS + Epoch Info
                    // Add significant jitter/oscillation to TPS (The Accelerator needs to move)
                    const osc = Math.sin(Date.now() / 1000) * 500; // Slow oscillation
                    jitterTps = Math.floor(solanaTps + osc + (Math.random() - 0.5) * 200);

                    // Epoch progress micro-movements
                    jitterEpochProgress = solanaEpochProgress + (Math.random() * 0.0001);

                    updateSolana(jitterTps, solanaEpoch, jitterEpochProgress);

                    audioFeedback = updateResources(lowFeeNote, mempoolFees.high, mempoolSize, mempoolFees.medium) || {};
                } catch (audioErr) {
                    console.warn("Audio Update Error:", audioErr);
                }
            }

            const lowFeeHz = audioFeedback.goldHz || (Math.max(20, mempoolFees.low * 2));
            const highFeeHz = audioFeedback.oilHz || (Math.max(20, mempoolFees.high));

            setData(prev => ({
                bitcoin: { ...prev.bitcoin, hashrate, price: btcPrice, label: `${hashrate.toFixed(2)} EH/s | $${(btcPrice / 1000).toFixed(1)}k` },
                transport: {
                    ...prev.transport,
                    count: txCount,
                    avgSize: txAvgSize,
                    avgFee: txAvgFee,
                    totalValue: txTotalValue,
                    label: `${txCount} tx | ${txAvgSize}B avg`
                },
                resources: {
                    ...prev.resources,
                    mempoolSize,
                    mempoolFees,
                    label: `Mempool: ${mempoolSize}MB | Low: ${mempoolFees.low} Med: ${mempoolFees.medium} High: ${mempoolFees.high} sat/vB`,
                    lowFeeHz: lowFeeHz.toFixed(1),
                    highFeeHz: highFeeHz.toFixed(1)
                },
                ethereum: {
                    ...prev.ethereum,
                    gasPrice: ethGasPrice,
                    blockUtil: ethBlockUtil,
                    label: `Gas: ${ethGasPrice} Gwei | Block: ${ethBlockUtil.toFixed(1)}%`
                },
                solana: {
                    ...prev.solana,
                    tps: jitterTps, // Show the lively value
                    epoch: solanaEpoch,
                    epochProgress: jitterEpochProgress,
                    label: `${jitterTps.toLocaleString()} TPS | Epoch ${solanaEpoch} (${(jitterEpochProgress * 100).toFixed(1)}%)`
                }
            }));
        } catch (e) {
            console.error("Main Loop Crash Prevented:", e);
        }
    };

    // Bitcoin Price Polling
    useEffect(() => {
        if (!isReady) return;

        const fetchBitcoinPrice = async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
                if (!res.ok) throw new Error('CoinGecko Error');
                const data = await res.json();
                if (data.bitcoin) {
                    marketDataRef.current.bitcoin = data.bitcoin.usd;
                }
            } catch (e) {
                console.warn("Bitcoin Price Fetch Fail:", e);
            }
        };

        fetchBitcoinPrice();
        const poll = setInterval(fetchBitcoinPrice, 30000);
        return () => clearInterval(poll);
    }, [isReady]);

    // Independent Pollers for Blockchain Data
    useEffect(() => {
        if (!isReady) return;

        // 1. Hashrate (Mempool.space)
        const fetchHashrate = async () => {
            try {
                const res = await fetch('https://mempool.space/api/v1/mining/hashrate/3d');
                if (!res.ok) throw new Error('Mempool Error');
                const data = await res.json();
                if (data && data.currentHashrate) {
                    marketDataRef.current.hashrate = data.currentHashrate / 1e18;
                }
            } catch (e) {
                console.warn("Hashrate Fetch Fail:", e);
            }
        };

        // 2. Bitcoin Transactions (Mempool.space)
        const fetchTransactions = async () => {
            try {
                const res = await fetch('https://mempool.space/api/mempool/recent');
                if (!res.ok) throw new Error('Mempool Error');
                const data = await res.json();
                if (data && Array.isArray(data)) {
                    marketDataRef.current.txCount = data.length;

                    const totalSize = data.reduce((sum, tx) => sum + (tx.size || 0), 0);
                    const totalFee = data.reduce((sum, tx) => sum + (tx.fee || 0), 0);
                    const totalValue = data.reduce((sum, tx) => sum + (tx.value || 0), 0);

                    marketDataRef.current.txAvgSize = data.length > 0 ? Math.floor(totalSize / data.length) : 0;
                    marketDataRef.current.txAvgFee = data.length > 0 ? Math.floor((totalFee / totalSize) * 1e8) : 0;
                    marketDataRef.current.txTotalValue = (totalValue / 1e8).toFixed(2);
                }
            } catch (e) {
                console.warn("Mempool Fetch Fail:", e);
            }
        };

        // 3. Mempool Fee Data
        const fetchMempoolFees = async () => {
            try {
                const res = await fetch('https://mempool.space/api/v1/fees/recommended');
                if (!res.ok) throw new Error('Mempool Fees Error');
                const data = await res.json();
                if (data) {
                    marketDataRef.current.mempoolFees = {
                        low: data.economyFee || data.minimumFee || 1,
                        medium: data.hourFee || data.halfHourFee || 10,
                        high: data.fastestFee || 50
                    };
                }

                const mempoolRes = await fetch('https://mempool.space/api/mempool');
                if (mempoolRes.ok) {
                    const mempoolData = await mempoolRes.json();
                    marketDataRef.current.mempoolSize = Math.floor(mempoolData.vsize / 1000000);
                }
            } catch (e) {
                console.warn("Mempool Fees Fetch Fail:", e);
            }
        };

        // 4. Ethereum Gas Data
        const fetchEthereumData = async () => {
            try {
                const res = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
                if (!res.ok) throw new Error('Etherscan Error');
                const data = await res.json();

                if (data.status === '1' && data.result) {
                    marketDataRef.current.ethGasPrice = parseInt(data.result.ProposeGasPrice) || 20;
                    console.log(`[Ethereum] Gas: ${marketDataRef.current.ethGasPrice} Gwei`);
                }

                const blockRes = await fetch('https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag=latest&boolean=true');
                if (blockRes.ok) {
                    const blockData = await blockRes.json();
                    if (blockData.result) {
                        const gasUsed = parseInt(blockData.result.gasUsed, 16);
                        const gasLimit = parseInt(blockData.result.gasLimit, 16);
                        // Clamp to 0-100
                        const util = Math.min(100, Math.max(0, (gasUsed / gasLimit) * 100));
                        marketDataRef.current.ethBlockUtil = util;
                    }
                }
            } catch (e) {
                console.warn("Ethereum Data Fetch Fail:", e);
            }
        };

        // 5. Solana Data (TPS & Epoch)
        const fetchSolanaData = async () => {
            try {
                // TPS
                const perfRes = await fetch('https://api.mainnet-beta.solana.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getRecentPerformanceSamples',
                        params: [1]
                    })
                });

                if (perfRes.ok) {
                    const data = await perfRes.json();
                    if (data.result && data.result.length > 0) {
                        const sample = data.result[0];
                        marketDataRef.current.solanaTps = Math.floor(sample.numTransactions / sample.samplePeriodSecs);
                    }
                }

                // Epoch Info
                const epochRes = await fetch('https://api.mainnet-beta.solana.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getEpochInfo'
                    })
                });

                if (epochRes.ok) {
                    const data = await epochRes.json();
                    if (data.result) {
                        marketDataRef.current.solanaEpoch = data.result.epoch;
                        // Calculate progress 0.0 - 1.0
                        if (data.result.slotsInEpoch > 0) {
                            marketDataRef.current.solanaEpochProgress = data.result.slotIndex / data.result.slotsInEpoch;
                        }
                    }
                }

            } catch (e) {
                console.warn("Solana Data Fetch Fail:", e);
            }
        };

        // Initial Fetch
        fetchHashrate();
        fetchTransactions();
        fetchMempoolFees();
        fetchEthereumData();
        fetchSolanaData();

        // Intervals where mempool is faster
        const hInterval = setInterval(fetchHashrate, 60000);
        const txInterval = setInterval(fetchTransactions, 10000); // Faster polling for "real time" feel
        const feesInterval = setInterval(fetchMempoolFees, 10000);
        const ethInterval = setInterval(fetchEthereumData, 10000);
        const solInterval = setInterval(fetchSolanaData, 10000);

        return () => {
            clearInterval(hInterval);
            clearInterval(txInterval);
            clearInterval(feesInterval);
            clearInterval(ethInterval);
            clearInterval(solInterval);
        };
    }, [isReady]);

    // Main Loop Interval
    useEffect(() => {
        let interval;
        if (isReady) {
            fetchData();
            interval = setInterval(fetchData, 3000);
        }
        return () => clearInterval(interval);
    }, [isReady]);

    const toggleMute = (key) => {
        setData(prev => ({
            ...prev,
            [key]: { ...prev[key], muted: !prev[key].muted }
        }));
    };

    return (
        <DataContext.Provider value={{
            data,
            toggleMute,
            modSettings,
            setModSettings,
            modHistory,
            lifeSettings,
            setLifeSettings
        }}>
            {children}
        </DataContext.Provider>
    );
};
