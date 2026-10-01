'use client';
import { useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/app-logic.js';
    script.type = 'module';
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <dialog id="approval" className="cyber-dialog">
        <div className="panel-header">[ HERMES_APPROVAL_REQUIRED ]</div>
        <p id="approvalText">Agent requires decision.</p>
        <pre id="approvalData"></pre>
        <div className="dialog-actions">
          <button id="approve" className="cyber-btn primary">APPROVE (ONCE)</button>
          <button id="deny" className="cyber-btn danger">DENY</button>
        </div>
      </dialog>

      <main className="nexus-layout">
        <header className="nexus-header">
          <div className="brand">
            <svg viewBox="0 0 24 24" className="brand-icon"><path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <div>
              <h1>JARVIS</h1>
              <small>NEURAL NEXUS</small>
            </div>
          </div>
          <div className="header-center">CONNECTING INTELLIGENCE · POWERING ACTIONS</div>
          <div className="header-right">
            <span className="status-dot"></span> <b id="modelState">OFFLINE</b> | 
            <span id="sessionState">IDLE</span> | 
            <small id="roomName">NO ROOM</small> |
            <span id="clock">00:00:00</span>
          </div>
        </header>

        <div className="nexus-grid">
          <aside className="panel-left">
            <div className="cyber-panel">
              <div className="panel-header">[ GEMINI_LIVE_SPEECH_PIPELINE ]</div>
              <div className="audio-visualizer" id="audio-vis">
                 <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
                 <div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div><div className="bar"></div>
              </div>
              <div className="pipeline-stats">
                <div><label>STT</label> <span id="stt-status" className="cyan-text">Active</span></div>
                <div><label>TTS</label> <span id="tts-status" className="cyan-text">Ready</span></div>
                <div><label>Lang</label> <span className="cyan-text">ar-SA</span></div>
                <div><label>Vol</label> <span className="cyan-text">78%</span></div>
              </div>
              <div className="hud-buttons">
                <button id="mic" className="cyber-btn" disabled>🎙️ MIC</button>
                <button id="connect" className="cyber-btn primary">CONNECT</button>
                <button id="disconnect" className="cyber-btn danger" disabled>DISCONNECT</button>
              </div>
            </div>

            <div className="cyber-panel">
              <div className="panel-header">[ SYSTEM_STATUS ]</div>
              <ul className="telemetry-list">
                <li><span className="dot ok"></span> LiveKit: <span id="livekit" className="cyan-text">Checking...</span></li>
                <li><span className="dot ok"></span> Hermes: <span id="gateway" className="cyan-text">Checking...</span></li>
                <li><span className="dot ok"></span> Gemini: <span id="gemini" className="cyan-text">Checking...</span></li>
              </ul>
              <div className="progress-bar-group">
                <div className="bar-row"><label>CPU 12%</label> <div className="bar"><div className="fill" style={{width:'12%'}}></div></div></div>
                <div className="bar-row"><label>RAM 28%</label> <div className="bar"><div className="fill" style={{width:'28%'}}></div></div></div>
                <div className="bar-row"><label>GPU 18%</label> <div className="bar"><div className="fill" style={{width:'18%'}}></div></div></div>
              </div>
            </div>

            <div className="cyber-panel log-panel">
              <div className="panel-header">[ TELEMETRY_LOGS ]</div>
              <div id="log" className="log" aria-live="polite"></div>
            </div>
          </aside>

          <section className="panel-center" id="stage">
            <canvas id="nexus-core"></canvas>
            <div id="remoteMedia"></div>
            <div className="stage-label-overlay"></div>
          </section>

          <aside className="panel-right">
            <div className="cyber-panel">
              <div className="panel-header">[ OPTICAL_INSPECTION_MATRIX ]</div>
              <div className="video-container">
                 <div className="reticle"></div>
                 <video id="localVideo" muted autoPlay playsInline aria-label="Camera"></video>
              </div>
              <div className="matrix-stats">
                <div><label>Camera:</label> <span id="cam-state" className="cyan-text">Idle</span></div>
                <div><label>Process:</label> <span className="cyan-text">98%</span></div>
                <div><label>Detect:</label> <span className="cyan-text">Objects</span></div>
                <div><label>Resol:</label> <span className="cyan-text">1920x1080</span></div>
              </div>
              <div className="hud-buttons">
                <button id="camera" className="cyber-btn" disabled>📷 CAM</button>
                <select id="cameraSelect" className="cyber-select" disabled></select>
              </div>
            </div>

            <div className="cyber-panel">
              <div className="panel-header">[ CORE_STATE ]</div>
              <div className="radio-group" id="core-state-radios">
                 <label><input type="radio" name="state" value="IDLE" defaultChecked /> IDLE</label>
                 <label><input type="radio" name="state" value="LISTENING" /> LISTENING</label>
                 <label><input type="radio" name="state" value="SPEAKING" /> SPEAKING</label>
                 <label><input type="radio" name="state" value="VISION_ACTIVE" /> VISION_ACTIVE</label>
                 <label><input type="radio" name="state" value="HERMES_EXEC" /> HERMES_EXEC</label>
              </div>
              <div className="current-mode">
                 <small>CURRENT MODE</small>
                 <div id="current-mode-display" className="mode-text">IDLE</div>
              </div>
            </div>
            
            <div className="cyber-panel chat-panel">
               <div className="panel-header">[ COMM_CHANNEL ]</div>
               <div id="messages" className="messages"></div>
               <form id="chatForm" className="composer">
                 <input id="prompt" placeholder="> Enter command..." required autoComplete="off"/>
                 <button type="submit" className="cyber-btn primary">TX</button>
               </form>
               <div className="command-grid" style={{marginTop:'10px', display:'flex', gap:'5px', flexWrap:'wrap'}}>
                 <button data-command="/new" className="cyber-btn small">/new</button>
                 <button data-command="/goal" className="cyber-btn small">/goal</button>
                 <p id="armed" className="armed" style={{width:'100%', fontSize:'0.7rem', color:'#FF8C00', margin:0}}></p>
               </div>
            </div>
          </aside>
        </div>

        <div className="panel-bottom">
          <div className="cyber-panel execution-core">
            <div className="panel-header">[ HERMES_EXECUTION_CORE ]</div>
            <div className="flow-diagram">
               <div className="node" id="node-livekit">
                  <b>LiveKit</b><br/><small>Real-time Audio/Video</small><br/><span className="status ok">CONNECTED</span>
               </div>
               <div className="arrow">→</div>
               <div className="node" id="node-hermes">
                  <b>Hermes Core</b><br/><small>AI Agent Engine</small><br/><span className="status ok">RUNNING</span>
               </div>
               <div className="arrow">→</div>
               <div className="node hexagon" id="node-h">H</div>
               <div className="arrow">→</div>
               <div className="node" id="node-tools">
                  <b>Tools & Skills</b><br/><small>31 / 54</small><br/><span className="status ok">ACTIVE</span>
               </div>
               <div className="arrow">→</div>
               <div className="node" id="node-exec">
                  <b>Execution</b><br/><small>Task Processing</small><br/><span className="status pending">IN PROGRESS</span>
               </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
