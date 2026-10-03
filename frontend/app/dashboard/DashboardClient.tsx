'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { ConnectionState, Room, RoomEvent, Track, LocalParticipant } from 'livekit-client';
import './dashboard.css';

const BACKEND_URL = 'http://localhost:8082';

export function DashboardClient() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // UI Elements map
    const $ = (id: string) => document.getElementById(id) as HTMLElement;
    const ui = {
      gateway: $('gateway'),
      livekit: $('livekit'),
      gemini: $('gemini'),
      connect: $('connect') as HTMLButtonElement,
      disconnect: $('disconnect') as HTMLButtonElement,
      mic: $('mic') as HTMLButtonElement,
      camera: $('camera') as HTMLButtonElement,
      stage: $('stage'),
      localVideo: $('localVideo') as HTMLVideoElement,
      messages: $('messages'),
      prompt: $('prompt') as HTMLInputElement,
      log: $('log'),
      sessionState: $('sessionState'),
      modelState: $('modelState'),
      roomName: $('roomName'),
      approval: $('approval') as HTMLDialogElement,
      approvalText: $('approvalText'),
      approvalData: $('approvalData'),
      cameraSelect: $('cameraSelect') as HTMLSelectElement,
      'audio-vis': $('audio-vis'),
      'core-state-radios': $('core-state-radios'),
      'current-mode-display': $('current-mode-display'),
      'cam-state': $('cam-state')
    };

    const state = {
      room: null as Room | null,
      command: "",
      mic: false,
      camera: false,
      pending: null as any,
      seenTranscriptions: new Set<string>(),
      cameraDevices: [] as MediaDeviceInfo[],
      selectedCameraId: null as string | null,
      hudState: "IDLE" // IDLE, LISTENING, SPEAKING, VISION_ACTIVE, HERMES_EXEC
    };

    // --- HUD Canvas Animation ---
    const canvas = $('nexus-core') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cw = canvas.width = canvas.parentElement!.clientWidth;
    let ch = canvas.height = canvas.parentElement!.clientHeight;

    const resizeListener = () => {
      cw = canvas.width = canvas.parentElement!.parentElement!.clientWidth - 20;
      ch = canvas.height = canvas.parentElement!.clientHeight;
    };
    window.addEventListener('resize', resizeListener);

    const particles: any[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 200,
        speed: 0.2 + Math.random() * 1,
        size: Math.random() * 2
      });
    }

    let time = 0;
    let animFrame: number;

    function renderNexus() {
      animFrame = requestAnimationFrame(renderNexus);
      time += 0.01 * (state.hudState === "HERMES_EXEC" ? 3 : 1);

      ctx!.clearRect(0, 0, cw, ch);
      const cx = cw / 2;
      const cy = ch / 2;

      let radiusPulse = (state.hudState === "LISTENING" || state.hudState === "SPEAKING") ? Math.sin(time * 15) * 12 : 0;
      let ringTilt = state.hudState === "VISION_ACTIVE" ? 0 : 1;

      ctx!.fillStyle = '#00E5FF';
      ctx!.shadowBlur = 5;
      ctx!.shadowColor = '#00E5FF';
      particles.forEach(p => {
        p.dist += p.speed * (state.hudState === "HERMES_EXEC" ? 3 : 1);
        if (p.dist > 300) p.dist = 0;
        let px = cx + Math.cos(p.angle) * p.dist;
        let py = cy + Math.sin(p.angle) * p.dist;
        ctx!.beginPath();
        ctx!.arc(px, py, p.size, 0, Math.PI * 2);
        ctx!.fill();
      });

      let gradient = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 50 + radiusPulse);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.3, '#FFF7A0');
      gradient.addColorStop(0.7, 'rgba(255, 165, 0, 0.5)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx!.fillStyle = gradient;
      ctx!.shadowBlur = 25;
      ctx!.shadowColor = '#FFA500';
      ctx!.beginPath();
      ctx!.arc(cx, cy, 90 + radiusPulse, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.strokeStyle = 'rgba(255, 140, 0, 0.8)';
      ctx!.shadowBlur = 10;
      ctx!.shadowColor = '#FF8C00';
      ctx!.lineWidth = 1.5;
      let numRays = 16;
      for (let i = 0; i < numRays; i++) {
        let angle = (i / numRays) * Math.PI * 2 + time;
        let length = 110 + Math.sin(time * 5 + i) * 30 + radiusPulse;
        ctx!.beginPath();
        ctx!.moveTo(cx + Math.cos(angle) * 40, cy + Math.sin(angle) * 40);
        ctx!.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
        ctx!.stroke();
      }

      ctx!.strokeStyle = '#00E5FF';
      ctx!.shadowBlur = 15;
      ctx!.shadowColor = '#00E5FF';
      ctx!.lineWidth = 2;

      const drawRing = (rx: number, ry: number, rot: number, dashOffset: number) => {
        ctx!.setLineDash([10, 15, 40, 10]);
        ctx!.lineDashOffset = dashOffset;
        ctx!.beginPath();
        let actualRot = ringTilt ? rot : 0;
        let actualRy = ringTilt ? ry : rx;
        ctx!.ellipse(cx, cy, rx + radiusPulse, actualRy + radiusPulse, actualRot, 0, Math.PI * 2);
        ctx!.stroke();
      };

      drawRing(190, 70, time * 0.5, -time * 50);
      drawRing(170, 100, -time * 0.3, time * 60);
      drawRing(210, 50, Math.PI / 4 + time * 0.2, -time * 40);

      ctx!.setLineDash([]);

      ctx!.strokeStyle = 'rgba(255, 165, 0, 0.9)';
      ctx!.shadowColor = '#FFA500';
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, 100 + radiusPulse, 100 + radiusPulse, 0, 0, Math.PI * 2);
      ctx!.stroke();

      if (state.hudState === "VISION_ACTIVE") {
        let scanArea = 400;
        let scanY = cy - (scanArea / 2) + ((time * 150) % scanArea);
        ctx!.strokeStyle = 'rgba(0, 255, 157, 0.8)';
        ctx!.lineWidth = 2;
        ctx!.shadowColor = '#00FF9D';
        ctx!.beginPath();
        ctx!.moveTo(cx - 250, scanY);
        ctx!.lineTo(cx + 250, scanY);
        ctx!.stroke();

        ctx!.fillStyle = 'rgba(0, 255, 157, 0.1)';
        ctx!.fillRect(cx - 250, cy - (scanArea / 2), 500, scanY - (cy - (scanArea / 2)));
      }
    }

    setTimeout(() => {
      cw = canvas.width = canvas.parentElement!.clientWidth;
      ch = canvas.height = canvas.parentElement!.clientHeight;
      renderNexus();
    }, 100);

    function setHUDState(newState: string) {
      state.hudState = newState;
      if (ui['current-mode-display']) ui['current-mode-display'].textContent = newState;

      const radio = document.querySelector(`input[name="state"][value="${newState}"]`) as HTMLInputElement;
      if (radio) radio.checked = true;

      if (newState === "LISTENING" || newState === "SPEAKING") {
        ui['audio-vis'].classList.add('active');
      } else {
        ui['audio-vis'].classList.remove('active');
      }

      if (newState === "HERMES_EXEC") {
        $('node-h')?.classList.add('active-exec');
        $('node-exec')?.classList.add('active-exec');
      } else {
        $('node-h')?.classList.remove('active-exec');
        $('node-exec')?.classList.remove('active-exec');
      }
    }

    document.querySelectorAll('input[name="state"]').forEach(radio => {
      radio.addEventListener('change', (e) => setHUDState((e.target as HTMLInputElement).value));
    });

    const escape = (value: any) => { const node = document.createElement("span"); node.textContent = String(value); return node.innerHTML; };

    function log(kind: string, text: string) {
      if (!ui.log) return;
      const row = document.createElement("div");
      row.className = `entry ${kind}`;
      row.innerHTML = `<time>${new Date().toLocaleTimeString()}</time> <b>[${escape(kind).toUpperCase()}]</b> ${escape(text)}`;
      ui.log.prepend(row);
    }

    function message(role: string, text: string) {
      if (!text?.trim() || !ui.messages) return;
      const node = document.createElement("div");
      node.className = `message ${role}`;
      node.innerHTML = `<small>${role === "user" ? "USER_TX" : "HERMES_RX"}</small>${escape(text)}`;
      ui.messages.append(node);
      ui.messages.scrollTop = ui.messages.scrollHeight;

      if (role === 'agent') {
        setHUDState("SPEAKING");
        setTimeout(() => { if (state.hudState === "SPEAKING") setHUDState("IDLE"); }, 2000);
      }
    }

    function connected(value: boolean) {
      ui.connect.disabled = value;
      ui.disconnect.disabled = !value;
      ui.mic.disabled = !value;
      ui.camera.disabled = !value;
      if (ui.cameraSelect) ui.cameraSelect.disabled = !value;
      ui.modelState.textContent = value ? "ONLINE" : "OFFLINE";
      ui.modelState.style.color = value ? "#00FF9D" : "inherit";
      ui.sessionState.textContent = value ? "ACTIVE" : "IDLE";
      if (value) setHUDState("IDLE");
    }

    function arm(command: string) {
      state.command = state.command === command ? "" : command;
      document.querySelectorAll("[data-command]").forEach((button) => {
        button.classList.toggle("armed", (button as HTMLElement).dataset.command === state.command)
      });
      const armedEl = $('armed');
      if (armedEl) armedEl.textContent = state.command ? `ARMED: ${state.command}` : "";
    }

    async function refreshStatus() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/status`);
        const data = await response.json();
        if (ui.gateway) {
          ui.gateway.textContent = data.gateway.online ? "Online" : data.gateway.detail;
          ui.gateway.className = data.gateway.online ? "cyan-text" : "danger-text";
        }
        if (ui.livekit) {
          ui.livekit.textContent = data.livekit.configured ? "Configured" : "Needs Setup";
          ui.livekit.className = data.livekit.configured ? "cyan-text" : "danger-text";
        }
        if (ui.gemini) {
          ui.gemini.textContent = data.gemini.configured ? "Ready" : "Needs Key";
          ui.gemini.className = data.gemini.configured ? "cyan-text" : "amber-text";
        }
      } catch (error: any) { log("error", `status: ${error.message}`); }
    }

    function attachTrack(track: Track) {
      const element = track.attach();
      if (track.kind === Track.Kind.Audio) {
        element.autoplay = true;
        element.dataset.remoteAudio = "true";
        document.body.append(element);
      } else if (track.kind === Track.Kind.Video) {
        element.className = "remote-video";
        $('remoteMedia')?.replaceChildren(element);
      }
    }

    function detachTrack(track: Track) {
      track.detach().forEach((element) => element.remove());
    }

    function dataReceived(payload: Uint8Array, _participant: any, _kind: any, topic?: string) {
      if (topic !== "jarvis.control") return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type !== "hermes.approval") return;
        state.pending = data;
        if (ui.approvalData) ui.approvalData.textContent = JSON.stringify(data.run || data, null, 2);
        if (ui.approval) ui.approval.showModal();
        log("approval", `Run ${data.run_id} awaits approval`);
        setHUDState("HERMES_EXEC");
      } catch (error: any) { log("error", `control: ${error.message}`); }
    }

    async function doConnect() {
      if (state.room?.state === ConnectionState.Connected) return;
      ui.connect.disabled = true; ui.sessionState.textContent = "ESTABLISHING...";
      try {
        const response = await fetch(`${BACKEND_URL}/api/livekit/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Operator" })
        });
        const detail = await response.json();
        if (!response.ok) throw new Error(detail.detail || "LiveKit Token Error");

        const room = new Room({ adaptiveStream: true, dynacast: true });
        state.room = room;

        room.on(RoomEvent.TrackSubscribed, attachTrack);
        room.on(RoomEvent.TrackUnsubscribed, detachTrack);
        room.on(RoomEvent.DataReceived, dataReceived);
        room.on(RoomEvent.Disconnected, () => { log("system", "LiveKit disconnected"); cleanup(); });
        room.on(RoomEvent.ConnectionStateChanged, (value) => {
          if (ui.sessionState) ui.sessionState.textContent = value === ConnectionState.Connected ? "ACTIVE" : value.toUpperCase();
        });

        await room.connect(detail.server_url, detail.participant_token);
        if (ui.roomName) ui.roomName.textContent = detail.room_name;
        connected(true);
        log("system", `Connected to ${detail.room_name}`);

        (room as any).registerTextStreamHandler("lk.transcription", async (reader: any, participantIdentity: any) => {
          const senderIdentity = participantIdentity?.identity || participantIdentity;
          let fullText = "";
          for await (const chunk of reader) fullText += chunk;
          if (!fullText.trim()) return;
          const dedupeKey = `${senderIdentity}:${fullText.trim()}`;
          if (state.seenTranscriptions.has(dedupeKey)) return;
          state.seenTranscriptions.add(dedupeKey);
          if (state.seenTranscriptions.size > 50) {
            const firstItem = Array.from(state.seenTranscriptions)[0];
            state.seenTranscriptions.delete(firstItem);
          }

          const isLocal = senderIdentity === state.room?.localParticipant?.identity;
          message(isLocal ? "user" : "agent", fullText.trim());
        });

        await enumerateCameraDevices();
      } catch (error: any) { log("error", error.message); cleanup(); }
    }

    function cleanup() {
      if (state.room) {
        state.room.off(RoomEvent.TrackSubscribed, attachTrack);
        state.room.off(RoomEvent.TrackUnsubscribed, detachTrack);
        state.room.off(RoomEvent.DataReceived, dataReceived);
        state.room.off(RoomEvent.Disconnected, cleanup);
        state.room.off(RoomEvent.ConnectionStateChanged, () => { });
      }
      state.room = null; state.mic = false; state.camera = false; state.cameraDevices = []; state.selectedCameraId = null;
      if (ui.localVideo) ui.localVideo.srcObject = null;
      $('remoteMedia')?.replaceChildren();
      document.querySelectorAll("[data-remote-audio]").forEach((node) => node.remove());
      if (ui.roomName) ui.roomName.textContent = "NO ROOM";
      if (ui['cam-state']) ui['cam-state'].textContent = "Idle";
      setHUDState("IDLE");
      connected(false);
    }

    async function enumerateCameraDevices() {
      if (!state.room) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        state.cameraDevices = videoDevices;
        if (ui.cameraSelect) {
          ui.cameraSelect.innerHTML = videoDevices.map(d => `<option value="${d.deviceId}">${d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>`).join("");
          if (videoDevices.length > 0) {
            state.selectedCameraId = videoDevices[0].deviceId;
            ui.cameraSelect.value = state.selectedCameraId;
          }
        }
      } catch (e: any) { log("error", `enumerateDevices: ${e.message}`); }
    }

    async function disconnect() {
      if (state.room) await state.room.disconnect();
      cleanup();
    }

    async function toggleMic(force?: boolean) {
      if (!state.room) return;
      state.mic = typeof force === "boolean" ? force : !state.mic;
      await state.room.localParticipant.setMicrophoneEnabled(state.mic);
      ui.mic.textContent = state.mic ? "🎙️ MIC ON" : "🎙️ MIC OFF";
      ui.mic.classList.toggle("primary", state.mic);

      if (state.mic) setHUDState("LISTENING"); else setHUDState("IDLE");

      log("voice", state.mic ? "Microphone enabled" : "Microphone muted");
    }

    async function toggleCamera() {
      if (!state.room) return;
      state.camera = !state.camera;
      try {
        if (state.camera) {
          const deviceId = state.selectedCameraId;
          const constraints = deviceId ? { video: { deviceId: { exact: deviceId } } } : { video: true };
          await state.room.localParticipant.setCameraEnabled(true, constraints as any);
          log("video", `Camera enabled`);
          setHUDState("VISION_ACTIVE");
          if (ui['cam-state']) ui['cam-state'].textContent = "Active";
        } else {
          await state.room.localParticipant.setCameraEnabled(false);
          log("video", "Camera disabled");
          setHUDState("IDLE");
          if (ui['cam-state']) ui['cam-state'].textContent = "Idle";
        }
        state.camera = state.room.localParticipant.isCameraEnabled;
        const publication = [...state.room.localParticipant.videoTrackPublications.values()].find(p => p.source === Track.Source.Camera);
        if (publication?.videoTrack && ui.localVideo) {
          ui.localVideo.srcObject = new MediaStream([publication.videoTrack.mediaStreamTrack]);
        }
        ui.camera.textContent = state.camera ? "📷 CAM ON" : "📷 CAM OFF";
        ui.camera.classList.toggle("primary", state.camera);
      } catch (e: any) {
        log("error", `toggleCamera: ${e.message}`);
        state.camera = false;
        if (ui.camera) ui.camera.textContent = "📷 CAM";
        if (ui['cam-state']) ui['cam-state'].textContent = "Idle";
        setHUDState("IDLE");
      }
    }

    async function sendText(event?: Event) {
      event?.preventDefault();
      const text = ui.prompt.value.trim();
      if (!text) return;

      if (!state.room || state.room.state !== ConnectionState.Connected) {
        await doConnect();
        if (!state.room || state.room.state !== ConnectionState.Connected) return;
      }

      const output = state.command ? `${state.command} ${text}` : text;
      arm("");
      ui.prompt.value = "";
      message("user", output);

      if (output.includes("/run_hermes") || output.startsWith("/goal") || output.startsWith("/new")) {
        setHUDState("HERMES_EXEC");
        setTimeout(() => { if (state.hudState === "HERMES_EXEC") setHUDState("IDLE"); }, 3000);
      }

      const encoder = new TextEncoder();
      await state.room.localParticipant.publishData(encoder.encode(output), { topic: "lk.chat", reliable: true });

      log("system", "Data TX to Gemini Live");
    }

    async function decide(decision: string) {
      const pending = state.pending;
      if (!pending) return;
      try {
        const response = await fetch(`${BACKEND_URL}/api/approval`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id: pending.run_id, decision })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || "Approval error");
        log("approval", `${decision} sent`);
      } catch (error: any) { log("error", error.message); }
      finally {
        state.pending = null;
        if (ui.approval) ui.approval.close();
        setHUDState("IDLE");
      }
    }

    // Binding events directly
    document.querySelectorAll("[data-command]").forEach((button) => {
      button.addEventListener("click", (e) => { e.preventDefault(); arm((button as HTMLElement).dataset.command!); });
    });

    ui.connect?.addEventListener("click", doConnect);
    ui.disconnect?.addEventListener("click", disconnect);
    ui.mic?.addEventListener("click", () => toggleMic());
    ui.camera?.addEventListener("click", toggleCamera);
    $('chatForm')?.addEventListener("submit", sendText);
    $('approve')?.addEventListener("click", () => decide("once"));
    $('deny')?.addEventListener("click", () => decide("deny"));

    if (ui.cameraSelect) {
      ui.cameraSelect.addEventListener("change", async () => {
        state.selectedCameraId = ui.cameraSelect.value;
        if (state.camera && state.room) {
          await state.room.localParticipant.setCameraEnabled(false);
          await state.room.localParticipant.setCameraEnabled(true, { video: { deviceId: { exact: state.selectedCameraId } } } as any);
          const publication = [...state.room.localParticipant.videoTrackPublications.values()].find(p => p.source === Track.Source.Camera);
          if (publication?.videoTrack && ui.localVideo) {
            ui.localVideo.srcObject = new MediaStream([publication.videoTrack.mediaStreamTrack]);
          }
        }
      });
    }

    const clockInterval = setInterval(() => {
      const d = new Date();
      const clock = document.getElementById('clock');
      if (clock) clock.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    }, 1000);

    refreshStatus();
    const statusInterval = setInterval(refreshStatus, 30000);

    return () => {
      window.removeEventListener('resize', resizeListener);
      cancelAnimationFrame(animFrame);
      clearInterval(clockInterval);
      clearInterval(statusInterval);
      if (state.room) {
        state.room.disconnect();
      }
      // Remove event listeners
      ui.connect?.removeEventListener("click", doConnect);
      ui.disconnect?.removeEventListener("click", disconnect);
      $('chatForm')?.removeEventListener("submit", sendText);
      $('approve')?.removeEventListener("click", () => decide("once"));
      $('deny')?.removeEventListener("click", () => decide("deny"));
    };
  }, []);

  return (
    <div className="dashboard-body" ref={containerRef}>
      {/* Approval Dialog */}
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
        {/* Header */}
        <header className="nexus-header">
          <div className="brand">
            <svg viewBox="0 0 24 24" className="brand-icon">
              <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
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
          {/* Left Panel */}
          <aside className="panel-left">
            <div className="cyber-panel">
              <div className="panel-header">[ GEMINI_LIVE_SPEECH_PIPELINE ]</div>
              <div className="audio-visualizer" id="audio-vis">
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
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
                <div className="bar-row"><label>CPU 12%</label>
                  <div className="bar">
                    <div className="fill" style={{ width: '12%' }}></div>
                  </div>
                </div>
                <div className="bar-row"><label>RAM 28%</label>
                  <div className="bar">
                    <div className="fill" style={{ width: '28%' }}></div>
                  </div>
                </div>
                <div className="bar-row"><label>GPU 18%</label>
                  <div className="bar">
                    <div className="fill" style={{ width: '18%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-panel log-panel">
              <div className="panel-header">[ TELEMETRY_LOGS ]</div>
              <div id="log" className="log" aria-live="polite"></div>
            </div>
          </aside>

          {/* Center Animation */}
          <section className="panel-center" id="stage">
            <canvas id="nexus-core" className="nexus-core-canvas"></canvas>
            <div id="remoteMedia" className="remote-media-container"></div>
            <div className="stage-label-overlay"></div>
          </section>

          {/* Right Panel */}
          <aside className="panel-right">
            <div className="cyber-panel">
              <div className="panel-header">[ OPTICAL_INSPECTION_MATRIX ]</div>
              <div className="video-container">
                <div className="reticle"></div>
                <video id="localVideo" className="local-video" muted autoPlay playsInline aria-label="Camera"></video>
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
                <input id="prompt" placeholder="> Enter command..." required autoComplete="off" />
                <button type="submit" className="cyber-btn primary">TX</button>
              </form>
              <div className="command-grid" style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button data-command="/new" className="cyber-btn small">/new</button>
                <button data-command="/goal" className="cyber-btn small">/goal</button>
                <p id="armed" className="armed" style={{ width: '100%', fontSize: '0.7rem', color: '#FF8C00', margin: 0 }}></p>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Panel */}
        <div className="panel-bottom">
          <div className="cyber-panel execution-core">
            <div className="panel-header">[ HERMES_EXECUTION_CORE ]</div>
            <div className="flow-diagram">
              <div className="node" id="node-livekit">
                <b>LiveKit</b><br /><small>Real-time Audio/Video</small><br /><span className="status ok">CONNECTED</span>
              </div>
              <div className="arrow">→</div>
              <div className="node" id="node-hermes">
                <b>Hermes Core</b><br /><small>AI Agent Engine</small><br /><span className="status ok">RUNNING</span>
              </div>
              <div className="arrow">→</div>
              <div className="node hexagon" id="node-h">H</div>
              <div className="arrow">→</div>
              <div className="node" id="node-tools">
                <b>Tools & Skills</b><br /><small>31 / 54</small><br /><span className="status ok">ACTIVE</span>
              </div>
              <div className="arrow">→</div>
              <div className="node" id="node-exec">
                <b>Execution</b><br /><small>Task Processing</small><br /><span className="status pending">IN PROGRESS</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
