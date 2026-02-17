import React, { useContext } from 'react';
import { AudioContext } from '../context/AudioContext';

const StartOverlay = () => {
    const { initAudio, isReady } = useContext(AudioContext);

    if (isReady) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            flexDirection: 'column',
            gap: '20px'
        }}>
            <h1 style={{ fontSize: '1.5rem', letterSpacing: '2px', color: '#e0e0e0' }}>Xynth</h1>
            <p style={{ color: '#888' }}>Generative Sonification of Bitcoin Forces</p>
            <button onClick={initAudio} style={{
                fontSize: '2rem',
                padding: '20px 40px',
                background: 'transparent',
                border: '2px solid #F79514',
                color: '#F79514',
                cursor: 'pointer',
                fontFamily: 'monospace'
            }}>
                INITIALIZE SYSTEM
            </button>
        </div>
    );
};

export default StartOverlay;
