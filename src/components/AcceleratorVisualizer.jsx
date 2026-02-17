import React, { useRef, useEffect, useContext } from 'react';
import { AudioContext } from '../context/AudioContext';

const AcceleratorVisualizer = () => {
    const canvasRef = useRef(null);
    const { isReady, solanaFilter } = useContext(AudioContext);

    useEffect(() => {
        if (!isReady || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const resize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();

        // Data history for visual trail
        const history = [];
        const maxHistory = 50;

        const draw = () => {
            animationId = requestAnimationFrame(draw);

            // Fetch current filter frequency
            let freq = 0;
            if (solanaFilter.current) {
                freq = solanaFilter.current.frequency.value;
            }

            // Normalize freq (100 - 8000Hz) for visual height
            // Logarithmic scale visualizes better
            const logFreq = Math.log10(freq); // ~2 to ~3.9
            const norm = (logFreq - 2) / 1.9;
            const y = canvas.height - (norm * canvas.height);

            // Add to history
            history.push(y);
            if (history.length > maxHistory) history.shift();

            // Clear with trail effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Beam
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#800080'; // Neon Purple Glow
            ctx.strokeStyle = '#d000d0'; // Brighter Purple Core

            ctx.beginPath();
            const step = canvas.width / (maxHistory - 1);

            history.forEach((val, i) => {
                const x = i * step;
                if (i === 0) ctx.moveTo(x, val);
                else ctx.lineTo(x, val);
            });
            ctx.stroke();

            // Reset Shadow
            ctx.shadowBlur = 0;

            // Draw current value readout
            ctx.fillStyle = '#d000d0';
            ctx.font = '10px monospace';
            ctx.fillText(`${Math.round(freq)}Hz`, 5, 15);
        };
        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, [isReady]);

    return (
        <div style={{
            width: '100%',
            height: '100px',
            background: '#050005',
            border: '1px solid #333',
            overflow: 'hidden',
            marginBottom: '10px',
            position: 'relative'
        }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
};

export default AcceleratorVisualizer;
