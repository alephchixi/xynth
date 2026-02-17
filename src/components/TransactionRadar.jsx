import React, { useRef, useEffect } from 'react';

const TransactionRadar = ({ txData }) => {
    const canvasRef = useRef(null);
    const dataRef = useRef(txData);

    // Keep dataRef in sync without restarting animation
    useEffect(() => {
        dataRef.current = txData;
    }, [txData]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = Math.min(width, height) / 2; // Fit within smallest dimension

        let angle = 0;

        // Blips state needs to be persistent/regenerated based on data
        let blips = [];

        let animationId;

        const draw = () => {
            animationId = requestAnimationFrame(draw);

            // Update local blips based on latest data
            // We can't constantly regenerate or they flicker.
            // Let's just update their intensity/properties?
            // Or just check count periodically?
            // For now, let's just update the blips array if length is wrong roughly?
            // Or simpler: Just render what we have and slowly adjust?
            // Let's try regenerating only when dataRef.current.count changes significantly?
            // Updating every frame is too much.
            // Let's simple check:
            const data = dataRef.current;
            const targetCount = Math.min(400, Math.floor((data.count || 0) / 3)); // Increased density

            if (Math.abs(blips.length - targetCount) > 10) {
                // Regenerate to match density
                blips = Array.from({ length: targetCount }).map(() => {
                    const sizeNormalized = Math.min(1, (data.avgSize || 500) / 1000);
                    const baseRadius = sizeNormalized * (maxRadius - 10);
                    return {
                        r: Math.random() * (maxRadius - 5), // Random placement within circle
                        theta: Math.random() * Math.PI * 2,
                        speed: (Math.random() - 0.5) * 0.02,
                        feeIntensity: Math.min(1, (data.avgFee || 20) / 100)
                    };
                });
            }

            // Fade background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, width, height);

            // Draw Radar Grid (Circular)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, maxRadius - 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, maxRadius / 2, 0, Math.PI * 2);
            ctx.stroke();

            // Crosshairs
            ctx.beginPath();
            ctx.moveTo(cx, cy - maxRadius); ctx.lineTo(cx, cy + maxRadius);
            ctx.moveTo(cx - maxRadius, cy); ctx.lineTo(cx + maxRadius, cy);
            ctx.stroke();

            // Scan Line
            angle += 0.05;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * (maxRadius), cy + Math.sin(angle) * (maxRadius));
            ctx.stroke();

            // Draw Blips
            blips.forEach(blip => {
                blip.theta += blip.speed;
                const x = cx + Math.cos(blip.theta) * blip.r;
                const y = cy + Math.sin(blip.theta) * blip.r;

                const intensity = blip.feeIntensity;
                const r = Math.floor(247 * intensity);
                const g = Math.floor(149 * intensity);
                const b = Math.floor(20 * intensity);
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Display stats using Ref (Real-time update)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Brighter text
            ctx.font = '10px monospace';
            ctx.fillText(`TX: ${data.count || 0}`, 5, 12);
            ctx.fillText(`${data.avgSize || 0}B`, 5, 24);
        };
        draw();

        return () => cancelAnimationFrame(animationId);
    }, []); // Run once, depend on refs

    return (
        <div style={{
            width: '540px',
            height: '440px',
            background: '#050505',
            border: '1px solid #333',
            overflow: 'hidden',
            marginBottom: '10px'
        }}>
            <canvas ref={canvasRef} width={540} height={440} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default TransactionRadar;
