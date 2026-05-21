#!/usr/bin/env python3
"""
Raspberry Pi IoT Agent — Cloud-Based IoT Incident Response System
=================================================================
Runs as a background service on Raspberry Pi (or any Linux SBC).
Reads real CPU, RAM, network traffic, and optional GPIO sensors,
then sends telemetry to the backend every TELEMETRY_INTERVAL seconds.

Installation:
    pip3 install requests psutil RPi.GPIO  (RPi.GPIO only on real Pi)

Run as service:
    sudo cp iot_agent.service /etc/systemd/system/
    sudo systemctl enable iot_agent
    sudo systemctl start iot_agent

Or run directly:
    python3 iot_agent.py
"""

import os
import sys
import json
import time
import logging
import requests
import psutil
from datetime import datetime, timezone
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────────────────
BACKEND_URL        = os.getenv("BACKEND_URL", "https://friendly-elegance-production-0e93.up.railway.app")
DEVICE_NAME        = os.getenv("DEVICE_NAME", "RPI-MONITOR-01")
DEVICE_TYPE        = os.getenv("DEVICE_TYPE", "gateway")   # gateway | sensor | controller
DEVICE_LOCATION    = os.getenv("DEVICE_LOCATION", "Server Room A")
TELEMETRY_INTERVAL = int(os.getenv("TELEMETRY_INTERVAL", "10"))  # seconds
TOKEN_FILE         = Path("/etc/iot_agent_token")               # persistent token storage

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/var/log/iot_agent.log") if os.path.exists("/var/log") else logging.NullHandler(),
    ]
)
log = logging.getLogger(__name__)

# ── Optional: GPIO sensor support (comment out if no physical sensors) ─────────
USE_GPIO = False
try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    # Example: PIR motion sensor on GPIO 17, DHT22 on GPIO 4
    # GPIO.setup(17, GPIO.IN)
    USE_GPIO = True
    log.info("GPIO available")
except ImportError:
    log.info("RPi.GPIO not available — running without GPIO sensors")

# ── Token Management ───────────────────────────────────────────────────────────
def load_token():
    if TOKEN_FILE.exists():
        token = TOKEN_FILE.read_text().strip()
        if token:
            log.info(f"Token loaded from {TOKEN_FILE}")
            return token
    return None

def save_token(token):
    try:
        TOKEN_FILE.write_text(token)
        TOKEN_FILE.chmod(0o600)
    except PermissionError:
        # Fallback to local file if no /etc write permission
        Path("iot_token.txt").write_text(token)

def clear_token():
    try:
        TOKEN_FILE.unlink(missing_ok=True)
        Path("iot_token.txt").unlink(missing_ok=True)
    except:
        pass

# ── Device Registration ────────────────────────────────────────────────────────
def get_local_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "0.0.0.0"

def register_device():
    token = load_token()
    if token:
        return token

    log.info(f"Registering device '{DEVICE_NAME}' with backend...")
    try:
        res = requests.post(
            f"{BACKEND_URL}/api/auth/register",
            json={
                "name":      DEVICE_NAME,
                "type":      DEVICE_TYPE,
                "ipAddress": get_local_ip(),
                "location":  DEVICE_LOCATION,
            },
            timeout=10
        )
        res.raise_for_status()
        token = res.json()["token"]
        save_token(token)
        log.info("Device registered successfully")
        return token
    except Exception as e:
        log.error(f"Registration failed: {e}")
        return None

# ── Sensor Readings ────────────────────────────────────────────────────────────
def read_cpu():
    return psutil.cpu_percent(interval=1)

def read_ram():
    return psutil.virtual_memory().percent

def read_network_packets():
    """Returns packets/second by sampling over 1 second."""
    n1 = psutil.net_io_counters()
    time.sleep(1)
    n2 = psutil.net_io_counters()
    return (n2.packets_sent + n2.packets_recv) - (n1.packets_sent + n1.packets_recv)

def read_gpio_sensors():
    """Read physical sensors connected via GPIO."""
    sensors = {}
    if not USE_GPIO:
        return sensors

    # ── DHT22 Temperature + Humidity ──
    # Uncomment and install: pip3 install Adafruit_DHT
    # import Adafruit_DHT
    # humidity, temperature = Adafruit_DHT.read_retry(Adafruit_DHT.DHT22, 4)
    # if temperature: sensors["temperature"] = round(temperature, 1)
    # if humidity:    sensors["humidity"]    = round(humidity, 1)

    # ── PIR Motion sensor on GPIO 17 ──
    # motion = GPIO.input(17)
    # sensors["motion"] = bool(motion)

    # ── Ultrasonic distance sensor ──
    # sensors["distance_cm"] = read_ultrasonic(trigger=23, echo=24)

    return sensors

def detect_login_event():
    """
    Detect login attempts from system auth logs.
    Returns ('SUCCESS'|'FAIL'|None)
    """
    try:
        with open("/var/log/auth.log", "r") as f:
            lines = f.readlines()
            last = lines[-1] if lines else ""
            if "Failed password" in last or "authentication failure" in last:
                return "FAIL"
            if "Accepted password" in last or "session opened" in last:
                return "SUCCESS"
    except:
        pass
    return None

# ── Telemetry ──────────────────────────────────────────────────────────────────
def send_telemetry(token, cpu, ram, packets, login_status=None, sensor_data=None):
    telemetry_type = "heartbeat"
    if login_status:
        telemetry_type = "login"
    elif packets > 5000:
        telemetry_type = "traffic_spike"

    data = {
        "cpuUsage":        round(cpu, 1),
        "ramUsage":        round(ram, 1),
        "packetFrequency": int(packets),
    }
    if login_status:
        data["loginStatus"] = login_status
    if sensor_data:
        data["sensorData"] = sensor_data

    payload = {
        "deviceId":  DEVICE_NAME,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "type":      telemetry_type,
        "data":      data,
    }

    try:
        res = requests.post(
            f"{BACKEND_URL}/api/telemetry",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=8
        )

        if res.status_code == 200:
            r = res.json()
            threats = r.get("threatsDetected", 0)
            status  = r.get("deviceStatus", "Active")
            log.info(f"✓ CPU={cpu:.1f}% RAM={ram:.1f}% PKT={packets} threats={threats} status={status}")

            if threats > 0:
                for inc in r.get("incidents", []):
                    log.warning(f"  🚨 {inc.get('threatType')} [{inc.get('severity')}] — check dashboard!")

            return status

        elif res.status_code == 401:
            log.warning("Token rejected (401) — clearing and re-registering")
            clear_token()
            return "reregister"

        else:
            log.warning(f"Telemetry HTTP {res.status_code}: {res.text[:100]}")
            return "error"

    except requests.exceptions.ConnectionError:
        log.warning("Backend unreachable — will retry next cycle")
        return "error"
    except Exception as e:
        log.error(f"Telemetry error: {e}")
        return "error"

# ── Main Loop ──────────────────────────────────────────────────────────────────
def main():
    log.info("=" * 50)
    log.info(f"  IoT Agent starting — {DEVICE_NAME}")
    log.info(f"  Backend: {BACKEND_URL}")
    log.info(f"  Interval: {TELEMETRY_INTERVAL}s")
    log.info("=" * 50)

    token = None
    device_blocked = False

    while True:
        try:
            # Register / re-register if needed
            if not token:
                token = register_device()
                if not token:
                    log.warning("Cannot register — retrying in 30s")
                    time.sleep(30)
                    continue

            # If server blocked this device, stop sending
            if device_blocked:
                log.warning("Device is BLOCKED by server. Sleeping 60s...")
                time.sleep(60)
                continue

            # Read sensors
            cpu     = read_cpu()
            ram     = read_ram()
            packets = read_network_packets()  # this takes ~1s internally
            sensors = read_gpio_sensors()
            login   = detect_login_event()

            # Send
            status = send_telemetry(token, cpu, ram, packets, login, sensors)

            if status == "Blocked":
                log.warning("🔒 Device blocked by server — stopping telemetry")
                device_blocked = True
            elif status == "reregister":
                token = None  # will re-register on next loop

            # Wait remainder of interval (network read already took ~1s)
            time.sleep(max(1, TELEMETRY_INTERVAL - 1))

        except KeyboardInterrupt:
            log.info("Agent stopped by user")
            break
        except Exception as e:
            log.error(f"Unexpected error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    main()
