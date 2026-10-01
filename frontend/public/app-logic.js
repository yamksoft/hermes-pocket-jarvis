import { ConnectionState, Room, RoomEvent, Track, createLocalTracks } from "https://cdn.jsdelivr.net/npm/livekit-client@2.15.7/+esm";

const $ = (id) => document.getElementById(id);
const state = { 
  room: null, command: "", mic: false, camera: false, pending: null, seenTranscriptions: new Set(), cameraDevices: [], selectedCameraId: null,
  hudState: "IDLE" // IDLE, LISTENING, SPEAKING, VISION_ACTIVE, HERMES_EXEC
};

// UI Element References
const ui = Object.fromEntries(
  ["gateway","livekit","gemini","connect","disconnect","mic","camera","stage","localVideo","messages","prompt","log","sessionState","modelState","roomName","approval","approvalText","approvalData","cameraSelect","audio-vis","core-state-radios","current-mode-display","cam-state"]
  .map((id) => [id, $(id)])
);

// -----------------------------------------------------------
// HUD Canvas Animation (Nexus Core)
// -----------------------------------------------------------
const canvas = $("nexus-core");
const ctx = canvas.getContext("2d");
let cw = canvas.width = canvas.parentElement.clientWidth;
let ch = canvas.height = canvas.parentElement.clientHeight;

window.addEventListener('resize', () => {
    cw = canvas.width = canvas.parentElement.parentElement.clientWidth - 20; // Account for padding
    ch = canvas.height = canvas.parentElement.clientHeight;
});

// Particles for Ambient Data Dust
let particles = [];
for(let i=0; i<60; i++) {
    particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 200,
        speed: 0.2 + Math.random() * 1,
        size: Math.random() * 2
    });
}

let time = 0;
function renderNexus() {
    requestAnimationFrame(renderNexus);
    time += 0.01 * (state.hudState === "HERMES_EXEC" ? 3 : 1);
    
    // Clear Canvas
    ctx.clearRect(0, 0, cw, ch);
    const cx = cw / 2;
    const cy = ch / 2;

    // State Modifiers
    let radiusPulse = (state.hudState === "LISTENING" || state.hudState === "SPEAKING") ? Math.sin(time*15) * 12 : 0;
    let ringTilt = state.hudState === "VISION_ACTIVE" ? 0 : 1; 

    // Ambient Data Dust
    ctx.fillStyle = '#00E5FF';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#00E5FF';
    particles.forEach(p => {
        p.dist += p.speed * (state.hudState === "HERMES_EXEC" ? 3 : 1);
        if (p.dist > 300) p.dist = 0;
        let px = cx + Math.cos(p.angle) * p.dist;
        let py = cy + Math.sin(p.angle) * p.dist;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI*2);
        ctx.fill();
    });

    // Central Fusion Core (Glowing Sun)
    let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50 + radiusPulse);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, '#FFF7A0');
    gradient.addColorStop(0.7, 'rgba(255, 165, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#FFA500';
    ctx.beginPath();
    ctx.arc(cx, cy, 90 + radiusPulse, 0, Math.PI*2);
    ctx.fill();

    // Radial Energy Rays (Orange)
    ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF8C00';
    ctx.lineWidth = 1.5;
    let numRays = 16;
    for (let i = 0; i < numRays; i++) {
        let angle = (i / numRays) * Math.PI * 2 + time;
        let length = 110 + Math.sin(time * 5 + i) * 30 + radiusPulse;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle)*40, cy + Math.sin(angle)*40);
        ctx.lineTo(cx + Math.cos(angle)*length, cy + Math.sin(angle)*length);
        ctx.stroke();
    }

    // Blue Neural Rings (3D Parametric Simulation via rotated ellipses)
    ctx.strokeStyle = '#00E5FF';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00E5FF';
    ctx.lineWidth = 2;

    const drawRing = (rx, ry, rot, dashOffset) => {
        ctx.setLineDash([10, 15, 40, 10]);
        ctx.lineDashOffset = dashOffset;
        ctx.beginPath();
        // If vision is active, flatten the tilt to look like target concentric rings
        let actualRot = ringTilt ? rot : 0;
        let actualRy = ringTilt ? ry : rx; 
        ctx.ellipse(cx, cy, rx + radiusPulse, actualRy + radiusPulse, actualRot, 0, Math.PI * 2);
        ctx.stroke();
    };

    drawRing(190, 70, time * 0.5, -time * 50);
    drawRing(170, 100, -time * 0.3, time * 60);
    drawRing(210, 50, Math.PI/4 + time * 0.2, -time * 40);

    ctx.setLineDash([]); // reset dashes

    // Orange Quantum Geodesic Inner Ring
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.shadowColor = '#FFA500';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 100 + radiusPulse, 100 + radiusPulse, 0, 0, Math.PI*2);
    ctx.stroke();
    
    // Vision Active Scanline Laser
    if (state.hudState === "VISION_ACTIVE") {
        let scanArea = 400;
        let scanY = cy - (scanArea/2) + ((time * 150) % scanArea);
        ctx.strokeStyle = 'rgba(0, 255, 157, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00FF9D';
        ctx.beginPath();
        ctx.moveTo(cx - 250, scanY);
        ctx.lineTo(cx + 250, scanY);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(0, 255, 157, 0.1)';
        ctx.fillRect(cx - 250, cy - (scanArea/2), 500, scanY - (cy - (scanArea/2)));
    }
}
// Start render loop (timeout ensures dimensions are ready)
setTimeout(() => {
    cw = canvas.width = canvas.parentElement.clientWidth;
    ch = canvas.height = canvas.parentElement.clientHeight;
    renderNexus();
}, 100);

// State Sync Function
function setHUDState(newState) {
    state.hudState = newState;
    ui['current-mode-display'].textContent = newState;
    
    // Sync Radio buttons
    const radio = document.querySelector(`input[name="state"][value="${newState}"]`);
    if(radio) radio.checked = true;
    
    // Visualizer UI effect
    if(newState === "LISTENING" || newState === "SPEAKING") {
        ui['audio-vis'].classList.add('active');
    } else {
        ui['audio-vis'].classList.remove('active');
    }
    
    // Hermes Node Flow Animation
    if(newState === "HERMES_EXEC") {
        $("node-h").classList.add('active-exec');
        $("node-exec").classList.add('active-exec');
    } else {
        $("node-h").classList.remove('active-exec');
        $("node-exec").classList.remove('active-exec');
    }
}

// Bind manual radio interactions
document.querySelectorAll('input[name="state"]').forEach(radio => {
  radio.addEventListener('change', (e) => setHUDState(e.target.value));
});


// -----------------------------------------------------------
// Pocket JARVIS Core Logic (LiveKit + Hermes)
// -----------------------------------------------------------

const escape = (value) => { const node = document.createElement("span"); node.textContent = String(value); return node.innerHTML; };
function log(kind, text) { 
    const row = document.createElement("div"); 
    row.className = `entry ${kind}`; 
    row.innerHTML = `<time>${new Date().toLocaleTimeString()}</time> <b>[${escape(kind).toUpperCase()}]</b> ${escape(text)}`; 
    ui.log.prepend(row); 
}
function message(role, text) { 
    if (!text?.trim()) return; 
    const node = document.createElement("div"); 
    node.className = `message ${role}`; 
    node.innerHTML = `<small>${role === "user" ? "USER_TX" : "HERMES_RX"}</small>${escape(text)}`; 
    ui.messages.append(node); 
    ui.messages.scrollTop = ui.messages.scrollHeight; 
    
    // Auto trigger speaking state for agent messages
    if(role === 'agent') { 
        setHUDState("SPEAKING"); 
        setTimeout(() => { if(state.hudState === "SPEAKING") setHUDState("IDLE"); }, 2000); 
    }
}

function connected(value) { 
    ui.connect.disabled = value; 
    ui.disconnect.disabled = !value; 
    ui.mic.disabled = !value; 
    ui.camera.disabled = !value; 
    if (ui.cameraSelect) ui.cameraSelect.disabled = !value; 
    ui.modelState.textContent = value ? "ONLINE" : "OFFLINE"; 
    ui.modelState.style.color = value ? "#00FF9D" : "inherit";
    ui.sessionState.textContent = value ? "ACTIVE" : "IDLE"; 
    if(value) setHUDState("IDLE");
}

function arm(command) { 
    state.command = state.command === command ? "" : command; 
    document.querySelectorAll("[data-command]").forEach((button) => button.classList.toggle("armed", button.dataset.command === state.command)); 
    $("armed").textContent = state.command ? `ARMED: ${state.command}` : ""; 
}

async function refreshStatus() { 
    try { 
        const data = await (await fetch("/api/status")).json(); 
        ui.gateway.textContent = data.gateway.online ? "Online" : data.gateway.detail;
        ui.gateway.className = data.gateway.online ? "cyan-text" : "danger-text";
        ui.livekit.textContent = data.livekit.configured ? "Configured" : "Needs Setup";
        ui.livekit.className = data.livekit.configured ? "cyan-text" : "danger-text";
        ui.gemini.textContent = data.gemini.configured ? "Ready" : "Needs Key";
        ui.gemini.className = data.gemini.configured ? "cyan-text" : "amber-text";
    } catch (error) { log("error", `status: ${error.message}`); } 
}

function attachTrack(track) { 
    const element = track.attach(); 
    if (track.kind === Track.Kind.Audio) { 
        element.autoplay = true; element.dataset.remoteAudio = "true"; document.body.append(element); 
    } else if (track.kind === Track.Kind.Video) { 
        element.className = "remote-video"; $("remoteMedia").replaceChildren(element); 
    } 
}
function detachTrack(track) { track.detach().forEach((element) => element.remove()); }

function dataReceived(payload, _participant, _kind, topic) { 
    if (topic !== "jarvis.control") return; 
    try { 
        const data = JSON.parse(new TextDecoder().decode(payload)); 
        if (data.type !== "hermes.approval") return; 
        state.pending = data; 
        ui.approvalData.textContent = JSON.stringify(data.run || data, null, 2); 
        ui.approval.showModal(); 
        log("approval", `Run ${data.run_id} awaits approval`); 
        setHUDState("HERMES_EXEC");
    } catch (error) { log("error", `control: ${error.message}`); } 
}

async function connect() { 
    if (state.room?.state === ConnectionState.Connected) return; 
    ui.connect.disabled = true; ui.sessionState.textContent = "ESTABLISHING..."; 
    try { 
        const response = await fetch("/api/livekit/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Operator" }) }); 
        const detail = await response.json(); 
        if (!response.ok) throw new Error(detail.detail || "LiveKit Token Error"); 
        
        const room = new Room({ adaptiveStream: true, dynacast: true }); 
        state.room = room; 
        
        room.on(RoomEvent.TrackSubscribed, attachTrack); 
        room.on(RoomEvent.TrackUnsubscribed, detachTrack); 
        room.on(RoomEvent.DataReceived, dataReceived); 
        room.on(RoomEvent.Disconnected, () => { log("system", "LiveKit disconnected"); cleanup(); }); 
        room.on(RoomEvent.ConnectionStateChanged, (value) => { 
            ui.sessionState.textContent = value === ConnectionState.Connected ? "ACTIVE" : value.toUpperCase(); 
        }); 
        
        await room.connect(detail.server_url, detail.participant_token); 
        ui.roomName.textContent = detail.room_name; 
        connected(true); 
        log("system", `Connected to ${detail.room_name}`); 
        
        room.registerTextStreamHandler("lk.transcription", async (reader, participantIdentity) => {
            const senderIdentity = participantIdentity?.identity || participantIdentity;
            let fullText = "";
            for await (const chunk of reader) fullText += chunk;
            if (!fullText.trim()) return;
            const dedupeKey = `${senderIdentity}:${fullText.trim()}`;
            if (state.seenTranscriptions.has(dedupeKey)) return;
            state.seenTranscriptions.add(dedupeKey);
            if (state.seenTranscriptions.size > 50) state.seenTranscriptions.delete(state.seenTranscriptions.values().next().value);
            
            const isLocal = senderIdentity === state.room?.localParticipant?.identity;
            message(isLocal ? "user" : "agent", fullText.trim());
        });
        
        await enumerateCameraDevices();
    } catch (error) { log("error", error.message); cleanup(); } 
}

function cleanup() {
    if (state.room) {
        state.room.off(RoomEvent.TrackSubscribed, attachTrack);
        state.room.off(RoomEvent.TrackUnsubscribed, detachTrack);
        state.room.off(RoomEvent.DataReceived, dataReceived);
        if (state.room.removeAllListeners) {
            state.room.removeAllListeners(RoomEvent.Disconnected);
            state.room.removeAllListeners(RoomEvent.ConnectionStateChanged);
        }
    }
    state.room = null; state.mic = false; state.camera = false; state.cameraDevices = []; state.selectedCameraId = null;
    ui.localVideo.srcObject = null; $("remoteMedia").replaceChildren();
    document.querySelectorAll("[data-remote-audio]").forEach((node) => node.remove());
    ui.roomName.textContent = "NO ROOM";
    ui['cam-state'].textContent = "Idle";
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
            if (videoDevices.length > 0) { state.selectedCameraId = videoDevices[0].deviceId; ui.cameraSelect.value = state.selectedCameraId; }
        }
    } catch (e) { log("error", `enumerateDevices: ${e.message}`); }
}

async function disconnect() { if (state.room) await state.room.disconnect(); cleanup(); }

async function toggleMic(force) { 
    if (!state.room) return; 
    state.mic = typeof force === "boolean" ? force : !state.mic; 
    await state.room.localParticipant.setMicrophoneEnabled(state.mic); 
    ui.mic.textContent = state.mic ? "🎙️ MIC ON" : "🎙️ MIC OFF"; 
    ui.mic.classList.toggle("primary", state.mic);
    
    if(state.mic) setHUDState("LISTENING"); else setHUDState("IDLE");
    
    log("voice", state.mic ? "Microphone enabled" : "Microphone muted"); 
}

async function toggleCamera() { 
    if (!state.room) return; 
    state.camera = !state.camera; 
    try { 
        if (state.camera) { 
            const deviceId = state.selectedCameraId;
            const constraints = deviceId ? { video: { deviceId: { exact: deviceId } } } : { video: true };
            await state.room.localParticipant.setCameraEnabled(true, constraints);
            log("video", `Camera enabled`);
            setHUDState("VISION_ACTIVE");
            ui['cam-state'].textContent = "Active";
        } else {
            await state.room.localParticipant.setCameraEnabled(false);
            log("video", "Camera disabled");
            setHUDState("IDLE");
            ui['cam-state'].textContent = "Idle";
        }
        state.camera = state.room.localParticipant.cameraEnabled;
        const publication = [...state.room.localParticipant.videoTrackPublications.values()].find(p => p.source === Track.Source.Camera);
        if (publication?.videoTrack) ui.localVideo.srcObject = new MediaStream([publication.videoTrack.mediaStreamTrack]);
        ui.camera.textContent = state.camera ? "📷 CAM ON" : "📷 CAM OFF";
        ui.camera.classList.toggle("primary", state.camera);
    } catch (e) { 
        log("error", `toggleCamera: ${e.message}`); state.camera = false; ui.camera.textContent = "📷 CAM"; ui['cam-state'].textContent = "Idle"; setHUDState("IDLE");
    } 
}

async function sendText(event) { 
    event?.preventDefault(); const text = ui.prompt.value.trim(); if (!text) return; 
    if (!state.room || state.room.state !== ConnectionState.Connected) { await connect(); if (!state.room || state.room.state !== ConnectionState.Connected) return; } 
    const output = state.command ? `${state.command} ${text}` : text; arm(""); ui.prompt.value = ""; 
    message("user", output); 
    
    if(output.includes("/run_hermes") || output.startsWith("/goal") || output.startsWith("/new")) { 
        setHUDState("HERMES_EXEC"); setTimeout(() => { if(state.hudState==="HERMES_EXEC") setHUDState("IDLE"); }, 3000); 
    }
    
    await state.room.localParticipant.sendText(output, { topic: "lk.chat" }); 
    log("system", "Data TX to Gemini Live"); 
}

async function decide(decision) { 
    const pending = state.pending; if (!pending) return; 
    try { 
        const response = await fetch("/api/approval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run_id: pending.run_id, decision }) }); 
        const payload = await response.json(); 
        if (!response.ok) throw new Error(payload.detail || "Approval error"); 
        log("approval", `${decision} sent`); 
    } catch (error) { log("error", error.message); } finally { state.pending = null; ui.approval.close(); setHUDState("IDLE"); } 
}

// Bind Events
document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", (e) => { e.preventDefault(); arm(button.dataset.command); }));
ui.connect.addEventListener("click", () => void connect()); ui.disconnect.addEventListener("click", () => void disconnect()); 
ui.mic.addEventListener("click", () => void toggleMic()); ui.camera.addEventListener("click", () => void toggleCamera()); 
$("chatForm").addEventListener("submit", (event) => void sendText(event)); 
$("approve").addEventListener("click", () => void decide("once")); $("deny").addEventListener("click", () => void decide("deny"));

if (ui.cameraSelect) {
    ui.cameraSelect.addEventListener("change", async () => {
        state.selectedCameraId = ui.cameraSelect.value;
        if (state.camera && state.room) {
            await state.room.localParticipant.setCameraEnabled(false);
            await state.room.localParticipant.setCameraEnabled(true, { video: { deviceId: { exact: state.selectedCameraId } } });
            const publication = [...state.room.localParticipant.videoTrackPublications.values()].find(p => p.source === Track.Source.Camera);
            if (publication?.videoTrack) ui.localVideo.srcObject = new MediaStream([publication.videoTrack.mediaStreamTrack]);
        }
    });
}

// Clock Loop
setInterval(() => {
    const d = new Date();
    const clock = document.getElementById('clock');
    if(clock) clock.textContent = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
}, 1000);

void refreshStatus(); setInterval(() => void refreshStatus(), 30000);