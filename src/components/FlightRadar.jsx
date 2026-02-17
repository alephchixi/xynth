import React, { useRef, useEffect } from 'react';

const FlightRadar = ({ flightCount = 12000 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        let angle = 0;

        // Simulate flight positions (static set that rotates slightly or regenerates)
        // Count scaled down for visual clarity (1 blip = ~100 flights)
        const blipCount = Math.min(200, Math.floor(flightCount / 100));
        const blips = Array.from({ length: blipCount }).map(() => ({
            r: Math.random() * (width / 2 - 5),
            theta: Math.random() * Math.PI * 2,
            speed: (Math.random() - 0.5) * 0.02
        }));

        let animationId;

        const draw = () => {
            animationId = requestAnimationFrame(draw);

            // Fade background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, width, height);

            // Draw Grid Rings
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, width / 2 - 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, width / 4, 0, Math.PI * 2);
            ctx.stroke();

            // Draw Crosshairs
            ctx.beginPath();
            ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
            ctx.moveTo(0, cy); ctx.lineTo(width, cy);
            ctx.stroke();

            // Scan Line
            angle += 0.05;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * (width / 2), cy + Math.sin(angle) * (height / 2));
            ctx.stroke();

            // Draw Blips (Flights)
            ctx.fillStyle = '#fff';
            blips.forEach(blip => {
                // Update position
                blip.theta += blip.speed;
                const x = cx + Math.cos(blip.theta) * blip.r;
                const y = cy + Math.sin(blip.theta) * blip.r;

                // Simple proximity fade to scanline could be cool, but keep simple for now
                // Detect if close to scan angle?
                const blipAngle = Math.atan2(y - cy, x - cx);
                // Simplify: just draw all
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            });
        };
        draw();

        return () => cancelAnimationFrame(animationId);
    }, [flightCount]);

    return (
        <div style={{
            width: '100%',
            height: '150px',
            background: '#050505',
            border: '1px solid #333',
            overflow: 'hidden',
            marginBottom: '10px'
        }}>
            <canvas ref={canvasRef} width={250} height={150} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default FlightRadar;
