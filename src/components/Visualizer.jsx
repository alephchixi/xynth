import React, { useRef, useEffect, useContext } from 'react';
import { AudioContext } from '../context/AudioContext';

const Visualizer = () => {
    const canvasRef = useRef(null);
    const { isReady, analyzer } = useContext(AudioContext);

    useEffect(() => {
        if (!isReady || !analyzer.current || !canvasRef.current) return;

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

        const draw = () => {
            animationId = requestAnimationFrame(draw);

            const values = analyzer.current.getValue();
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#F79514';
            ctx.beginPath();

            for (let i = 0; i < values.length; i++) {
                const amplitude = values[i];
                const x = (i / values.length) * canvas.width;
                const y = (canvas.height / 2) + (amplitude * canvas.height / 2);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };
        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, [isReady]);

    return (
        <div id="visualizer-container" style={{ width: '100%', height: '100%', border: '1px solid #333', background: '#000' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
};

export default Visualizer;
