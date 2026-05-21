#!/usr/bin/env python3
"""
IoT Threat Simulation — Real-Time Demo Script
=============================================
Simulates multiple IoT devices sending telemetry to the backend.
Watch the dashboard at http://localhost:3000 while this runs.

Usage:
    python3 simulate_demo.py           # full automated demo
    python3 simulate_demo.py --quick   # faster pacing (2s between events)
"""

import os
import requests
import time
import sys
import random
from datetime import datetime, timezone

BASE_URL = os.getenv("BACKEND_URL", "https://friendly-elegance-production-0e93.up.railway.app")
QUICK = "--quick" in sys.argv
DELAY = 2 if QUICK else 4  # seconds between events

# ── Colour helpers ────────────────────────────────────────────────────────────
R  = "\033[91m"   # red
Y  = "\033[93m"   # yellow
G  = "\033[92m"   # green
B  = "\033[94m"   # blue
C  = "\033[96m"   # cyan
W  = "\033[97m"   # white
DIM= "\033[2m"
RST= "\033[0m"
BOLD="\033[1m"

def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def log(colour, tag, msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{DIM}[{ts}]{RST} {colour}{BOLD}[{tag}]{RST} {msg}")

def separator(title=""):
    width = 60
    if title:
        pad = (width - len(title) - 2) // 2
        print(f"\n{C}{'─'*pad} {title} {'─'*pad}{RST}\n")
    else:
        print(f"\n{DIM}{'─'*width}{RST}\n")

# ── Backend helpers ───────────────────────────────────────────────────────────
def register_device(name, device_type, ip, location):
    """Register a simulated IoT device. Returns (token, device_uuid)."""
    try:
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": name,
            "type": device_type,
            "ipAddress": ip,
            "location": location,
        }, timeout=5)
        data  = res.json()
        token = data.get("token")
        uuid  = data.get("deviceId") or data.get("device", {}).get("id", name)
        if token:
            log(G, "REGISTER", f"{name} → token acquired (id={uuid[:8]}…)")
            return token, uuid
        else:
            log(R, "REGISTER", f"{name} → {data}")
            return None, name
    except Exception as e:
        log(R, "ERROR", f"Cannot reach backend at {BASE_URL} — is it running? ({e})")
        sys.exit(1)

def send_telemetry(token, device_id, telemetry_type, cpu, ram, packets,
                    login_status=None, auth_header=None, sensor_data=None):
    """Send one telemetry payload and return the parsed response."""
    data = {
        "cpuUsage": cpu,
        "ramUsage": ram,
        "packetFrequency": packets,
    }
    if login_status:
        data["loginStatus"] = login_status
    if auth_header:
        data["authHeader"] = auth_header
    if sensor_data:
        data["sensorData"] = sensor_data

    payload = {
        "deviceId": device_id,
        "timestamp": now(),
        "type": telemetry_type,
        "data": data,
    }
    try:
        res = requests.post(
            f"{BASE_URL}/api/telemetry",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        return res.json()
    except Exception as e:
        log(R, "ERROR", str(e))
        return {}

def check_health():
    try:
        res = requests.get(f"{BASE_URL}/health", timeout=3)
        d = res.json()
        if d.get("status") == "ok":
            log(G, "HEALTH", f"Backend OK  |  DB: {d.get('database')}  |  Uptime: {d.get('uptime', 0):.0f}s")
            return True
        else:
            log(Y, "HEALTH", f"Backend responded but status = {d.get('status')}")
            return False
    except:
        log(R, "HEALTH", f"Backend not reachable at {BASE_URL}")
        return False

# ═══════════════════════════════════════════════════════════════════════════════
# DEMO SCENARIOS
# ═══════════════════════════════════════════════════════════════════════════════

def scenario_normal_heartbeats(tokens, device_names):
    separator("PHASE 1 — Normal Operation")
    log(B, "INFO", "All devices sending healthy heartbeats…")
    log(B, "INFO", f"Open http://localhost:3000 and watch the Dashboard & Devices pages\n")

    for i in range(3):
        for name, token in zip(device_names, tokens):
            cpu = random.randint(15, 35)
            ram = random.randint(20, 45)
            pkt = random.randint(80, 200)
            r = send_telemetry(token, name, "heartbeat", cpu, ram, pkt)
            threats = r.get("threatsDetected", 0)
            threat_icon = f"{G}✓ clean{RST}" if threats == 0 else f"{R}⚠ {threats} threat(s){RST}"
            log(DIM, name[:16].ljust(16), f"CPU {cpu}%  RAM {ram}%  PKT {pkt}  → {threat_icon}")
        print()
        time.sleep(DELAY)


def scenario_brute_force(token, device_name):
    separator("PHASE 2 — Brute Force Attack")
    log(Y, "ATTACK", f"Simulating brute-force login attack on {device_name}")
    log(Y, "ATTACK", "Sending rapid failed login attempts…\n")

    for attempt in range(1, 8):
        r = send_telemetry(token, device_name, "login",
                           cpu=30, ram=40, packets=60,
                           login_status="FAIL")
        threats = r.get("threatsDetected", 0)
        icon = f"{R}🚨 BRUTE FORCE DETECTED{RST}" if threats > 0 else f"{Y}attempt {attempt}/7{RST}"
        log(Y, "LOGIN FAIL", f"Attempt {attempt}  → {icon}")
        if threats > 0:
            incidents = r.get("incidents", [])
            for inc in incidents:
                log(R, "INCIDENT", f"Type: {inc.get('threatType')}  Severity: {inc.get('severity')}  ID: {inc.get('alertId')}")
            log(B, "INFO", "→ Check the Incidents page in the dashboard!")
        time.sleep(1.0 if QUICK else 1.5)


def scenario_ddos(token, device_name):
    separator("PHASE 3 — DDoS Attack")
    log(R, "ATTACK", f"Simulating volumetric DDoS on {device_name}")
    log(R, "ATTACK", "Traffic spike: 99,999 packets/s (10× above baseline)\n")

    for wave in range(1, 4):
        packets = random.randint(50000, 99999)
        cpu = random.randint(85, 99)
        ram = random.randint(80, 95)
        r = send_telemetry(token, device_name, "traffic_spike",
                           cpu=cpu, ram=ram, packets=packets)
        threats = r.get("threatsDetected", 0)
        device_status = r.get("deviceStatus", "Unknown")
        log(R, f"WAVE {wave}", f"PKT {packets:,}  CPU {cpu}%  RAM {ram}%  → threats={threats}  device={device_status}")
        if threats > 0:
            incidents = r.get("incidents", [])
            for inc in incidents:
                log(R, "INCIDENT", f"Type: {inc.get('threatType')}  Severity: {inc.get('severity')}")
            if device_status == "Blocked":
                log(R, "BLOCKED", f"🔒 {device_name} has been automatically BLOCKED!")
                log(B, "INFO", "→ Check Devices page — device status should show Blocked")
        time.sleep(DELAY)


def scenario_sensor_manipulation(token, device_name):
    separator("PHASE 4 — Sensor Manipulation")
    log(Y, "ATTACK", f"Simulating spoofed sensor readings on {device_name}")
    log(Y, "ATTACK", "Temperature reading spiking to 999°C (impossible value)\n")

    r = send_telemetry(token, device_name, "heartbeat",
                       cpu=25, ram=30, packets=100,
                       sensor_data={"temperature": 999, "humidity": -50})
    threats = r.get("threatsDetected", 0)
    log(Y, "SENSOR", f"Sent temp=999°C, humidity=-50  → threats={threats}")
    if threats > 0:
        for inc in r.get("incidents", []):
            log(R, "INCIDENT", f"Type: {inc.get('threatType')}  Severity: {inc.get('severity')}")
    else:
        log(DIM, "NOTE", "Sensor manipulation needs prior baseline — run more heartbeats first if no alert fires")
    time.sleep(DELAY)


def scenario_hardware_anomaly(token, device_name):
    separator("PHASE 5 — Hardware Anomaly")
    log(Y, "ATTACK", f"Simulating CPU+RAM spike on {device_name} (simultaneous overload)")
    log(Y, "ATTACK", "Both CPU and RAM pegged at 99% simultaneously\n")

    for i in range(2):
        r = send_telemetry(token, device_name, "heartbeat",
                           cpu=99, ram=99, packets=50)
        threats = r.get("threatsDetected", 0)
        log(Y, "HW ANOMALY", f"CPU 99%  RAM 99%  → threats={threats}")
        if threats > 0:
            for inc in r.get("incidents", []):
                log(R, "INCIDENT", f"Type: {inc.get('threatType')}  Severity: {inc.get('severity')}")
        time.sleep(DELAY)


def scenario_recovery(tokens, device_names):
    separator("PHASE 6 — System Recovery")
    log(G, "RECOVERY", "Sending clean heartbeats — simulating devices returning to normal\n")

    for name, token in zip(device_names, tokens):
        r = send_telemetry(token, name, "heartbeat",
                           cpu=random.randint(10, 25),
                           ram=random.randint(15, 35),
                           packets=random.randint(50, 150),
                           login_status="SUCCESS")
        log(G, name[:16].ljust(16), f"Clean heartbeat → threats={r.get('threatsDetected', 0)}")
        time.sleep(0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print(f"""
{C}{BOLD}╔══════════════════════════════════════════════════════════╗
║     Cloud-Based IoT Incident Response — Live Demo        ║
║     Simulates real devices sending telemetry             ║
╚══════════════════════════════════════════════════════════╝{RST}

  Dashboard : {W}http://localhost:3000{RST}
  Backend   : {W}{BASE_URL}{RST}
  Mode      : {'Quick (2s)' if QUICK else 'Normal (4s)'}
""")

    # Step 0: Health check
    separator("Checking Backend")
    if not check_health():
        print(f"\n{R}Start the backend first:{RST}")
        print("  cd iot-backend && node server.js\n")
        sys.exit(1)
    time.sleep(1)

    # Step 1: Register 3 simulated devices
    separator("Registering Simulated Devices")
    devices = [
        ("SIM-CAM-01",      "gateway",     "10.0.99.1",  "Sim Lab Entrance"),
        ("SIM-SENSOR-02",   "sensor",      "10.0.99.2",  "Sim Warehouse"),
        ("SIM-GATEWAY-03",  "gateway",     "10.0.99.3",  "Sim Server Room"),
    ]

    tokens = []
    uuids  = []   # actual device UUIDs from backend — used in telemetry deviceId
    names  = []   # human-readable names — used only for display
    for name, dtype, ip, loc in devices:
        token, uuid = register_device(name, dtype, ip, loc)
        if token:
            tokens.append(token)
            uuids.append(uuid)
            names.append(name)
        time.sleep(0.3)

    if not tokens:
        log(R, "ERROR", "No devices registered. Exiting.")
        sys.exit(1)

    log(B, "INFO", f"\n{len(tokens)} devices ready. Starting demo…")
    log(B, "INFO", f"Open the dashboard NOW and go to the Devices page to see them appear.\n")
    time.sleep(3)

    # Step 2: Normal heartbeats (all devices)
    # Use UUIDs as deviceId so SecurityEngine identity check passes cleanly
    scenario_normal_heartbeats(tokens, uuids)

    # Step 3: Brute force on device 1
    scenario_brute_force(tokens[0], uuids[0])
    time.sleep(DELAY)

    # Step 4: DDoS on device 2
    scenario_ddos(tokens[1], uuids[1])
    time.sleep(DELAY)

    # Step 5: Sensor manipulation on device 3
    scenario_sensor_manipulation(tokens[2], uuids[2])
    time.sleep(DELAY)

    # Step 6: Hardware anomaly on device 1
    scenario_hardware_anomaly(tokens[0], uuids[0])
    time.sleep(DELAY)

    # Step 7: Recovery
    scenario_recovery(tokens, uuids)

    # Done
    separator("Demo Complete")
    log(G, "DONE", "All scenarios finished!")
    print(f"""
{W}What to check in the dashboard:{RST}
  {G}►{RST} Incidents page  — should list Brute Force + DDoS incidents
  {G}►{RST} Devices page    — SIM-SENSOR-02 should be Blocked
  {G}►{RST} Analytics page  — heatmap + top targets updated with sim data
  {G}►{RST} Dashboard       — incident count + device status cards updated

{DIM}Tip: Run with --quick for faster pacing during a live presentation{RST}
""")


if __name__ == "__main__":
    main()
