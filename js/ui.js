const joinSection = document.getElementById('joinSection');
import { t } from './i18n.js';
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
    receiverBars.forEach(b => {
        b.style.opacity = '1';
        b.style.animationPlayState = 'running';
    });

    // Initialize Output Devices
    const select = document.getElementById('audioOutputSelect');
    if (select) {
        // Clear all except the first placeholder if it's "default"
        select.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = 'default';
        defaultOpt.text = t('default_device');
        select.appendChild(defaultOpt);

        try {
            const devices = await Audio.getOutputDevices();
            const seenIds = new Set(['default']);

            const physical = [];
            const virtual = [];

            devices.forEach(device => {
                if (!device.deviceId || seenIds.has(device.deviceId)) return;
                seenIds.add(device.deviceId);

                const label = device.label || `${t('output_device')} ${device.deviceId.slice(0, 5)}...`;
                const isVirtual = label.toLowerCase().includes('cable') ||
                    label.toLowerCase().includes('virtual') ||
                    label.toLowerCase().includes('vac') ||
                    label.toLowerCase().includes('monitor');

                if (isVirtual) {
                    virtual.push({ id: device.deviceId, label });
                } else {
                    physical.push({ id: device.deviceId, label });
                }
            });

            const addGroup = (label, list) => {
                if (list.length === 0) return;
                const group = document.createElement('optgroup');
                group.label = label;
                list.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.text = item.label;
                    group.appendChild(option);
                });
                select.appendChild(group);
            };

            addGroup(t('speaker_group'), physical);
            addGroup(t('virtual_group'), virtual);

        } catch (err) {
            console.error('Failed to populate device list:', err);
        }

        select.onchange = async () => {
            const success = await Audio.setOutputDevice('remoteAudio', select.value);
            if (!success && select.value !== 'default') {
                alert(t('alert_no_output_support'));
                select.value = 'default';
            }
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
    pauseBtn.textContent = isPaused ? t('resume_unmute') : t('pause_mute');
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