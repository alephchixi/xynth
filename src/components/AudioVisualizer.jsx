import React, { useRef, useContext, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere } from '@react-three/drei';
import { AudioContext } from '../context/AudioContext';
import * as THREE from 'three';

const VisualizerMesh = () => {
    const mesh = useRef();
    const material = useRef();
    const { masterFft, analyzer, isReady, bitcoinSynth, transportFilter, solanaFilter, ethereumReverb } = useContext(AudioContext);

    // Temp vector for efficient calculations
    const dataArray = useMemo(() => new Float32Array(512), []);
    const color = new THREE.Color();

    useFrame((state) => {
        if (!isReady || !masterFft.current || !analyzer.current) return;

        // Get FFT Data for basic movement
        const fftValues = masterFft.current.getValue();
        let bass = 0;
        for (let i = 0; i < 50; i++) bass += Math.abs(fftValues[i]);
        const bassLevel = Math.min(1, (bass / 50 + 100) / 80);

        // Get Time-Domain (Waveform) Data
        const waveformValues = analyzer.current.getValue();
        // Calculate Waveform Intensity (RMS logic mostly)
        let sumSquares = 0;
        for (let i = 0; i < waveformValues.length; i++) {
            sumSquares += waveformValues[i] * waveformValues[i];
        }
        const rms = Math.sqrt(sumSquares / waveformValues.length);
        const waveformScale = Math.min(1, rms * 5); // Boost for visual effect

        // --- Parameter Mapping ---

        // 1. Distortion (Bitcoin Harmonicity + Waveform Shape)
        let chaos = 0;
        if (bitcoinSynth.current && bitcoinSynth.current.harmonicity) {
            // Harmonicity ranges 1 (clean) to 5+ (chaos)
            const harm = bitcoinSynth.current.harmonicity.value;
            chaos = (harm - 1) / 4;
        }

        // 2. Speed (Transport Resonance / Turbulence)
        let turbulence = 0;
        if (transportFilter.current) {
            // Q ranges 0.5 to 10
            const q = transportFilter.current.Q.value;
            turbulence = (q - 0.5) / 10;
        }

        // 3. Color Shift (Solana Filter Freq / Energy)
        let energy = 0;
        if (solanaFilter.current) {
            // Freq 100 to 8000
            const freq = solanaFilter.current.frequency.value;
            energy = Math.min(1, freq / 5000);
        }

        // 4. Roughness/Scale (Ethereum Reverb / Space)
        let space = 0;
        if (ethereumReverb.current) {
            // RoomSize 0.1 to 0.95
            space = ethereumReverb.current.roomSize.value;
        }

        if (material.current) {
            // Distort: Bass + Bitcoin Chaos + Waveform (Instant Reaction)
            // Waveform impact: sharper waveform = jagged mesh
            const targetDistort = 0.3 + (bassLevel * 0.2) + (chaos * 0.5) + (waveformScale * 0.5);
            material.current.distort = THREE.MathUtils.lerp(material.current.distort, targetDistort, 0.2); // Faster lerp for waveform

            // Speed: Base + Turbulence
            const targetSpeed = 2 + (turbulence * 8) + (waveformScale * 2);
            material.current.speed = THREE.MathUtils.lerp(material.current.speed, targetSpeed, 0.05);

            // Color: Orange Base -> Shift Hue with Energy
            // Base #F79514 is roughly HSL(0.09, 0.9, 0.5)
            // Shift towards Red (0) or Yellow (0.15) based on energy? 
            // Let's make high energy brighter/whiter or shift hue
            color.set('#F79514');
            // Shift hue slightly based on energy
            const hsl = {};
            color.getHSL(hsl);
            color.setHSL(hsl.h + (energy * 0.1), hsl.s, hsl.l + (energy * 0.2) + (waveformScale * 0.1));

            material.current.color.lerp(color, 0.1);

            // Roughness: Space
            // More space = Smoother? Or more texture?
            // Let's say more space (Reverb) = Smoother (Liquid)
            // Less space = Rougher
            const targetRoughness = 0.7 - (space * 0.5);
            material.current.roughness = THREE.MathUtils.lerp(material.current.roughness, targetRoughness, 0.05);
        }

        if (mesh.current) {
            // Rotation
            mesh.current.rotation.x += 0.001 + (turbulence * 0.01);
            mesh.current.rotation.y += 0.002 + (bassLevel * 0.01);

            // Scale Pulse
            const targetScale = 1.3 + (bassLevel * 0.3) + (space * 0.4);
            mesh.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <Sphere ref={mesh} args={[0.7, 64, 64]} position={[0, 0, 0]}>
            <MeshDistortMaterial
                ref={material}
                color="#F79514"
                envMapIntensity={0.8}
                clearcoat={1}
                clearcoatRoughness={0.1}
                metalness={0.4}
                roughness={0.7}
                distort={0.4}
                speed={2}
            />
        </Sphere>
    );
};

const AudioVisualizer = ({ style }) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: '4px',
            background: '#222222',
            ...style
        }}>
            <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} color="#fff" />
                <pointLight position={[-10, -10, -10]} intensity={2} color="#444" />
                <VisualizerMesh />
            </Canvas>
        </div>
    );
};

export default AudioVisualizer;
