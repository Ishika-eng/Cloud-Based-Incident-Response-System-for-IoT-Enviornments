/**
 * ESP32 Firmware — Cloud-Based IoT Incident Response System
 *
 * Flow:
 *   1. Connect to WiFi
 *   2. Register with backend → get JWT token → save to Preferences (flash)
 *   3. Every TELEMETRY_INTERVAL ms: read sensors, POST telemetry
 *   4. If backend says device is Blocked → stop sending, blink red LED
 *
 * Libraries required (Arduino Library Manager):
 *   - ArduinoJson  (by Benoit Blanchon)
 *   - WiFi         (built-in ESP32)
 *   - HTTPClient   (built-in ESP32)
 *   - Preferences  (built-in ESP32)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// ── Configuration ─────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL   = "https://friendly-elegance-production-0e93.up.railway.app";

// Device identity — change per device
const char* DEVICE_NAME     = "ESP32-CAM-01";
const char* DEVICE_TYPE     = "gateway";         // gateway | sensor | controller
const char* DEVICE_IP       = "192.168.1.101";   // can be hardcoded or read from WiFi
const char* DEVICE_LOCATION = "Entrance Lobby";

// Timing
const unsigned long TELEMETRY_INTERVAL = 10000;  // 10 seconds
const unsigned long RECONNECT_INTERVAL = 30000;  // 30 seconds

// LED pins (optional — comment out if not used)
#define LED_GREEN 2
#define LED_RED   4

// ── Globals ───────────────────────────────────────────────────────────────────
Preferences prefs;
String authToken       = "";
bool   deviceBlocked   = false;
int    failedLoginCount = 0;
unsigned long lastTelemetry = 0;

// ── Utilities ─────────────────────────────────────────────────────────────────
void blinkLED(int pin, int times, int ms = 200) {
    for (int i = 0; i < times; i++) {
        digitalWrite(pin, HIGH); delay(ms);
        digitalWrite(pin, LOW);  delay(ms);
    }
}

String getTimestamp() {
    // Returns a basic ISO timestamp (use NTP for accurate time in production)
    unsigned long ms = millis();
    // For a real timestamp, integrate NTPClient library
    return "2024-01-01T00:00:00Z";  // Replace with NTP time
}

// ── WiFi ──────────────────────────────────────────────────────────────────────
void connectWiFi() {
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi connected. IP: " + WiFi.localIP().toString());
        digitalWrite(LED_GREEN, HIGH);
    } else {
        Serial.println("\nWiFi failed. Will retry.");
    }
}

// ── Device Registration ───────────────────────────────────────────────────────
bool registerDevice() {
    // Check if token already saved in flash
    prefs.begin("iot-creds", false);
    String saved = prefs.getString("token", "");
    if (saved.length() > 0) {
        authToken = saved;
        Serial.println("Token loaded from flash: " + authToken.substring(0, 20) + "...");
        prefs.end();
        return true;
    }
    prefs.end();

    // Register with backend
    Serial.println("Registering device with backend...");
    HTTPClient http;
    http.begin(String(BACKEND_URL) + "/api/auth/register");
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["name"]      = DEVICE_NAME;
    doc["type"]      = DEVICE_TYPE;
    doc["ipAddress"] = DEVICE_IP;
    doc["location"]  = DEVICE_LOCATION;

    String body;
    serializeJson(doc, body);

    int httpCode = http.POST(body);
    if (httpCode == 200 || httpCode == 201) {
        String response = http.getString();
        StaticJsonDocument<512> res;
        deserializeJson(res, response);

        authToken = res["token"].as<String>();

        // Save to flash so we don't re-register on every reboot
        prefs.begin("iot-creds", false);
        prefs.putString("token", authToken);
        prefs.end();

        Serial.println("Registered! Token saved.");
        http.end();
        return true;
    } else {
        Serial.println("Registration failed. HTTP: " + String(httpCode));
        http.end();
        return false;
    }
}

// ── Read Sensors ──────────────────────────────────────────────────────────────
float readCPU() {
    // ESP32 has no built-in CPU% API.
    // Approximate: measure loop idle time, or use a simple task monitor.
    // For demo: return a simulated value based on millis variation.
    return 20.0 + (float)(millis() % 40);
}

float readRAM() {
    size_t freeHeap  = ESP.getFreeHeap();
    size_t totalHeap = ESP.getHeapSize();
    float  used      = 100.0 * (1.0 - ((float)freeHeap / (float)totalHeap));
    return used;
}

float readPacketFrequency() {
    // In a real deployment, tap into your network interface stats.
    // For ESP32 with WiFi, WiFi.RSSI() gives signal strength.
    // Placeholder: simulate based on time
    return 50.0 + (float)(millis() % 200);
}

// ── Send Telemetry ────────────────────────────────────────────────────────────
void sendTelemetry(String type, String loginStatus = "") {
    if (authToken.length() == 0) {
        Serial.println("No auth token — skipping telemetry");
        return;
    }

    float cpu     = readCPU();
    float ram     = readRAM();
    float packets = readPacketFrequency();

    // Build JSON payload
    StaticJsonDocument<512> doc;
    doc["deviceId"]  = DEVICE_NAME;
    doc["timestamp"] = getTimestamp();
    doc["type"]      = type;

    JsonObject data = doc.createNestedObject("data");
    data["cpuUsage"]        = cpu;
    data["ramUsage"]        = ram;
    data["packetFrequency"] = packets;

    if (loginStatus.length() > 0) {
        data["loginStatus"] = loginStatus;
    }

    // Add sensor readings if you have physical sensors
    // JsonObject sensor = data.createNestedObject("sensorData");
    // sensor["temperature"] = readDHTTemperature();
    // sensor["humidity"]    = readDHTHumidity();

    String body;
    serializeJson(doc, body);

    // POST to backend
    HTTPClient http;
    http.begin(String(BACKEND_URL) + "/api/telemetry");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + authToken);
    http.setTimeout(8000);

    int httpCode = http.POST(body);

    if (httpCode == 200) {
        String response = http.getString();
        StaticJsonDocument<512> res;
        deserializeJson(res, response);

        int threats      = res["threatsDetected"] | 0;
        String devStatus = res["deviceStatus"] | "Active";

        Serial.printf("[TELEMETRY OK] CPU=%.1f%% RAM=%.1f%% PKT=%.0f threats=%d status=%s\n",
                      cpu, ram, packets, threats, devStatus.c_str());

        if (threats > 0) {
            Serial.println("  ⚠ THREAT DETECTED — check dashboard!");
            blinkLED(LED_RED, threats, 150);
        }

        if (devStatus == "Blocked") {
            Serial.println("  🔒 Device BLOCKED by server.");
            deviceBlocked = true;
            digitalWrite(LED_RED, HIGH);
            digitalWrite(LED_GREEN, LOW);
        }

    } else if (httpCode == 401) {
        // Token expired or invalid — clear and re-register
        Serial.println("401 Unauthorized — clearing token, will re-register");
        prefs.begin("iot-creds", false);
        prefs.remove("token");
        prefs.end();
        authToken = "";
    } else {
        Serial.println("Telemetry failed. HTTP: " + String(httpCode));
    }

    http.end();
}

// ── Simulate Login Event ──────────────────────────────────────────────────────
// Call this when a user logs into the device (physical keypad, RFID, etc.)
void reportLoginAttempt(bool success) {
    String status = success ? "SUCCESS" : "FAIL";
    if (!success) failedLoginCount++;
    Serial.println("Login event: " + status + " (fails=" + String(failedLoginCount) + ")");
    sendTelemetry("login", status);
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(LED_GREEN, OUTPUT);
    pinMode(LED_RED,   OUTPUT);
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED,   LOW);

    Serial.println("\n========================================");
    Serial.println("  IoT Incident Response — ESP32 Node");
    Serial.println("  Device: " + String(DEVICE_NAME));
    Serial.println("========================================\n");

    connectWiFi();

    if (WiFi.status() == WL_CONNECTED) {
        bool registered = registerDevice();
        if (registered) {
            blinkLED(LED_GREEN, 3);
            Serial.println("Device ready. Sending telemetry every " +
                           String(TELEMETRY_INTERVAL / 1000) + "s");
        }
    }
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
    // Reconnect WiFi if dropped
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi lost. Reconnecting...");
        digitalWrite(LED_GREEN, LOW);
        connectWiFi();
        if (WiFi.status() == WL_CONNECTED && authToken.length() == 0) {
            registerDevice();
        }
        return;
    }

    // If blocked by server, stop sending (just blink red LED)
    if (deviceBlocked) {
        blinkLED(LED_RED, 1, 1000);
        delay(5000);
        return;
    }

    // Send telemetry on interval
    unsigned long now = millis();
    if (now - lastTelemetry >= TELEMETRY_INTERVAL) {
        lastTelemetry = now;

        // Detect traffic spike (example: packets > threshold)
        float packets = readPacketFrequency();
        String type = (packets > 5000) ? "traffic_spike" : "heartbeat";

        sendTelemetry(type);
    }

    delay(100);
}
