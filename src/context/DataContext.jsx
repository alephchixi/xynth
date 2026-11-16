import React, { useState, useEffect, useEffectEvent, useContext, useRef } from 'react';
import { AudioContext, DataContext } from './contexts';
import { READINGS, firstLive, provenance } from './feeds';

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
    // Last live reading of each feed: { value, source, at }, or null until a source answers.
    const readingsRef = useRef({ price: null, hashrate: null, transactions: null, fees: null, mempool: null, ethereum: null, solana: null });

    // Main Loop
    const onSnapshot = useEffectEvent(() => {
        try {
            const live = readingsRef.current;
            const now = Date.now();
            const prov = (key) => provenance(live[key], now);

            // A value no source has answered stays simulated, and the screen says so.
            const hashrate = live.hashrate?.value ?? (400 + Math.random() * 100);
            const btcPrice = live.price?.value ?? 95000;

            const tx = live.transactions?.value;
            const txCount = tx?.count ?? Math.floor(2000 + Math.random() * 1000);
            const txAvgSize = tx?.avgSize ?? Math.floor(500 + Math.random() * 500);
            const txAvgFee = tx?.avgFee ?? Math.floor(20 + Math.random() * 30);
            const txTotalValue = tx?.totalValue ?? (Math.random() * 100).toFixed(2);

            const mempoolSize = live.mempool?.value ?? Math.floor(100 + Math.random() * 50);
            const mempoolFees = live.fees?.value ?? {
                low: Math.floor(10 + Math.random() * 10),
                medium: Math.floor(30 + Math.random() * 20),
                high: Math.floor(80 + Math.random() * 40)
            };

            const eth = live.ethereum?.value;
            const ethGasPrice = eth?.gasPrice ?? Math.floor(20 + Math.random() * 30);
            const ethBlockUtil = eth?.blockUtil ?? (50 + Math.random() * 50);
            const sol = live.solana?.value;
            const solanaTps = sol?.tps ?? Math.floor(2000 + Math.random() * 1000);
            const solanaEpoch = sol?.epoch ?? null;
            const solanaEpochProgress = sol?.epochProgress ?? 0;

            // Map mempool fees to notes for audio synthesis
            const lowFeeNote = `C${Math.floor(2 + mempoolFees.low / 50)}`;

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
                    const jitterCount = tx ? txCount : Math.floor(txCount + (Math.random() - 0.5) * 200);
                    const jitterFee = tx ? Math.max(1, txAvgFee) : Math.max(1, Math.floor(txAvgFee + (Math.random() - 0.5) * 5));

                    updateTransport(jitterCount, flow, jitterFee);

                    // Remove duplicate updateEthereum
                    updateEthereum(ethGasPrice, ethBlockUtil);

                    // Solana: TPS + Epoch Info
                    // Add significant jitter/oscillation to TPS (The Accelerator needs to move)
                    // Simulated throughput oscillates so the filter moves; a live value is shown as measured.
                    const osc = Math.sin(Date.now() / 1000) * 500; // Slow oscillation
                    jitterTps = sol ? solanaTps : Math.floor(solanaTps + osc + (Math.random() - 0.5) * 200);
                    jitterEpochProgress = solanaEpochProgress;

                    updateSolana(jitterTps);

                    audioFeedback = updateResources(lowFeeNote, mempoolFees.high, mempoolSize) || {};
                } catch (audioErr) {
                    console.warn("Audio Update Error:", audioErr);
                }
            }

            const lowFeeHz = audioFeedback.goldHz || (Math.max(20, mempoolFees.low * 2));
            const highFeeHz = audioFeedback.oilHz || (Math.max(20, mempoolFees.high));

            setData(prev => ({
                ...prev,
                bitcoin: {
                    ...prev.bitcoin, hashrate, price: btcPrice,
                    label: `${hashrate.toFixed(2)} EH/s | $${(btcPrice / 1000).toFixed(1)}k`,
                    provenance: [{ field: 'Price', ...prov('price') }, { field: 'Hashrate', ...prov('hashrate') }]
                },
                transport: {
                    ...prev.transport,
                    count: txCount,
                    avgSize: txAvgSize,
                    avgFee: txAvgFee,
                    totalValue: txTotalValue,
                    label: `${txCount} tx | ${txAvgSize}vB avg`,
                    provenance: [{ field: 'Transactions', ...prov('transactions') }]
                },
                resources: {
                    ...prev.resources,
                    mempoolSize,
                    mempoolFees,
                    label: `Mempool: ${mempoolSize}MB | Low: ${mempoolFees.low} Med: ${mempoolFees.medium} High: ${mempoolFees.high} sat/vB`,
                    lowFeeHz: lowFeeHz.toFixed(1),
                    highFeeHz: highFeeHz.toFixed(1),
                    provenance: [{ field: 'Fees', ...prov('fees') }, { field: 'Mempool', ...prov('mempool') }]
                },
                ethereum: {
                    ...prev.ethereum,
                    gasPrice: ethGasPrice,
                    blockUtil: ethBlockUtil,
                    label: `Gas: ${Number(ethGasPrice.toPrecision(3))} Gwei | Block: ${ethBlockUtil.toFixed(1)}%`,
                    provenance: [{ field: 'Gas and block', ...prov('ethereum') }]
                },
                solana: {
                    ...prev.solana,
                    tps: jitterTps,
                    epoch: solanaEpoch,
                    epochProgress: jitterEpochProgress,
                    label: `${jitterTps.toLocaleString()} TPS | Epoch ${solanaEpoch ?? '—'}${solanaEpoch === null ? '' : ` (${(jitterEpochProgress * 100).toFixed(1)}%)`}`,
                    provenance: [{ field: 'Throughput and epoch', ...prov('solana') }]
                }
            }));
        } catch (e) {
            console.error("Main Loop Crash Prevented:", e);
        }
    });

    // Feed polling: each reading keeps the last value a source returned, with its source and time.
    useEffect(() => {
        if (!isReady) return;
        let cancelled = false;
        const poll = async (key) => {
            const result = await firstLive(READINGS[key]);
            if (cancelled) return;
            if (result) readingsRef.current[key] = { ...result, at: Date.now() };
            else console.warn(`No live source answered for ${key}`);
        };
        const schedule = [['price', 30000], ['hashrate', 60000], ['transactions', 10000], ['fees', 10000], ['mempool', 10000], ['ethereum', 12000], ['solana', 10000]];
        const timers = schedule.map(([key, every]) => {
            poll(key);
            return setInterval(() => poll(key), every);
        });
        return () => {
            cancelled = true;
            timers.forEach(clearInterval);
        };
    }, [isReady]);

    // Main Loop Interval
    useEffect(() => {
        if (!isReady) return;
        const firstSnapshot = setTimeout(() => onSnapshot(), 0);
        const interval = setInterval(() => onSnapshot(), 3000);
        return () => {
            clearTimeout(firstSnapshot);
            clearInterval(interval);
        };
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
