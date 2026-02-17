import React, { useContext, useState } from 'react';
import { AudioContext } from '../context/AudioContext';
import { DataContext } from '../context/DataContext';

const ModuleCard = ({ id, title, subtitle, dataKey, showVolume = true, children }) => {
    const { data, toggleMute: toggleDataMute } = useContext(DataContext);
    const { toggleMute: toggleAudioMute, setVolume } = useContext(AudioContext);

    const moduleData = data[dataKey];
    const isMuted = moduleData.muted;
    const [volume, setLocalVolume] = useState(0.5);

    const handleMute = () => {
        toggleDataMute(dataKey);
        toggleAudioMute(dataKey, !isMuted);

        if (isMuted) {
            setVolume(dataKey, volume);
        } else {
            // Effectively mute audio
        }
    };

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setLocalVolume(val);
        if (!isMuted) {
            setVolume(dataKey, val);
        }
    };

    return (
        <div className={`module hud-panel ${isMuted ? 'muted-style' : ''}`} style={{
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* HUD Elements */}
            <div className="scan-line"></div>
            <div className="hud-corner hud-corner-tl"></div>
            <div className="hud-corner hud-corner-tr"></div>
            <div className="hud-corner hud-corner-bl"></div>
            <div className="hud-corner hud-corner-br"></div>

            <div className="module-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #333',
                paddingBottom: '5px',
                marginBottom: '5px'
            }}>
                <span className="module-title" style={{
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    color: 'var(--accent-color)',
                    letterSpacing: '2px',
                    textTransform: 'uppercase'
                }}>
                    {title}
                </span>
                <span className="module-status" style={{
                    fontSize: '0.6rem',
                    color: 'var(--text-color)',
                    letterSpacing: '1px'
                }}>
                    {subtitle} // SYS.01
                </span>
            </div>

            <div className="module-data" style={{ fontSize: '1.2rem', color: '#fff', fontFamily: 'monospace' }}>
                {moduleData.label}
                {dataKey === 'banks' && (
                    <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '5px', display: 'flex', gap: '10px' }}>
                        <span style={{ color: moduleData.sp500 > 5800 ? '#fff' : '#aaa' }}>
                            S&P:{(moduleData.sp500 || 0).toFixed(0)}
                        </span>
                        <span>TPS:{(moduleData.load * 125).toLocaleString()}</span>
                    </div>
                )}
            </div>

            {/* Custom Children Controls */}
            {children && (
                <div style={{
                    borderTop: '1px solid #222',
                    paddingTop: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {children}
                </div>
            )}

            <div className="controls" style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: 'auto' }}>
                {/* Master Volume Slider */}
                {showVolume && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.6rem', color: '#666', minWidth: '20px' }}>VOL</span>
                        <input
                            type="range"
                            className="cyber-range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            disabled={isMuted}
                            style={{ opacity: isMuted ? 0.3 : 1 }}
                        />
                    </div>
                )}

                <button onClick={handleMute} style={{
                    background: isMuted ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                    color: isMuted ? '#444' : 'var(--accent-color)',
                    border: '1px solid #333',
                    padding: '6px',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    width: '100%',
                    letterSpacing: '2px',
                    transition: 'all 0.2s',
                    marginTop: '5px'
                }}>
                    {isMuted ? 'OFFLINE' : 'ACTIVE'}
                </button>
            </div>
        </div>
    );
};

export default ModuleCard;
