# 🎙️ 麦克疯 (WebRTC Audio PWA)

[English](#english) | [中文](#chinese)

<a name="english"></a>
## English Description

Simple, high-quality real-time audio sharing Progressive Web App (PWA). Turn your device into a microphone station or a receiver speaker instantly.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.6.0-green.svg)

### ✨ Features

- **Real-time Audio Streaming**: Low-latency audio transmission using WebRTC.
- **Role-based Architecture**:
  - **Broadcaster (Sender)**: Share your microphone with audio optimizations (AEC, Noise Suppression, AGC).
  - **Listener (Receiver)**: Listen to the broadcast with volume control.
- **Recording Support**:
  - Record your own voice (Sender side).
  - Record received audio (Receiver side).
  - Auto-save recordings as WebM files.
- **Modern UI**:
  - Facebook-inspired clean layout.
  - Microsoft Fluent Design style controls.
  - Dark/Light mode support (Manual toggle & System preference).
  - Responsive design for mobile and desktop.
- **PWA Ready**: Installable on mobile and desktop devices.
- **Room Management**: Join specific rooms or discover active nearby rooms.

### 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3 (CSS Variables for theming).
- **Backend (Signaling)**: Node.js, Express, WebSocket (`ws`).
- **Protocols**: WebRTC (P2P Audio), WebSocket (Signaling).
- **Containerization**: Docker & Docker Compose.

### 🚀 Getting Started

#### Prerequisites

- Node.js (v14+ recommended)
- NPM or Yarn

#### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/webrtc-audio-pwa.git
   cd webrtc-audio-pwa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Server will start at `http://localhost:3000`.

#### Using Docker

You can also run the application using Docker:

```bash
docker-compose up --build
```

### 📖 Usage Guide

1. **Open the App**: Navigate to `http://localhost:3000` (or your deployed URL).
   - **Note**: For devices other than localhost, you must use **HTTPS** for microphone access.
2. **Join a Room**: Enter a Room ID (default: used `default`) or select an active room from the list.
3. **Select Role**:
   - Click **Broadcast Mode** to start sending audio.
   - Click **Listen Mode** to start receiving audio.
4. **Theme**: Toggle between Light/Dark mode using the moon/sun icon in the top right.

### 📱 Mobile Support

This project is a PWA. On mobile devices (Android/iOS), you can "Add to Home Screen" to install it as a standalone app.

---

<a name="chinese"></a>
## 中文说明

简单、高质量的实时音频分享 PWA 应用。瞬间将您的设备变身为麦克风基站或接收扬声器。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.6.0-green.svg)

### ✨ 功能特点

- **实时音频流**: 基于 WebRTC 的超低延迟音频传输。
- **角色架构**:
  - **广播者 (发送端)**: 分享麦克风音频，支持回声消除 (AEC)、降噪 (NS) 和自动增益 (AGC)。
  - **听众 (接收端)**: 实时收听广播，支持音量调节。
- **录音支持**:
  - 发送端可录制本地麦克风。
  - 接收端可录制收听到的音频。
  - 录音自动保存为 WebM 格式文件。
- **现代 UI 设计**:
  - Facebook 风格的清爽卡片布局。
  - 微软 Fluent Design 风格的交互控件。
  - 支持深色/浅色模式（可手动切换，也可跟随系统）。
  - 完美适配移动端和桌面端。
- **PWA 支持**: 可作为原生应用安装到手机或电脑桌面。
- **房间管理**: 支持加入指定房间 ID，或自动发现附近的活跃房间。

### 🛠️ 技术栈

- **前端**: 原生 JavaScript (ES Modules), HTML5, CSS3 (使用 CSS 变量换肤).
- **后端 (信令)**: Node.js, Express, WebSocket (`ws`).
- **协议**: WebRTC (P2P 音频传输), WebSocket (信令交换).
- **容器化**: Docker & Docker Compose.

### 🚀 快速开始

#### 环境要求

- Node.js (建议 v14+)
- NPM 或 Yarn

#### 安装步骤

1. 克隆代码仓库:
   ```bash
   git clone https://github.com/your-username/webrtc-audio-pwa.git
   cd webrtc-audio-pwa
   ```

2. 安装依赖:
   ```bash
   npm install
   ```

3. 启动开发服务器:
   ```bash
   npm run dev
   ```
   服务器将在 `http://localhost:3000` 启动。

#### 使用 Docker

您也可以使用 Docker 直接运行:

```bash
docker-compose up --build
```

### 📖 使用指南

1. **打开应用**: 访问 `http://localhost:3000` (或部署后的 URL)。
   - **注意**: 如果在非本机 (localhost) 设备上使用，必须通过 **HTTPS** 访问以获取麦克风权限。
2. **加入房间**: 输入房间 ID (默认为 `default`)，或从下方列表中点击活跃房间加入。
3. **选择角色**:
   - 点击 **广播模式** 开始发送音频。
   - 点击 **收听模式** 开始接收音频。
4. **主题切换**: 点击右上角的月亮/太阳图标可切换深色/浅色模式。

### 📱 移动端支持

本项目完全支持 PWA。在手机浏览器 (Android Chrome / iOS Safari) 中，点击 "添加到主屏幕" 即可像原生 App 一样全屏运行。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进这个项目！

## 📄 许可证

本项目基于 MIT 许可证开源 - 详见 LICENSE 文件。
