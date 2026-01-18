# 🎙️ 部署与打包指南 (Deployment Guide)

这份文档提供了详细的 **麦克疯 (WebRTC Audio PWA)** 部署、打包和生产环境配置指南。

## 📦 1. 打包与发布 (Packaging)

本项目是基于 Node.js 的 Web 应用，"打包"通常指的是准备部署文件。

### 方式 A: 源码打包 (推荐)
最通用的方式是将源码打包为 Zip 文件，然后在目标服务器上解压运行。

**打包步骤**:
1. 确保已安装项目依赖 (`npm install`)。
2. 创建压缩包，**排除** `node_modules` 目录 (因为依赖需要在目标环境重新安装)。
   - Windows (PowerShell):
     ```powershell
     Compress-Archive -Path ./* -DestinationPath webrtc-audio-pwa.zip -Force
     # 注意：手动排除 node_modules 或使用 git archive
     ```
   - Linux/Mac:
     ```bash
     zip -r webrtc-audio-pwa.zip . -x "node_modules/*" ".git/*"
     ```

**部署步骤**:
1. 将 `webrtc-audio-pwa.zip` 上传到服务器。
2. 解压: `unzip webrtc-audio-pwa.zip`.
3. 进入目录: `cd webrtc-audio-pwa`.
4. 安装依赖: `npm install --production`.
5. 启动服务 (见下文 "生产环境运行").

### 方式 B: Docker 镜像
使用 Docker 可以创建可一致运行的容器镜像。

1. 构建镜像 (会自动执行 npm run build):
   ```bash
   docker build -t webrtc-audio-pwa .
   ```
2. 导出镜像 (可选，用于迁移):
   ```bash
   docker save -o webrtc-audio-pwa.tar webrtc-audio-pwa
   ```
3. 运行容器:
   ```bash
   docker run -d -p 3000:3000 webrtc-audio-pwa
   ```

---

## 🚀 2. 生产环境运行 (Running in Production)

### 选项 1: 使用 PM2 (推荐 for Linux/Windows Server)
PM2 是一个 Node.js 进程管理器，支持后台运行、自动重启。

1. 全局安装 PM2:
   ```bash
   npm install -g pm2
   ```
2. 启动应用:
   ```bash
   pm2 start server.js --name "webrtc-audio"
   ```
3. 查看状态:
   ```bash
   pm2 status
   ```

### 选项 2: 直接运行
```bash
npm start
```
*注意：直接运行不适合长期后台服务，建议结合 `nohup` 或系统服务使用。*

---

## 🔒 3. HTTPS 配置 (Critical)

**非常重要**: WebRTC 和 麦克风权限要求在非 localhost 环境下必须使用 **HTTPS**。

### 方案 A: 使用 Nginx 反向代理 (推荐)
这是最标准的做法。Node.js 运行在 HTTP (3000端口)，Nginx 处理 HTTPS 并转发流量。

**Nginx 配置示例**:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 方案 B: Node.js 原生 HTTPS
如果你没有 Nginx，可以直接让 Node.js 服务器处理 HTTPS。

1. 准备 SSL 证书文件: `server.key` (私钥) and `server.crt` (证书).
2. 在项目根目录创建 `certs` 文件夹。
3. 将证书放入 `certs/` 目录。
4. 设置环境变量启动:
   - Linux: `export SSL_KEY=certs/server.key SSL_CERT=certs/server.crt && npm start`
   - Windows: 在 `package.json` 或系统环境变量中配置。

---

## 🛠️ 4. 常见问题 (Troubleshooting)

**Q: 为什么手机上无法打开麦克风？**
A: 检查是否使用了 HTTPS。如果使用 HTTP (例如 `http://192.168.1.5:3000`)，浏览器会出于安全原因拦截麦克风。

**Q: 无法连接服务器 (WebSocket error 1006)?**
A: 
1. 检查服务器防火墙是否开放了端口 (默认 3000)。
2. 确保 `server.js` 正在运行。
3. 如果使用了 Nginx，确保配置了 WebSocket 转发 (`Upgrade` 和 `Connection` 头)。

**Q: 如何修改端口？**
A: 使用环境变量 `PORT`。例如: `set PORT=8080 && npm run dev` (Windows) 或 `PORT=8080 npm run dev` (Linux).
