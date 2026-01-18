const translations = {
    zh: {
        app_title: "🎙️ 麦克疯",
        join_room_title: "加入房间",
        join_room_subtitle: "输入房间名开始实时音频通话",
        room_id: "房间 ID",
        room_placeholder: "输入房间名...",
        join_btn: "🚀 加入房间",
        status_ready: "准备就绪",
        nearby_rooms: "🏠 附近房间",
        select_mode_title: "选择模式",
        select_mode_subtitle: "选择你在通话中的角色",
        broadcast_mode: "广播模式",
        broadcast_desc: "分享你的麦克风",
        listen_mode: "收听模式",
        listen_desc: "接收音频播放",
        sender_title: "🎙️ 广播模式",
        sender_subtitle: "正在分享你的麦克风",
        audio_mode: "🎧 音频模式",
        speech_mode: "🗣️ 人声模式 (会议/聊天)",
        music_mode: "🎵 音乐模式 (高保真)",
        audio_opt: "🛡️ 音频优化",
        echo_cancel: "回声消除",
        noise_supp: "噪声抑制",
        auto_gain: "自动增益",
        audio_source: "🔊 音频源",
        add_system_audio: "🖥️ 添加系统声音 (共享屏幕/标签页)",
        start_sending: "📡 开始发送",
        pause_mute: "⏸️ 暂停 (Mute)",
        resume_unmute: "▶️ 恢复 (Resume)",
        start_recording: "🔴 开始录音",
        stop_recording: "⏹️ 停止录音",
        end_call: "❌ 结束通话",
        receiver_title: "🎧 收听模式",
        receiver_subtitle: "正在接收音频",
        output_device: "🔊 输出设备",
        default_device: "默认设备",
        speaker_group: "🔈 扬声器 (Speakers)",
        virtual_group: "🎤 虚拟麦克风 (Virtual Cables)",
        volume_control: "🔊 音量调节",
        disconnect: "❌ 断开连接",
        switch_lang: "🌐 ZH",
        alert_no_output_support: "无法切换输出设备 (可能不支持或权限不足)",
        visual_virt: "💡 [虚似] ",
        recording_started: "🔴 录音中",
        status_connecting: "正在连接...",
        status_connected: "已连接",
        status_disconnected: "已断开",
        status_error: "连接失败"
    },
    en: {
        app_title: "🎙️ MicF",
        join_room_title: "Join Room",
        join_room_subtitle: "Enter room name to start real-time audio",
        room_id: "Room ID",
        room_placeholder: "Enter room name...",
        join_btn: "🚀 Join Room",
        status_ready: "Ready",
        nearby_rooms: "🏠 Nearby Rooms",
        select_mode_title: "Select Mode",
        select_mode_subtitle: "Choose your role in the call",
        broadcast_mode: "Broadcast Mode",
        broadcast_desc: "Share your microphone",
        listen_mode: "Listen Mode",
        listen_desc: "Receive audio playback",
        sender_title: "🎙️ Broadcast Mode",
        sender_subtitle: "Sharing your microphone",
        audio_mode: "🎧 Audio Mode",
        speech_mode: "🗣️ Speech Mode (Chat/Meeting)",
        music_mode: "🎵 Music Mode (High Fidelity)",
        audio_opt: "🛡️ Audio Optimization",
        echo_cancel: "Echo Cancellation",
        noise_supp: "Noise Suppression",
        auto_gain: "Auto Gain Control",
        audio_source: "🔊 Audio Source",
        add_system_audio: "🖥️ Add System Audio (Screen/Tab)",
        start_sending: "📡 Start Sending",
        pause_mute: "⏸️ Mute",
        resume_unmute: "▶️ Unmute",
        start_recording: "🔴 Start Recording",
        stop_recording: "⏹️ Stop Recording",
        end_call: "❌ End Call",
        receiver_title: "🎧 Listen Mode",
        receiver_subtitle: "Receiving audio",
        output_device: "🔊 Output Device",
        default_device: "Default Device",
        speaker_group: "🔈 Speakers",
        virtual_group: "🎤 Virtual Microphones",
        volume_control: "🔊 Volume",
        disconnect: "❌ Disconnect",
        switch_lang: "🌐 EN",
        alert_no_output_support: "Cannot switch output device (Unsupported or no permission)",
        visual_virt: "💡 [Virtual] ",
        recording_started: "🔴 Recording",
        status_connecting: "Connecting...",
        status_connected: "Connected",
        status_disconnected: "Disconnected",
        status_error: "Connection Failed"
    }
};

let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');

export function t(key) {
    return translations[currentLang][key] || key;
}

export function getCurrentLang() {
    return currentLang;
}

export function setLang(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('lang', lang);
        applyTranslations();
        return true;
    }
    return false;
}

export function toggleLang() {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    setLang(newLang);
    return newLang;
}

export function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        if (translation) {
            // Special handling for elements with children (like buttons with spans)
            const iconSpan = el.querySelector('span');
            if (iconSpan) {
                // Preserving the icon span and updating the text node
                // Find the first text node child
                let textNodeFound = false;
                el.childNodes.forEach(node => {
                    if (node.nodeType === 3 && node.textContent.trim().length > 0 && !textNodeFound) {
                        // Translation key usually includes emoji, if index.html already has span icon, 
                        // we might want just the text part or replace entirely.
                        // Actually, the keys like join_btn include the emoji: "🚀 Join Room"
                        // If index.html has <span>🚀</span>, we should probably just update the text part.
                        // But let's simplify: if it has data-i18n, replace WHOLE content but keep span if we can.
                    }
                });
                // Simple approach: reset innerHTML but keep span if it was there
                const emoji = iconSpan.textContent;
                el.innerHTML = `<span>${emoji}</span> ${translation.replace(/^[^\s]+\s/, '')}`;
            } else {
                el.textContent = translation;
            }
        }
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    // Update switcher dropdown active state
    document.querySelectorAll('.lang-option').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-lang') === currentLang);
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', applyTranslations);
