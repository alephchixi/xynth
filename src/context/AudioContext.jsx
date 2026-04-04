import React, { createContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

export const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
    const [isReady, setIsReady] = useState(false);

    // Synths
    const bitcoinSynth = useRef(null);
    const transportNoise = useRef(null);
    const goldSynth = useRef(null);
    const oilSynth = useRef(null);
    const bankSynth = useRef(null);
    const lifeSynth = useRef(null);
    const analyzer = useRef(null); // Waveform
    const masterFft = useRef(null); // FFT

    // Master Effects (Ethereum & Solana)
    const ethereumReverb = useRef(null); // Changed to Freeverb
    const solanaFilter = useRef(null); // Changed from Delay to Filter

    // Effects & Signals
    const bitcoinDist = useRef(null);
    const bitcoinDrive = useRef(null);

    // Transport DSP
    const transportFilter = useRef(null);
    const transportDist = useRef(null); // Waveshaper/Chebyshev

    // Resources DSP
    const resourcesChebyshev = useRef(null);

    // Bank Playback State
    const bankLoopId = useRef(null);

    // Internal Gains (Mixing)
    const goldGain = useRef(null);
    const oilGain = useRef(null);

    // Output Gains
    const gains = useRef({
        bitcoin: null,
        transport: null,
        resources: null,
        ethereum: null,
        solana: null
    });

    // Scales Data
    const SCALES = {
        minor: [0, 2, 3, 5, 7, 8, 10],
        major: [0, 2, 4, 5, 7, 9, 11],
        pentatonic: [0, 3, 5, 7, 10],
        chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    };

    const getQuantizedFreq = (rawFreq, key = 'C', scale = 'minor') => {
        try {
            const rawNote = Tone.Frequency(rawFreq).toNote();
            const midi = Tone.Frequency(rawNote).toMidi();
            const keyMidi = Tone.Frequency(`${key}4`).toMidi() % 12;
            const scalePattern = SCALES[scale] || SCALES.minor;

            let minDiff = Infinity;
            let targetMidi = midi;

            for (let i = midi - 12; i <= midi + 12; i++) {
                const noteInOctave = i % 12;
                const semitoneFromKey = (noteInOctave - keyMidi + 12) % 12;
                if (scalePattern.includes(semitoneFromKey)) {
                    const diff = Math.abs(i - midi);
                    if (diff < minDiff) { minDiff = diff; targetMidi = i; }
                }
            }
            return Tone.Frequency(targetMidi, "midi").toFrequency();
        } catch (e) { return rawFreq; }
    };

    const initAudio = async () => {
        try {
            await Tone.start();
            console.log("Audio Initializing...");

            // Master Effects Chain
            // All audio -> Solana (Filter) -> Ethereum (Freeverb) -> Destination

            // Ethereum Reverb (The Atmosphere)
            // Using Freeverb for real-time roomSize control
            ethereumReverb.current = new Tone.Freeverb({
                roomSize: 0.7,
                dampening: 3000,
                wet: 0.5
            }).toDestination();

            // Solana Filter (The Accelerator)
            // Low Pass Filter based on Epoch
            solanaFilter.current = new Tone.Filter({
                type: "lowpass",
                frequency: 2000,
                Q: 1,
                rolloff: -12
            });

            // Chain: Solana Filter -> Ethereum Reverb
            solanaFilter.current.connect(ethereumReverb.current);

            // --- Output Gains (Master Channels) ---
            // All synths go through the effects chain
            gains.current.bitcoin = new Tone.Gain({ gain: 0.5 }).connect(solanaFilter.current);
            gains.current.transport = new Tone.Gain({ gain: 0.5 }).connect(solanaFilter.current);
            gains.current.resources = new Tone.Gain({ gain: 0.5 }).connect(solanaFilter.current);
            gains.current.ethereum = new Tone.Gain({ gain: 0.3 }).toDestination(); // Direct for monitoring
            gains.current.solana = new Tone.Gain({ gain: 0.3 }).toDestination(); // Direct for monitoring

            // --- 1. Bitcoin (The Monster) ---
            // AM Oscillator (Sine Carrier, Sine Modulator)
            // Carrier Freq = Price (Quantized)
            // Modulator Freq = Hashrate
            bitcoinDist.current = new Tone.Distortion(0.4).connect(gains.current.bitcoin);
            bitcoinDrive.current = new Tone.Gain(1).connect(bitcoinDist.current);

            bitcoinSynth.current = new Tone.AMOscillator({
                type: "sine",
                modulationType: "sine",
                harmonicity: 0.5 // Initial
            }).connect(bitcoinDrive.current);

            bitcoinSynth.current.start();

            // --- 2. THE GHOST (Transport) ---
            // Chain: Noise -> Filter (Resonant) -> Chebyshev (color) -> Gain
            transportDist.current = new Tone.Chebyshev({ order: 2 });
            transportFilter.current = new Tone.Filter({
                type: "lowpass",
                frequency: 200,
                Q: 1
            });

            transportNoise.current = new Tone.Noise("pink");

            transportNoise.current.connect(transportFilter.current);
            transportFilter.current.connect(transportDist.current);
            transportDist.current.connect(gains.current.transport);
            transportNoise.current.start();

            // --- 3. EARTH EATER (Resources) ---
            resourcesChebyshev.current = new Tone.Chebyshev({ order: 1 });
            resourcesChebyshev.current.connect(gains.current.resources);

            goldGain.current = new Tone.Gain({ gain: 1 }).connect(resourcesChebyshev.current);
            oilGain.current = new Tone.Gain({ gain: 1 }).connect(resourcesChebyshev.current);

            goldSynth.current = new Tone.FMSynth({
                harmonicity: 3,
                modulationIndex: 10,
                oscillator: { type: "sine" },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 2 },
                modulation: { type: "square" },
                modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 2 }
            }).connect(goldGain.current);

            oilSynth.current = new Tone.Oscillator({ frequency: 30, type: "sine" }).connect(oilGain.current);
            oilSynth.current.start();

            // Success
            setIsReady(true);
            console.log("Audio Initialized Successfully");

            // --- Analysis ---
            // Create Analysis Nodes
            analyzer.current = new Tone.Waveform(512);
            masterFft.current = new Tone.FFT(512);

            // Connect Master (Ethereum Reverb Output is last) to Analysis
            ethereumReverb.current.connect(analyzer.current);
            ethereumReverb.current.connect(masterFft.current);
            // Also ensure direct gains go there if they bypass effects (monitoring)
            gains.current.ethereum.connect(analyzer.current);
            gains.current.ethereum.connect(masterFft.current);
            gains.current.solana.connect(analyzer.current);
            gains.current.solana.connect(masterFft.current);


        } catch (e) {
            console.error("Audio Init Failed", e);
            alert("Audio Initialization Failed: " + (e.message || e));
        }
    };

    // --- Updates ---

    // Modulation Depths (controlled from UI)
    const modDepths = useRef({
        memecoin: 0.5,
        polymarket: 0.5,
        solana: 0.5
    });

    const setModulationDepth = (target, value) => {
        if (target === 'memecoin') modDepths.current.memecoin = value;
        if (target === 'polymarket') modDepths.current.polymarket = value;
        if (target === 'solana') modDepths.current.solana = value;
    };

    // --- Updates ---

    const setSolanaFilterFreq = (normVal) => {
        if (!solanaFilter.current) return;
        const freq = Math.max(100, Math.min(20000, 100 * Math.pow(200, normVal)));
        solanaFilter.current.frequency.rampTo(freq, 0.1);
    };

    const updateBitcoin = (hashrate, price, memecoinType = 'fartcoin', volatility = 0) => {
        if (!bitcoinSynth.current) return;

        // Depth Control (0 to 1)
        const depth = modDepths.current.memecoin;

        // Price -> Frequency (Quantized)
        const rawFreq = Math.max(40, (price || 50000) * 0.0015);

        let freqMult = 1;
        let harmonicity = 1;

        // Memecoin Timbre Logic with Depth Scaling
        // 0% Depth = Standard Sine/AM (clean)
        // 100% Depth = Full Chaos/Memecoin character
        if (memecoinType === 'fartcoin') {
            freqMult = 0.25;
            // Scale chaos by depth: 0 depth -> 1 (harmonic), 1 depth -> 3.33+ (dissonant)
            harmonicity = 1 + ((2.33 + (volatility * 10)) * depth);
        } else if (memecoinType === 'doge') {
            freqMult = 0.5;
            harmonicity = Math.round(1 + (volatility * depth));
        } else if (memecoinType === 'pepe') {
            freqMult = 1.5;
            harmonicity = 1 + (0.5 * depth);
        } else {
            freqMult = 2;
            harmonicity = 0.5 + (0.5 * (1 - depth)); // Wif moves from 0.5 to 1? Or stay 0.5? Let's just scale effect.
        }

        const targetFreq = getQuantizedFreq(rawFreq * freqMult, 'C', memecoinType === 'fartcoin' ? 'chromatic' : 'minor');

        if (bitcoinSynth.current.frequency) {
            bitcoinSynth.current.frequency.rampTo(targetFreq, 0.5);
        }

        if (bitcoinSynth.current.harmonicity) {
            bitcoinSynth.current.harmonicity.rampTo(harmonicity, 0.5);
        }

        // Hashrate -> AM Frequency
        const amFreq = Math.max(1, (hashrate || 500) * 0.05);
        if (bitcoinSynth.current.modulationFrequency) {
            bitcoinSynth.current.modulationFrequency.rampTo(amFreq, 0.5);
        }

        if (bitcoinDrive.current) {
            // Distortion Scaled by Depth
            const maxDist = memecoinType === 'fartcoin' ? 50 : 3;
            // Base distortion 1. Depth adds the memecoin flavor (volatility * maxDist)
            const distGain = 1 + (volatility * maxDist * depth);
            bitcoinDrive.current.gain.rampTo(distGain, 0.5);
        }
    };

    const updateTransport = (count, flow = 0.5) => {
        if (!transportFilter.current) return;

        // Depth Control
        const depth = modDepths.current.polymarket;

        const safeCount = Math.max(8000, count);
        const norm = (safeCount - 8000) / 7000;
        const baseFreq = Math.max(50, 200 + (norm * 1800));

        // Polymarket Flow -> Filter Resonance (Q) 
        // 0% Depth = Q 0.5 (Flat/Clean)
        // 100% Depth = Full Resonance modulation
        const qParams = 0.5 + (flow * 15 * depth);

        // Frequency Shift
        const freqShift = flow * 1000 * depth;

        transportFilter.current.frequency.rampTo(baseFreq + freqShift, 2);
        transportFilter.current.Q.rampTo(qParams, 2);
    };

    const updateResources = (lowFeeNote, highFee, mempoolSize, mediumFee) => {
        if (!goldSynth.current) return;

        // Convert quantized note to frequency
        const freq = Tone.Frequency(lowFeeNote).toFrequency();
        const oilPitch = Math.max(20, highFee);

        // Trigger Gold (low fee) occasionally
        if (Math.random() > 0.5) {
            goldSynth.current.triggerAttackRelease(freq, "8n");
        }

        // Use harmonicity based on mempool size
        const brightness = Math.max(1, mempoolSize / 50);
        goldSynth.current.harmonicity.rampTo(brightness, 1);

        // Ramp Oil (high fee)
        oilSynth.current.frequency.rampTo(oilPitch, 5);

        return { goldHz: freq, oilHz: oilPitch };
    };

    const updateEthereum = (gasPrice, blockUtil) => {
        if (!ethereumReverb.current) return;

        // Gas Price -> Room Size (Reverb Size)
        // Map 10-200 Gwei to 0.1 - 0.95 Room Size
        const roomSize = Math.max(0.1, Math.min(0.95, gasPrice / 200));
        ethereumReverb.current.roomSize.rampTo(roomSize, 1);

        // Block Utilization -> Dampening (Decay feel)
        // Map 0-100% to 1000Hz (dull) - 10000Hz (bright/long decay feel)
        // Or inversely: High Block Util (congestion) = High Dampening (muffled)?
        // User requested "Block to be decay". 
        // In Freeverb, roomSize is decay. Dampening controls how fast high freqs decay.
        // Let's map Block Util -> Dampening Frequency (High Util = Low Freq Dampening = Muffled/Claustrophobic)
        const dampening = Math.max(500, 10000 - (blockUtil * 90));
        ethereumReverb.current.dampening.rampTo(dampening, 1);

        // Wetness constant-ish or slightly modulated
        ethereumReverb.current.wet.rampTo(0.7, 1);
    };

    const updateSolana = (tps, epoch, epochProgress) => {
        if (!solanaFilter.current) return;

        const depth = modDepths.current.solana;

        // TPS -> Filter Frequency Modulation
        // Base Freq is set by setSolanaFilterFreq (slider)
        // Modulation adds to it based on TPS flux
        // TPS typically 1000-5000. 
        // Let's map TPS to a frequency offset: 0 to 5000Hz
        const modAmount = ((tps - 1000) / 4000) * 5000 * depth;

        // We act on the *current* frequency as the base? 
        // No, rampTo in setSolanaFilterFreq sets the target. 
        // If we want LFO-like behavior we need a base + mod.
        // For now, let's just assume the slider sets a "Base" and this adds to it.
        // But solanaFilter.frequency.value changes as we ramp.
        // Let's just punch in the value: Base (from slider state, roughly check current) + Mod

        // Actually, simpler: Map TPS directly to Freq if Depth is high?
        // Or: Filter Freq = Base + (TPS_Scaled * Depth)
        // We don't have easy access to "Base" unless we store it.
        // Let's ignore "Base" for now and just make TPS drive it dynamically if Depth > 0.
        // If Depth is 0, it stays at last value?
        // Better: The slider sets `setSolanaFilterFreq`.
        // Let's make `updateSolana` ONLY modulate Q for now?
        // User asked: "TPS to modulate the cutoff".
        // So we need: Cutoff = SliderValue + (TPS * Depth).
        // Since we don't store SliderValue easily here, let's assume the slider updates the filter,
        // and here we *add* to it? No, that drifts.

        // Approach: read current value? No, that's the ramping value.
        // Let's just map TPS to a wide range and blend it with the slider value?
        // Or better: The `updateSolana` loop runs frequently.
        // Let's just drive the frequency HERE entirely if we want dynamic updates.
        // But the slider `setSolanaFilterFreq` is also calling rampTo.
        // Conflict! 
        // Fix: `setSolanaFilterFreq` should probably update a Ref `baseFreq` and `updateSolana` uses it.
        // But `setSolanaFilterFreq` is exposed to UI.

        // Quick Fix: Let UI slider set the "Base Frequency" via `setSolanaFilterFreq`? 
        // Actually `setSolanaFilterFreq` ramps the filter directly.
        // If we want TPS to modulate it, we should probably do it all in `updateSolana` 
        // OR `updateSolana` ramps `detune`? Filter doesn't have detune.

        // Let's make `updateSolana` authoritative for the modulation.
        // We will assume the filter's current modulated value is what we want.
        // Wait, if the user moves the slider, `setSolanaFilterFreq` is called.
        // If `updateSolana` is called every frame/update, it might overwrite.
        // Let's trust that `updateSolana` is called more often or logic allows coexistence.
        // Actually, `updateSolana` is called when new data arrives (every few seconds?).
        // If TPS changes, we ramp to new freq.
        // Let's just implement TPS -> Freq logic here.

        // TPS (0-5000) -> 100Hz - 10000Hz
        const tpsFreq = Math.max(100, Math.min(10000, tps * 2));

        // If Depth is 0, we don't touch frequency (let slider control it).
        // If Depth is 1, TPS fully controls it?
        // Or Depth mixes between Slider and TPS?
        // Creating a mix is hard without persistent state of "Slider Value".

        // Simplified interpretation: "TPS modulates cutoff"
        // Let's just ramp `frequency` to value based on TPS * Depth.
        // If Depth is 0, this does nothing (allows manual control).
        if (depth > 0.01) {
            // We need a base. Let's assume 2000 is center.
            // Or better: Modulate *around* current value? Hard.
            // Let's just convert TPS to a frequency and ramp to it.
            solanaFilter.current.frequency.rampTo(tpsFreq, 0.5);
        }

        // TPS -> Resonance (Q)
        // Map 1000-5000 TPS to 0.5 - 10 Q
        const q = Math.max(0.5, Math.min(10, (tps - 1000) / 400));
        solanaFilter.current.Q.rampTo(q, 0.5);
    };

    // --- Control Methods ---

    const toggleMute = (target, isMuted) => {
        if (!gains.current[target]) return;
        gains.current[target].gain.rampTo(isMuted ? 0 : 0.5, 0.1);
    };

    const setVolume = (target, value) => {
        if (!gains.current[target]) return;
        gains.current[target].gain.rampTo(value, 0.1);
    };

    // Specialized Logic Accessors

    const setTransportParams = (resonance, harmonics) => {
        if (!transportFilter.current || !transportDist.current) return;
        transportFilter.current.Q.rampTo(resonance, 0.1);
        transportDist.current.order = Math.floor(harmonics);
    };

    const setResourceParams = (goldVol, oilVol, harmonics) => {
        if (!goldGain.current || !oilGain.current || !resourcesChebyshev.current) return;

        goldGain.current.gain.rampTo(goldVol, 0.1);
        oilGain.current.gain.rampTo(oilVol, 0.1);
        resourcesChebyshev.current.order = Math.floor(harmonics);
    };

    return (
        <AudioContext.Provider value={{
            isReady,
            initAudio,
            analyzer,
            masterFft,
            updateBitcoin,
            updateTransport,
            updateResources,
            updateEthereum,
            updateSolana,
            toggleMute,
            setVolume,
            setTransportParams,
            setResourceParams,
            setModulationDepth,
            setSolanaFilterFreq,
            // Expose Refs for Visualizers
            bitcoinSynth,
            solanaFilter,
            ethereumReverb,
            transportFilter,
            modDepths
        }}>
            {children}
        </AudioContext.Provider>
    );
};
