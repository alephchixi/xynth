import React, { useContext } from 'react';
import { DataContext } from '../context/DataContext';
import { AudioContext } from '../context/AudioContext';

const ModulationPanel = () => {
    const { modSettings, setModSettings, modHistory } = useContext(DataContext);
    const { setModulationDepth } = useContext(AudioContext);
    const canvasRef = React.useRef(null);

    // Waveform Drawer
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || modHistory.length === 0) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#F79514';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const step = width / 50; // 50 points max

        modHistory.forEach((val, i) => {
            const x = i * step;
            const y = height - (val * height);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();
    }, [modHistory]);


    const handleMemeChange = (e) => setModSettings(prev => ({ ...prev, memecoin: e.target.value }));
    const handlePolyChange = (e) => setModSettings(prev => ({ ...prev, polymarket: e.target.value }));

    return (
        <div style={{
            background: '#111',
            border: '1px solid #333',
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
        }}>
            <div className="panel-header" style={{ borderBottom: '1px solid #222', paddingBottom: '5px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#F79514' }}>INTERFERENCE</span>
            </div>

            {/* Memecoin LFO */}
            <div className="control-group">
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '5px' }}>
                    MEMECOIN TIMBRE (Target: THE MONSTER)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <canvas
                        ref={canvasRef}
                        width={150}
                        height={40}
                        style={{ background: '#222', border: '1px solid #444' }}
                    />
                    <div style={{ fontFamily: 'monospace', color: '#F79514', fontSize: '0.8rem' }}>
                        {(modHistory[modHistory.length - 1] || 0).toFixed(2)}
                    </div>
                </div>
                <select
                    value={modSettings.memecoin}
                    onChange={handleMemeChange}
                    style={{
                        width: '100%',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid #444',
                        padding: '5px',
                        fontFamily: 'monospace',
                        marginBottom: '10px'
                    }}
                >
                    <option value="fartcoin">FARTCOIN (Chaotic)</option>
                    <option value="pepe">PEPE (High Vol)</option>
                    <option value="wif">WIF (Trending)</option>
                    <option value="doge">DOGE (Stable)</option>
                </select>
                <div className="mixer-row" style={{ marginTop: '5px' }}>
                    <label>DEPTH</label>
                    <input
                        type="range"
                        className="cyber-range"
                        min="0"
                        max="1"
                        step="0.01"
                        defaultValue="0.5"
                        onChange={e => setModulationDepth && setModulationDepth('memecoin', parseFloat(e.target.value))}
                    />
                </div>
            </div>

            {/* Polymarket LFO */}
            <div className="control-group">
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '5px' }}>
                    POLYMARKET FLOW (Target: Transport Filter)
                </label>
                <select
                    value={modSettings.polymarket}
                    onChange={handlePolyChange}
                    style={{
                        width: '100%',
                        background: '#000',
                        color: '#fff',
                        border: '1px solid #444',
                        padding: '5px',
                        fontFamily: 'monospace',
                        marginBottom: '10px'
                    }}
                >
                    <option value="election">US ELECTION (Extreme)</option>
                    <option value="fed">FED RATES (Cyclic)</option>
                    <option value="sports">SPORTS (Burst)</option>
                </select>
                <div className="mixer-row" style={{ marginTop: '5px' }}>
                    <label>DEPTH</label>
                    <input
                        type="range"
                        className="cyber-range"
                        min="0"
                        max="1"
                        step="0.01"
                        defaultValue="0.5"
                        onChange={e => setModulationDepth && setModulationDepth('polymarket', parseFloat(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
};

export default ModulationPanel;
