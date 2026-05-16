# 🌐 ThreatNest 

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Framer_Motion-black?style=for-the-badge&logo=framer&logoColor=blue" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
</div>

<br />

**ThreatNest** is a high-performance, cyberpunk-themed Cloud-Based IoT Incident Response System. Designed with a deep, dark glassmorphism aesthetic, CRT scanlines, and 3D hover interactions, it serves as a command-center dashboard for visualizing live IoT hardware telemetry, detecting anomalies, and isolating compromised physical devices on a network in real-time.

---

## ✨ Features

*   **Real-Time Live Monitor:** Watch network telemetry stream instantly via websockets. Contains an interactive feed that flashes and glitches when critical hardware threats are detected.
*   **Cyber-Brutalist Aesthetic:** Heavy visual effects including global CRT scanline overlays, mouse-tracking spotlight cards, staggered Framer Motion 3D reveals, and a canvas-generated particle network background.
*   **Device Management:** List, track, and instantly "block/isolate" physical IoT devices remotely using integrated REST endpoints.
*   **Incident Resolution:** Respond to malware signatures, port scans, and DDoS events directly from the UI with real-time syncing.
*   **Dual-Mode Operation:** Run the dashboard completely offline using the built-in React simulator, or connect it to real hardware via the included Node.js bridge backend.

---

## 🛠️ Architecture

This repository contains two parts:
1.  **React Frontend Dashboard (`src/`)**: The main User Interface.
2.  **Node.js Backend Bridge (`iot-backend/`)**: An Express & Socket.io server capable of receiving HTTP payloads from real hardware (Raspberry Pi, ESP32, SCADA systems) and pushing it to the UI.

---

## 🚀 Quick Start (Simulation Mode)

Want to see the dashboard light up with fake cyber-attacks immediately?

### 1. Start the Backend API & Websocket Server
```bash
cd iot-backend
npm install
node server.js
```

### 2. Start the IoT Threat Simulator
*In a new terminal window:*
```bash
cd iot-backend
node IotSimulator.js
```
*(This script will continuously pump fake telemetry data and trigger random DDoS/Malware threats).*

### 3. Start the React Dashboard
*In a new terminal window:*
```bash
npm install
npm run dev
```
Open `http://localhost:5173`. You can log in using **any** email and password.

---

## 🔌 Connecting REAL IoT Hardware

To use ThreatNest with real physical hardware, stop the `IotSimulator.js` script. Then, have your real hardware (e.g., Python on a Raspberry Pi or C++ on an Arduino) send standard `POST` requests to your Node backend:

**Send Live Telemetry (Sensor readings, CPU, Packets):**
```http
POST http://localhost:5001/api/simulate/telemetry
Content-Type: application/json

{
    "timestamp": 1715850000000,
    "cpuUsage": 45.2,
    "packets": 1200
}
```

**Trigger an Attack/Incident Alert:**
```http
POST http://localhost:5001/api/simulate/threat
Content-Type: application/json

{
    "type": "Unauthorized SSH Access",
    "severity": "critical",
    "deviceId": "rpi-cam-01",
    "deviceName": "Warehouse Camera",
    "packetsPerSecond": 15000
}
```

*The backend will instantly catch your hardware's POST request and broadcast it to the React Dashboard over WebSockets, bringing your hardware data to life instantly.*

---

## 📁 Project Structure

```text
EDI-4/
├── iot-backend/            # The Node.js Express/Socket server 
│   ├── server.js           # Main backend API
│   └── IotSimulator.js     # Generates fake telemetry data
├── src/                    
│   ├── components/         # Reusable React components (UI, Dashboard, Analytics)
│   ├── constants/          # Static routes, severities, colors
│   ├── context/            # Global Auth & App State
│   ├── hooks/              # Custom React Hooks (e.g. useWebSocket)
│   ├── pages/              # Primary Dashboard Views
│   └── services/           # Axios API integrations
└── .env                    # Configures VITE_API_URL and VITE_WS_URL
```

---

## 🎨 Modifying Themes

The custom cyberpunk animations (flicker, glitch, CRT scanlines, 3D cards) are largely controlled by:
*   `src/index.css` (Contains `@keyframes` for glitches and scanlines)
*   `src/components/layout/PageContainer.jsx` (Houses the global Particle background and CRT overlays)
*   `src/components/ui/Card.jsx` (Controls the Framer Motion mouse-tracking spotlight effects)

---
*Built for advanced IoT Security Monitoring & Response.*
