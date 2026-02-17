import React, { useRef, useEffect, useContext } from 'react';
import { AudioContext } from '../context/AudioContext';

const ReverbVisualizer = () => {
    const canvasRef = useRef(null);
    const { isReady, masterFft } = useContext(AudioContext);
    const particles = useRef([]);

    useEffect(() => {
        if (!isReady || !masterFft.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;

        const resize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            animationId = requestAnimationFrame(draw);

            // Soft trail effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Get FFT data
            // We want the cloud to react to "Atmosphere" (mid-high freq or general energy)
            const values = masterFft.current.getValue();
            let energy = 0;
            // Focus on mid-range for "atmosphere"
            for (let i = 20; i < 100; i++) energy += values[i];
            energy = energy / 80; // avg dB roughly -100 to -30
            const normEnergy = Math.max(0, (energy + 100) / 70); // 0 to 1

            // Spawn Particles (Grains)
            // Higher energy = more particles
            const spawnCount = 1 + Math.floor(normEnergy * 5);
            for (let i = 0; i < spawnCount; i++) {
                if (Math.random() > 0.3) {
                    particles.current.push({
                        x: Math.random() * canvas.width,
                        y: canvas.height + 10, // Start below
                        vx: (Math.random() - 0.5) * 1, // Drift L/R
                        vy: -0.5 - (Math.random() * 1.5) - (normEnergy * 2), // Upward speed based on energy
                        size: 2 + Math.random() * 20,
                        alpha: 0.1 + (Math.random() * 0.2),
                        life: 100 + Math.random() * 100
                    });
                }
            }

            // Update & Draw Particles
            particles.current.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                p.size *= 0.995; // Shrink slightly

                // Turbulence
                p.vx += (Math.random() - 0.5) * 0.1;

                if (p.life <= 0 || p.y < -50) {
                    particles.current.splice(index, 1);
                } else {
                    ctx.beginPath();
                    // Granular "puff"
                    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    gradient.addColorStop(0, `rgba(200, 220, 255, ${p.alpha})`);
                    gradient.addColorStop(1, `rgba(200, 220, 255, 0)`);

                    ctx.fillStyle = gradient;
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Limit particles
            if (particles.current.length > 500) particles.current.splice(0, particles.current.length - 500);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, [isReady]);

    return (
        <div style={{ width: '100%', height: '100px', background: '#000', overflow: 'hidden' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default ReverbVisualizer;
