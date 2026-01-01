const joinSection = document.getElementById('joinSection');
const roleSection = document.getElementById('roleSection');
const senderSection = document.getElementById('senderSection');
const receiverSection = document.getElementById('receiverSection');
const statusEl = document.getElementById('status');
const pauseBtn = document.getElementById('pauseBtn');

let audioContext;
let analyser;
let dataArray;
let animationId;
let source;

export function startVisualizer(stream, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Ensure context is running (sometimes needed on mobile/safari)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const draw = () => {
        animationId = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        // Use computed style color or default blue
        canvasCtx.fillStyle = '#2563eb';

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 255 * height;

            // Draw rounded bars (simple rects for now)
            canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
            if (x > width) break;
        }
    };

    draw();
}

export function stopVisualizer() {
    if (animationId) cancelAnimationFrame(animationId);
    if (source) {
        source.disconnect();
        source = null;
    }
    // Don't close AudioContext to reuse, or close if we want full cleanup. Reusing is better.
}

export function setStatus(text) {
    statusEl.textContent = text;
}

export function showRoleSelection() {
    joinSection.classList.add('hidden');
    roleSection.classList.remove('hidden');
    senderSection.classList.add('hidden');
    receiverSection.classList.add('hidden');
}

const sourceListEl = document.getElementById('sourceList');

export function updateSourceList(sources, removeCallback) {
    if (!sourceListEl) return;
    sourceListEl.innerHTML = '';

    sources.forEach(src => {
        const item = document.createElement('div');
        item.className = 'source-item';

        const label = document.createElement('span');
        label.textContent = (src.type === 'mic' ? '🎤 ' : '💻 ') + (src.label || src.type);
        item.appendChild(label);

        if (src.type !== 'mic') {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'source-remove-btn';
            removeBtn.title = '移除';
            removeBtn.innerHTML = '✕'; // Using a cleaner X symbol
            removeBtn.onclick = () => removeCallback(src.id);
            item.appendChild(removeBtn);
        }

        sourceListEl.appendChild(item);
    });
}

export function showSender() {
    joinSection.classList.add('hidden');
    roleSection.classList.add('hidden');
    senderSection.classList.remove('hidden');
    receiverSection.classList.add('hidden');

    // Initial update of source list if needed, or Main.js will trigger it
}

import * as Audio from './audio.js';

// ... (existing code)

export async function showReceiver() {
    joinSection.classList.add('hidden');
    roleSection.classList.add('hidden');
    senderSection.classList.add('hidden');
    receiverSection.classList.remove('hidden');

    // Enable visualizer for receiver
    const receiverBars = document.querySelectorAll('#receiverSection .bar');
    receiverBars.forEach(b => b.style.opacity = '1');
    receiverBars.forEach(b => b.style.animationPlayState = 'running');

    // Initialize Output Devices
    const select = document.getElementById('audioOutputSelect');
    if (select) {
        select.innerHTML = '<option value="default">默认设备</option>'; // Reset
        const devices = await Audio.getOutputDevices();
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Output ${device.deviceId.slice(0, 5)}...`;
            select.appendChild(option);
        });

        select.onchange = () => {
            Audio.setOutputDevice('remoteAudio', select.value);
        };
    }
}

export function hideAll() {
    joinSection.classList.remove('hidden'); // Go back to join screen usually
    roleSection.classList.add('hidden');
    senderSection.classList.add('hidden');
    receiverSection.classList.add('hidden');
}

export function updatePauseButton(isPaused) {
    pauseBtn.textContent = isPaused ? '▶️ 恢复 (Resume)' : '⏸️ 暂停 (Mute)';
}

export function getQualityText() {
    const select = document.getElementById('qualitySelect');
    return select.selectedOptions[0].text;
}

export function toggleStartButton(sending) {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    if (sending) {
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
    } else {
        startBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
    }
}