import * as Signaling from './signaling.js';
import * as Peer from './peer.js';
import * as Audio from './audio.js';
import * as UI from './ui.js';
import * as Recording from './recording.js';

const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const roleSenderBtn = document.getElementById('roleSenderBtn');
const roleReceiverBtn = document.getElementById('roleReceiverBtn');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const hangupBtn = document.getElementById('hangupBtn');
const receiverHangupBtn = document.getElementById('receiverHangupBtn');
const qualitySelect = document.getElementById('qualitySelect');
const remoteAudio = document.getElementById('remoteAudio');
const volumeSlider = document.getElementById('volumeSlider');

let isSender = false;
let currentSender = null;
let localStream = null;

// 0. Auto-Discovery Logic
function setupDiscovery() {
    Signaling.connect('', {
        onRoomsList: (rooms) => {
            const listEl = document.getElementById('roomList');
            const sectionEl = document.getElementById('roomListSection');
            listEl.innerHTML = '';

            if (rooms && rooms.length > 0) {
                sectionEl.classList.remove('hidden');
                rooms.forEach(r => {
                    if (r.count === 0) return; // Skip empty rooms?
                    const div = document.createElement('div');
                    div.className = 'room-item';
                    div.innerHTML = `<span class="room-name">${r.id}</span><span class="room-count">👥 ${r.count} 人在线</span>`;
                    div.onclick = () => {
                        roomIdInput.value = r.id;
                        joinBtn.click();
                    };
                    listEl.appendChild(div);
                });
            } else {
                sectionEl.classList.add('hidden');
            }
        }
    });
}

// 0. Auto-Discovery on Load
window.addEventListener('load', () => {
    setupDiscovery();

    // Periodic Refresh for Room List
    setInterval(() => {
        const joinSection = document.getElementById('joinSection');
        if (joinSection && !joinSection.classList.contains('hidden')) {
            Signaling.getRooms();
        }
    }, 5000);

    // Audio Settings Listeners
    ['echoCancellation', 'noiseSuppression', 'autoGainControl'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.onchange = () => {
                const constraints = {
                    echoCancellation: document.getElementById('echoCancellation').checked,
                    noiseSuppression: document.getElementById('noiseSuppression').checked,
                    autoGainControl: document.getElementById('autoGainControl').checked
                };
                // If currently capturing, restart stream?
                // Audio.js needs to handle this. For now just log or call update.
                console.log('Audio settings changed:', constraints);
                if (isSender) {
                    // Ideally modify track constraints without efficient restart
                    // Or restart stream
                    // For v1.5 MVP, requires restarting "Start Send" often, but let's try to update if active
                    const track = Audio.getLocalStream()?.getAudioTracks()[0];
                    if (track) {
                        track.applyConstraints(constraints).catch(e => console.warn('Apply constraints failed:', e));
                    }
                }
            };
        }
    });
});

// 1. Join Room
joinBtn.onclick = () => {
    const roomId = roomIdInput.value.trim();
    if (!roomId) return alert('请输入房间 ID');

    UI.setStatus('正在连接服务器...');
    joinBtn.disabled = true;

    Signaling.connect(roomId, {
        onJoined: async (peerCount) => {
            // Manual Role Selection
            UI.showRoleSelection();
            UI.setStatus('连接成功，请选择模式');
        },
        onHello: async () => {
            // If we are sender and confirmed, we send offer
            if (isSender) {
                console.log('Receiver said hello. Starting connection...');
                UI.setStatus('有接收端加入，正在建立连接...');
                startConnection();
            }
        },
        onOffer: async (offer) => {
            if (isSender) return; // Sender shouldn't receive offers usually
            console.log('Received Offer');

            // Close existing PC if any (Issue 6)
            const existingPc = Peer.getPeerConnection();
            if (existingPc) {
                Peer.closeConnection();
            }

            const pc = Peer.createPeerConnection(
                (ice) => Signaling.send({ type: 'ice', ice }),
                (stream) => {
                    console.log('Got remote stream, attempting to play...');
                    UI.setStatus('接收到音频流，准备播放...');

                    remoteAudio.srcObject = stream;

                    let retryCount = 0;
                    const maxRetries = 3;

                    const attemptPlay = () => {
                        remoteAudio.play()
                            .then(() => {
                                console.log('Playback started successfully');
                                UI.setStatus('正在播放音频');
                            })
                            .catch(e => {
                                if (e.name === 'AbortError') {
                                    retryCount++;
                                    console.warn(`Playback aborted, retry ${retryCount}/${maxRetries}...`);
                                    if (retryCount < maxRetries) {
                                        // Wait a bit and retry
                                        setTimeout(attemptPlay, 150);
                                    } else {
                                        console.error('Max retries reached, showing manual play prompt');
                                        showManualPlayPrompt();
                                    }
                                    return;
                                }
                                console.error('Playback failed:', e);
                                showManualPlayPrompt();
                            });
                    };

                    const showManualPlayPrompt = () => {
                        // Avoid duplicates
                        if (document.getElementById('playOverlay')) return;

                        UI.setStatus('自动播放失败，请点击页面任意位置开始收听');

                        const overlay = document.createElement('div');
                        overlay.id = 'playOverlay';
                        overlay.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;';
                        overlay.innerHTML = '<div style="background:#1e293b;padding:20px;border-radius:12px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:1px solid #334155;"><h2 style="color:white;margin-bottom:15px;">点击开始收听</h2><p style="color:#94a3b8;">由于浏览器限制，需要您手动开启音频。</p></div>';
                        document.body.appendChild(overlay);

                        overlay.addEventListener('click', () => {
                            remoteAudio.play().then(() => {
                                UI.setStatus('正在播放音频');
                                document.body.removeChild(overlay);
                            }).catch(err => {
                                console.error('Manual play failed:', err);
                                UI.setStatus('播放失败: ' + err.message);
                            });
                        }, { once: true });
                    };

                    attemptPlay();
                }
            );

            // Set Remote Description
            await pc.setRemoteDescription(offer);

            // Process queued candidates
            while (iceQueue.length > 0) {
                const candidate = iceQueue.shift();
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            Signaling.send({ type: 'answer', answer });
            UI.setStatus('正在接收音频...');
        },
        onAnswer: async (answer) => {
            if (!isSender) return;
            const pc = Peer.getPeerConnection();
            if (pc && pc.signalingState === 'have-local-offer') {
                console.log('Received Answer, setting remote description');
                await pc.setRemoteDescription(answer);
                UI.setStatus('连接成功，正在发送音频');
            } else {
                console.warn('Received Answer but PC is in wrong state:', pc?.signalingState);
            }
        },
        onIce: async (ice) => {
            const pc = Peer.getPeerConnection();
            if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(ice));
            } else {
                iceQueue.push(ice);
            }
        },
        onError: (err) => {
            alert('连接错误: ' + err);
            joinBtn.disabled = false;
            UI.setStatus('连接错误');
        }
    });
};

const iceQueue = [];

// 2. Start Sending (Manual Trigger or Auto after hello)
// We split "Start Sending" button to meaningful action: "Unmute/Start Mic"
// The actual WebRTC connection starts automatically when receiver joins if we are already ready?
// Let's make "Start Sending" explicit for Audio Permission reasons.

async function startConnection() {
    // Ensure we have a PC
    let pc = Peer.getPeerConnection();
    if (!pc) {
        pc = Peer.createPeerConnection(
            (ice) => Signaling.send({ type: 'ice', ice }),
            (stream) => { /* Sender doesn't handle remote stream usually */ }
        );
    }

    // Start Audio and add tracks
    try {
        const constraints = {
            echoCancellation: document.getElementById('echoCancellation').checked,
            noiseSuppression: document.getElementById('noiseSuppression').checked,
            autoGainControl: document.getElementById('autoGainControl').checked
        };
        localStream = await Audio.startAudioStream(constraints);

        // Add track to PeerConnection
        localStream.getAudioTracks().forEach(track => {
            currentSender = Peer.addTrack(track, localStream);
        });

        // Issue 2 fix: Set sender in audio.js for quality control
        Audio.setSender(currentSender);

        UI.toggleStartButton(true);

        // Create Offer (Issue 4: Must setLocalDescription before sending)
        UI.setStatus('正在创建连接 (Offer)...');
        const offer = await Peer.createOffer();
        await Peer.setLocalDescription(offer);
        Signaling.send({ type: 'offer', offer });

        // Start Visualizer
        UI.startVisualizer(localStream, 'audioVisualizer');

    } catch (err) {
        console.error('Start failed:', err);
        UI.setStatus('无法获取麦克风权限: ' + err.message);
    }
}

// Button actions
startBtn.onclick = () => {
    // In this flow, we might want to just start the stream, 
    // but we can't offer if there is no one. 
    // But if we clicked this, we assume we are ready.
    // If receiver is already there, we send offer.
    // If receiver is NOT there, we just ready the mic?

    // Let's just force startConnection logic (it handles Offer creation)
    startConnection();
};

pauseBtn.onclick = () => {
    // Issue 1: Only call togglePause once
    const isTransmitting = Audio.togglePause();
    UI.updatePauseButton(!isTransmitting);
    UI.setStatus(isTransmitting ? '正在发送音频' : '已暂停发送');
};

qualitySelect.onchange = () => {
    Audio.setAudioQuality(qualitySelect.value);
};

function hangup() {
    Signaling.leave();
    Audio.stopAudio();
    Peer.closeConnection();
    UI.stopVisualizer();
    UI.hideAll();
    UI.toggleStartButton(false); // Reset start/pause buttons

    // Issue 3: Remove playOverlay if exists
    const overlay = document.getElementById('playOverlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }

    // Reset state
    isSender = false;
    currentSender = null;
    localStream = null;
    iceQueue.length = 0; // Clear the ice queue

    joinBtn.disabled = false;
    UI.setStatus('已断开连接');

    // Re-connect signaling for browsing (wait a bit or just show list)
    // For simplicity, reload or just reset UI
    document.getElementById('roleSection').classList.add('hidden');
    document.getElementById('joinSection').classList.remove('hidden');

    // Update rooms list again
    setupDiscovery();
}
hangupBtn.onclick = hangup;
receiverHangupBtn.onclick = hangup;

// Role Selection Handlers
roleSenderBtn.onclick = () => {
    isSender = true;
    UI.showSender();
    UI.setStatus('你是发送端，点击“开始发送”共享麦克风');
    // If there might be receivers waiting, we could announce, but standard flow waits for Hello or manual Start
};

roleReceiverBtn.onclick = () => {
    isSender = false;
    UI.showReceiver();
    UI.setStatus('你是接收端，等待音频...');
    Signaling.send({ type: 'hello' });
}

// Volume Control
if (volumeSlider) {
    volumeSlider.oninput = (e) => {
        if (remoteAudio) {
            remoteAudio.volume = e.target.value;
        }
    };
}

// Recording Controls
const senderRecordBtn = document.getElementById('senderRecordBtn');
const senderRecordTimer = document.getElementById('senderRecordTimer');
const receiverRecordBtn = document.getElementById('receiverRecordBtn');
const receiverRecordTimer = document.getElementById('receiverRecordTimer');

let receiverRecordingStream = null;

function setupRecordingButton(btn, timerEl, getStream, filenamePrefix) {
    if (!btn) return;

    btn.onclick = async () => {
        if (Recording.isRecording()) {
            // Stop recording
            const blob = await Recording.stopRecording();
            btn.textContent = '🔴 开始录音';
            btn.classList.remove('recording');
            timerEl.classList.add('hidden');

            if (blob) {
                Recording.downloadRecording(blob, filenamePrefix);
                UI.setStatus('录音已保存');
            }
        } else {
            // Start recording
            const stream = getStream();
            if (!stream) {
                UI.setStatus('没有可录制的音频流');
                return;
            }

            const started = Recording.startRecording(stream, (time) => {
                timerEl.textContent = time;
            });

            if (started) {
                btn.textContent = '⏹️ 停止录音';
                btn.classList.add('recording');
                timerEl.classList.remove('hidden');
                UI.setStatus('正在录音...');
            }
        }
    };
}

// Sender recording (records local microphone)
setupRecordingButton(
    senderRecordBtn,
    senderRecordTimer,
    () => Audio.getLocalStream(),
    'sender_recording'
);

// Receiver recording (records remote audio)
setupRecordingButton(
    receiverRecordBtn,
    receiverRecordTimer,
    () => {
        // Create a stream from the audio element if needed
        if (remoteAudio && remoteAudio.srcObject) {
            return remoteAudio.srcObject;
        }
        return null;
    },
    'receiver_recording'
);