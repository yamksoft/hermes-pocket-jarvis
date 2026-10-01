import { ConnectionState, Room, RoomEvent, Track, createLocalTracks } from "https://cdn.jsdelivr.net/npm/livekit-client@2.15.7/+esm";

const $ = (id) => document.getElementById(id);
const state = { room: null, command: "", mic: false, camera: false, pending: null, seenTranscriptions: new Set(), cameraDevices: [], selectedCameraId: null };
const ui = Object.fromEntries(["gateway","livekit","gemini","connect","disconnect","mic","camera","stage","localVideo","messages","prompt","log","sessionState","modelState","roomName","approval","approvalText","approvalData","cameraSelect"].map((id) => [id, $(id)]));
const escape = (value) => { const node = document.createElement("span"); node.textContent = String(value); return node.innerHTML; };
function log(kind, text) { const row = document.createElement("div"); row.className = `entry ${kind}`; row.innerHTML = `<time>${new Date().toLocaleTimeString()}</time><b>${escape(kind).toUpperCase()}</b> ${escape(text)}`; ui.log.prepend(row); }
function chip(element, text, kind = "") { element.textContent = text; element.className = `chip ${kind}`; }
function message(role, text) { if (!text?.trim()) return; const node = document.createElement("div"); node.className = `message ${role}`; node.innerHTML = `<small>${role === "user" ? "أنت" : "JARVIS"}</small>${escape(text)}`; ui.messages.append(node); ui.messages.scrollTop = ui.messages.scrollHeight; }
function connected(value) { ui.connect.disabled = value; ui.disconnect.disabled = !value; ui.mic.disabled = !value; ui.camera.disabled = !value; if (ui.cameraSelect) ui.cameraSelect.disabled = !value; ui.modelState.textContent = value ? "GEMINI LIVE" : "غير متصل"; ui.sessionState.textContent = value ? "جلسة نشطة" : "في الانتظار"; }
function arm(command) { state.command = state.command === command ? "" : command; document.querySelectorAll("[data-command]").forEach((button) => button.classList.toggle("armed", button.dataset.command === state.command)); $("armed").textContent = state.command ? `جاهز: ${state.command}` : ""; }

async function refreshStatus() { try { const data = await (await fetch("/api/status")).json(); chip(ui.gateway, `Hermes: ${data.gateway.online ? "متصل" : data.gateway.detail}`, data.gateway.online ? "ok" : "bad"); chip(ui.livekit, `LiveKit: ${data.livekit.configured ? "مُعد" : "يلزم الإعداد"}`, data.livekit.configured ? "ok" : "bad"); chip(ui.gemini, `${data.gemini.model}: ${data.gemini.configured ? "مُعد" : "يلزم المفتاح"}`, data.gemini.configured ? "ok" : "amber"); } catch (error) { log("error", `status: ${error.message}`); } }
function attachTrack(track) { const element = track.attach(); if (track.kind === Track.Kind.Audio) { element.autoplay = true; element.dataset.remoteAudio = "true"; document.body.append(element); } else if (track.kind === Track.Kind.Video) { element.className = "remote-video"; $("remoteMedia").replaceChildren(element); } }
function detachTrack(track) { track.detach().forEach((element) => element.remove()); }
function dataReceived(payload, _participant, _kind, topic) { if (topic !== "jarvis.control") return; try { const data = JSON.parse(new TextDecoder().decode(payload)); if (data.type !== "hermes.approval") return; state.pending = data; ui.approvalText.textContent = "Hermes يحتاج قرارك قبل تنفيذ الإجراء."; ui.approvalData.textContent = JSON.stringify(data.run || data, null, 2); ui.approval.showModal(); log("approval", `run ${data.run_id} awaits approval`); } catch (error) { log("error", `control: ${error.message}`); } }

async function connect() { if (state.room?.state === ConnectionState.Connected) return; ui.connect.disabled = true; ui.sessionState.textContent = "يتم إنشاء قناة آمنة…"; try { const response = await fetch("/api/livekit/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: $("displayName").value || "user" }) }); const detail = await response.json(); if (!response.ok) throw new Error(detail.detail || "تعذر إنشاء رمز LiveKit"); const room = new Room({ adaptiveStream: true, dynacast: true }); state.room = room; room.on(RoomEvent.TrackSubscribed, attachTrack); room.on(RoomEvent.TrackUnsubscribed, detachTrack); room.on(RoomEvent.DataReceived, dataReceived); room.on(RoomEvent.Disconnected, () => { log("status", "LiveKit disconnected"); cleanup(); }); room.on(RoomEvent.ConnectionStateChanged, (value) => { ui.sessionState.textContent = value === ConnectionState.Connected ? "جلسة نشطة" : `LiveKit: ${value}`; }); await room.connect(detail.server_url, detail.participant_token); ui.roomName.textContent = detail.room_name; connected(true); log("status", `connected ${detail.room_name}`); await toggleMic(true);
    // Register text stream handler for lk.transcription topic (both user and agent transcriptions)
    // Accumulate chunks and only display complete message when stream ends
    // Deduplicate by tracking seen transcriptions (RoomIO may publish duplicate streams)
    room.registerTextStreamHandler("lk.transcription", async (reader, participantIdentity) => {
        const senderIdentity = participantIdentity?.identity || participantIdentity;
        log("debug", `Transcription stream opened from ${senderIdentity}`);
        let fullText = "";
        for await (const chunk of reader) {
            log("debug", `Received transcription chunk: ${chunk.slice(0, 50)}`);
            fullText += chunk;
        }
        if (!fullText.trim()) return;
        // Deduplicate: skip if we've seen this exact transcription from this sender recently
        const dedupeKey = `${senderIdentity}:${fullText.trim()}`;
        if (state.seenTranscriptions.has(dedupeKey)) {
            log("debug", `Duplicate transcription ignored: ${dedupeKey}`);
            return;
        }
        state.seenTranscriptions.add(dedupeKey);
        // Clean up old entries to prevent memory growth (keep last 50)
        if (state.seenTranscriptions.size > 50) {
            const firstKey = state.seenTranscriptions.values().next().value;
            state.seenTranscriptions.delete(firstKey);
        }
        // Determine role: local participant = user, remote = agent
        const isLocal = senderIdentity === state.room?.localParticipant?.identity;
        message(isLocal ? "user" : "agent", fullText.trim());
    });
    // Enumerate camera devices after connection
    await enumerateCameraDevices();
} catch (error) { log("error", error.message); cleanup(); } }

function cleanup() {
    if (state.room) {
        state.room.off(RoomEvent.TrackSubscribed, attachTrack);
        state.room.off(RoomEvent.TrackUnsubscribed, detachTrack);
        state.room.off(RoomEvent.DataReceived, dataReceived);
        state.room.off(RoomEvent.Disconnected);
        state.room.off(RoomEvent.ConnectionStateChanged);
        // Note: unregister_text_stream_handler not available in this version
    }
    state.room = null;
    state.mic = false;
    state.camera = false;
    state.cameraDevices = [];
    state.selectedCameraId = null;
    ui.stage.classList.remove("camera-on");
    ui.localVideo.srcObject = null;
    $("remoteMedia").replaceChildren();
    document.querySelectorAll("[data-remote-audio]").forEach((node) => node.remove());
    ui.roomName.textContent = "اضغط «بدء جلسة JARVIS»";
    connected(false);
}
async function enumerateCameraDevices() {
    if (!state.room) return;
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        state.cameraDevices = videoDevices;
        log("debug", `Found ${videoDevices.length} camera device(s)`);
        videoDevices.forEach(d => log("debug", `Camera: ${d.label || d.deviceId}`));
        // Populate select dropdown
        if (ui.cameraSelect) {
            ui.cameraSelect.innerHTML = videoDevices.map(d => `<option value="${d.deviceId}">${d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>`).join("");
            if (videoDevices.length > 0) {
                state.selectedCameraId = videoDevices[0].deviceId;
                ui.cameraSelect.value = state.selectedCameraId;
            }
        }
    } catch (e) {
        log("error", `enumerateDevices: ${e.message}`);
    }
}
async function disconnect() { if (state.room) await state.room.disconnect(); cleanup(); }
async function toggleMic(force) { if (!state.room) return; state.mic = typeof force === "boolean" ? force : !state.mic; await state.room.localParticipant.setMicrophoneEnabled(state.mic); ui.mic.textContent = state.mic ? "🎙️ الميكروفون يعمل" : "🎙️ الميكروفون متوقف"; log("voice", state.mic ? "microphone enabled" : "microphone muted"); }
async function toggleCamera() { if (!state.room) return; state.camera = !state.camera; try { if (state.camera) { // Enable camera with selected device
        const deviceId = state.selectedCameraId;
        const constraints = deviceId ? { video: { deviceId: { exact: deviceId } } } : { video: true };
        await state.room.localParticipant.setCameraEnabled(true, constraints);
        log("video", `camera enabled${deviceId ? ` (${deviceId})` : ""}`);
    } else {
        await state.room.localParticipant.setCameraEnabled(false);
        log("video", "camera disabled");
    }
    state.camera = state.room.localParticipant.cameraEnabled;
    const publication = [...state.room.localParticipant.videoTrackPublications.values()].find(p => p.source === Track.Source.Camera);
    const track = publication?.videoTrack;
    if (track) {
        ui.localVideo.srcObject = new MediaStream([track.mediaStreamTrack]);
    }
    ui.stage.classList.toggle("camera-on", state.camera);
    ui.camera.textContent = state.camera ? "📷 إيقاف الكاميرا" : "📷 الكاميرا";
} catch (e) { log("error", `toggleCamera: ${e.message}`); state.camera = false; ui.camera.textContent = "📷 الكاميرا"; ui.stage.classList.remove("camera-on"); } }
async function sendText(event) { event?.preventDefault(); const text = ui.prompt.value.trim(); if (!text) return; if (!state.room || state.room.state !== ConnectionState.Connected) { await connect(); if (!state.room || state.room.state !== ConnectionState.Connected) return; } const output = state.command ? `${state.command} ${text}` : text; arm(""); ui.prompt.value = ""; message("user", output); await state.room.localParticipant.sendText(output, { topic: "lk.chat" }); log("chat", "text sent to Gemini Live"); }
async function decide(decision) { const pending = state.pending; if (!pending) return; try { const response = await fetch("/api/approval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run_id: pending.run_id, decision }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.detail || "تعذر إرسال القرار"); log("approval", `${decision} sent`); } catch (error) { log("error", error.message); } finally { state.pending = null; ui.approval.close(); } }

document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", () => arm(button.dataset.command)));
document.querySelectorAll("[data-collapse]").forEach((button) => button.addEventListener("click", () => { const panel = $(button.dataset.collapse); panel.classList.toggle("collapsed"); button.textContent = panel.classList.contains("collapsed") ? "+" : "−"; }));
ui.connect.addEventListener("click", () => void connect()); ui.disconnect.addEventListener("click", () => void disconnect()); ui.mic.addEventListener("click", () => void toggleMic()); ui.camera.addEventListener("click", () => void toggleCamera()); $("chatForm").addEventListener("submit", (event) => void sendText(event)); $("approve").addEventListener("click", () => void decide("once")); $("deny").addEventListener("click", () => void decide("deny"));
// Camera device selection
if (ui.cameraSelect) {
    ui.cameraSelect.addEventListener("change", async () => {
        state.selectedCameraId = ui.cameraSelect.value;
        log("debug", `Selected camera: ${state.selectedCameraId}`);
        // If camera is already on, restart with new device
        if (state.camera && state.room) {
            await state.room.localParticipant.setCameraEnabled(false);
            await state.room.localParticipant.setCameraEnabled(true, { video: { deviceId: { exact: state.selectedCameraId } } });
            const publication = [...state.room.localParticipant.videoTrackPublications.values()].find(p => p.source === Track.Source.Camera);
            const track = publication?.videoTrack;
            if (track) ui.localVideo.srcObject = new MediaStream([track.mediaStreamTrack]);
        }
    });
}
void refreshStatus(); setInterval(() => void refreshStatus(), 30000);