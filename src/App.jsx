import React, { useContext, useEffect, useState } from 'react';
import { AudioContext, AudioProvider } from './context/AudioContext';
import { DataProvider, DataContext } from './context/DataContext';
import StartOverlay from './components/StartOverlay';
import Visualizer from './components/Visualizer';
import AudioVisualizer from './components/AudioVisualizer'; // 3D Mass
import TransactionRadar from './components/TransactionRadar';
import ModuleCard from './components/ModuleCard';
import ModulationPanel from './components/ModulationPanel';
import FlightRadar from './components/FlightRadar';
import ReverbVisualizer from './components/ReverbVisualizer';
import AcceleratorVisualizer from './components/AcceleratorVisualizer';

// Wrapper to access Context inside App content
const AppContent = () => {
  const {
    setTransportParams,
    setResourceParams,
    setModulationDepth,
    isReady,
    setAtmosphereMix,
    setSolanaFilterFreq,
  } = useContext(AudioContext);
  const { data } = useContext(DataContext);

  // Ghost State
  const [ghostRes, setGhostRes] = useState(1);
  const [ghostHarm, setGhostHarm] = useState(2);

  // Resources State (Mempool controls)
  const [lowFeeMix, setLowFeeMix] = useState(1);
  const [highFeeMix, setHighFeeMix] = useState(1);
  const [resHarm, setResHarm] = useState(1);

  useEffect(() => {
    if (isReady) setTransportParams(ghostRes, ghostHarm);
  }, [ghostRes, ghostHarm, isReady]);

  useEffect(() => {
    if (isReady) setResourceParams(lowFeeMix, highFeeMix, resHarm);
  }, [lowFeeMix, highFeeMix, resHarm, isReady]);

  return (
    <div id="app-container">
      <StartOverlay />

      <header>
        <div>
          <h1>Xynth</h1>
          <h2>hyperobjective crypto-sonic cosmotechnics</h2>
        </div>
      </header>

      <div id="main-container">
        <div id="top-visualizers" style={{ display: 'flex', gap: '20px', height: '350px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Visualizer />
          </div>
          <div style={{ flex: 1, minWidth: 0, border: '1px solid #333', background: '#000', overflow: 'hidden', position: 'relative' }}>
            <AudioVisualizer />
          </div>
        </div>

        <div id="dashboard">
          <ModuleCard
            id="mod-bitcoin"
            title="THE MONSTER"
            subtitle="BITCOIN NETWORK"
            dataKey="bitcoin"
          >
            <ModulationPanel />

            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                EARTH EATER <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>(BITCOIN MEMPOOL)</span>
              </div>
              <div className="hz-display" style={{ fontSize: '0.6rem', color: '#888', marginBottom: '5px' }}>
                Low Fee: {data.resources.lowFeeHz}Hz | High Fee: {data.resources.highFeeHz}Hz
              </div>
              <div className="mixer-row">
                <label>FEE MIX</label>
                <input type="range" className="cyber-range" min="0" max="1" step="0.01" value={highFeeMix} onChange={e => setHighFeeMix(parseFloat(e.target.value))} />
              </div>
              <div className="mixer-row">
                <label>HARMONIC SHAPE</label>
                <input type="range" className="cyber-range" min="1" max="50" step="1" value={resHarm} onChange={e => setResHarm(parseInt(e.target.value))} />
              </div>
            </div>
          </ModuleCard>

          <ModuleCard
            id="mod-transport"
            title="THE GHOST"
            subtitle="BITCOIN TRANSACTIONS"
            dataKey="transport"
          >
            {/* Custom Controls for Ghost */}
            <TransactionRadar txData={{
              count: data.transport.count,
              avgSize: data.transport.avgSize,
              avgFee: data.transport.avgFee,
              totalValue: data.transport.totalValue
            }} />
            <div className="mixer-row">
              <label>RESONANCE</label>
              <input type="range" className="cyber-range" min="0.1" max="10" step="0.1" value={ghostRes} onChange={e => setGhostRes(parseFloat(e.target.value))} />
            </div>
            <div className="mixer-row">
              <label>NOISE COLOR</label>
              <input type="range" className="cyber-range" min="1" max="50" step="1" value={ghostHarm} onChange={e => setGhostHarm(parseInt(e.target.value))} />
            </div>
          </ModuleCard>



          <ModuleCard
            id="mod-ethereum"
            title="THE ATMOSPHERE"
            subtitle="ETHEREUM REVERB"
            dataKey="ethereum"
            showVolume={false}
          >
            <ReverbVisualizer />
            <div className="mixer-row" style={{ marginTop: '5px' }}>
              <label>ATMOSPHERE MIX</label>
              <input
                type="range"
                className="cyber-range"
                min="0"
                max="1"
                step="0.01"
                defaultValue="0.5"
                onChange={e => isReady && setAtmosphereMix(parseFloat(e.target.value))}
              />
            </div>
          </ModuleCard>

          <ModuleCard
            id="mod-solana"
            title="THE ACCELERATOR"
            subtitle="SOLANA FILTER"
            dataKey="solana"
            showVolume={false}
          >
            <AcceleratorVisualizer />
            <div className="mixer-row" style={{ marginTop: '10px' }}>
              <label>FILTER CUTOFF</label>
              <input
                type="range"
                className="cyber-range"
                min="0"
                max="1"
                step="0.01"
                defaultValue="1"
                onChange={e => isReady && setSolanaFilterFreq(parseFloat(e.target.value))}
              />
            </div>
            <div className="mixer-row">
              <label>MOD DEPTH</label>
              <input
                type="range"
                className="cyber-range"
                min="0"
                max="1"
                step="0.01"
                defaultValue="0.5"
                onChange={e => isReady && setModulationDepth('solana', parseFloat(e.target.value))}
              />
            </div>
          </ModuleCard>


        </div>

        <div style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid #333', color: '#666', fontSize: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', textAlign: 'left' }}>
          <div>
            <strong style={{ display: 'block', color: '#888', marginBottom: '5px' }}>THE MONSTER</strong>
            <div>Price: CoinGecko API (BTC)</div>
            <div>Hashrate: Mempool.space API</div>
            <div>Freq Mod: Memecoins</div>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#888', marginBottom: '5px' }}>THE GHOST</strong>
            <div>Transactions: Mempool.space API</div>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#888', marginBottom: '5px' }}>EARTH EATER</strong>
            <div>Mempool: Mempool.space API</div>
            <div>Fees: Real-time sat/vB</div>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#888', marginBottom: '5px' }}>THE ATMOSPHERE</strong>
            <div>Gas: Etherscan API</div>
            <div>Block Util: Ethereum Network</div>
            <div>Reverb Size: Gas Price</div>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#888', marginBottom: '5px' }}>THE ACCELERATOR</strong>
            <div>TPS: Solana RPC</div>
            <div>Filter Freq: TPS Modulated</div>
          </div>
        </div>
      </div>

      <footer style={{
        marginTop: '60px',
        padding: '20px 40px',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.7rem',
        color: '#444',
        fontFamily: 'monospace'
      }}>
        <div style={{ flex: 1, textAlign: 'left', color: '#555' }}>
          NANAY 2026
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <a href="https://alephchixi.xyz" style={{ color: '#F79514', textDecoration: 'none', fontWeight: 'bold' }} target="_blank" rel="noopener noreferrer">aleph::ch'ixi</a>
        </div>
        <div style={{ flex: 1, textAlign: 'right', color: '#555' }}>
          Developed by eme isaza m at Harry Halpin's "Coming Anarchy: Philosophy of Decentralization and Cryptography" seminar at <a href="https://thenewcentre.org" target="_blank" rel="noopener noreferrer" style={{ color: '#F79514', textDecoration: 'none' }}>The New Centre for Research and Practice</a>
        </div>
      </footer>

      <style>{`
            .mixer-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.6rem; color: #888; }
            .mixer-row input { width: 60%; } /* Handled by cyber-range class now */
          `}</style>
    </div>
  );
};

function App() {
  return (
    <AudioProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AudioProvider>
  );
}

export default App;
