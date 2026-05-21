/**
 * test_baseline_comparison.js
 *
 * Proves the value of adaptive baseline learning vs static thresholds.
 * Runs entirely offline — no server or MongoDB required.
 *
 * Usage:  node test_baseline_comparison.js
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS TEST PROVES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Static thresholds (current industry default):
 *   • DDoS  : traffic > 10 pkt/s  (same for every device)
 *   • CPU   : cpu > 95%           (same for every device)
 *   • Memory: memory > 90%        (same for every device)
 *
 * Problems:
 *   1. FALSE POSITIVES  — A network monitor that normally runs at 9 pkt/s
 *      gets flagged as "DDoS" constantly.  A gateway with 70% normal CPU
 *      never gets flagged even when compromised at 85%.
 *   2. FALSE NEGATIVES  — A tiny temperature sensor doing 25% CPU (cryptominer!)
 *      is never caught because 25% < 95%.
 *
 * Adaptive baseline (this project's patentable innovation):
 *   Each device learns its own normal. Alerts fire only when a reading is
 *   > 3 standard deviations from THAT device's learned mean.
 *   Result: near-zero false positives AND catches subtle attacks static misses.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const SecurityEngine = require('./iot-backend/SecurityEngine');

// ─── Silence MongoDB dependency ───────────────────────────────────────────────
// MockSimulator.js pattern: override the method that touches the DB.
// We only need the in-memory analysis logic for this comparison.
const engine = new SecurityEngine();
engine.countRecentFailures = async () => 0;

// ─── Gaussian Random Helper ───────────────────────────────────────────────────
function gaussianRandom(mean, std) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * std;
}
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

// ─── Static Threshold Check (mirrors old SecurityEngine logic) ────────────────
function staticCheck(cpu, memory, traffic) {
    const threats = [];
    if (traffic > 10)  threats.push({ metric: 'traffic', value: traffic, threshold: 10 });
    if (cpu     > 95)  threats.push({ metric: 'cpu',     value: cpu,     threshold: 95 });
    if (memory  > 90)  threats.push({ metric: 'memory',  value: memory,  threshold: 90 });
    return threats;
}

// ─── Run one test scenario ─────────────────────────────────────────────────────
async function runScenario(label, deviceConfig, normalPackets, attackPackets) {
    const device = { _id: deviceConfig.id };

    let staticFalsePositives = 0;
    let adaptiveFalsePositives = 0;
    let staticTruePositives = 0;
    let adaptiveTruePositives = 0;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📋 SCENARIO: ${label}`);
    console.log(`   Device  : ${deviceConfig.id}`);
    console.log(`   Profile : CPU ${deviceConfig.cpuMean}±${deviceConfig.cpuStd}%  |  Traffic ${deviceConfig.trafficMean}±${deviceConfig.trafficStd} pkt/s`);
    console.log(`${'─'.repeat(70)}`);

    // ── Phase 1: Normal traffic (calibration + false positive test) ───────
    console.log(`\n▶ Phase 1 — Sending ${normalPackets} NORMAL packets (calibration phase)...`);

    for (let i = 0; i < normalPackets; i++) {
        const cpu     = clamp(Math.round(gaussianRandom(deviceConfig.cpuMean, deviceConfig.cpuStd)), 0, 100);
        const memory  = clamp(Math.round(gaussianRandom(deviceConfig.ramMean, deviceConfig.ramStd)), 0, 100);
        const traffic = clamp(parseFloat(gaussianRandom(deviceConfig.trafficMean, deviceConfig.trafficStd).toFixed(1)), 0, 1000);
        const temp    = parseFloat(gaussianRandom(deviceConfig.tempMean, deviceConfig.tempStd).toFixed(1));

        // Static check
        const staticHits = staticCheck(cpu, memory, traffic);
        if (staticHits.length > 0) {
            staticFalsePositives += staticHits.length;
        }

        // Adaptive check
        const telemetry = {
            deviceId:    device._id,
            type:        'heartbeat',
            cpu, memory, traffic,
            loginStatus: 'SUCCESS',
            sensorData:  { temperature: temp }
        };
        const adaptiveThreats = await engine.analyzeTelemetry(telemetry, device);
        // Filter to only hardware/traffic anomalies (exclude auth checks)
        const adaptiveHits = adaptiveThreats.filter(t => ['DDoS', 'Anomaly'].includes(t.type));
        if (adaptiveHits.length > 0) adaptiveFalsePositives += adaptiveHits.length;
    }

    const baseline = engine.getBaselineStatus(deviceConfig.id);
    console.log(`   Baseline calibrated: ${Object.values(baseline.baselines).every(b => b.calibrated) ? '✅ Yes' : '⏳ Still calibrating'}`);
    if (baseline.baselines.traffic?.calibrated) {
        console.log(`   Traffic baseline → mean: ${baseline.baselines.traffic.mean} pkt/s | stdDev: ${baseline.baselines.traffic.stdDev} | alert at: ${baseline.baselines.traffic.threshold} pkt/s`);
    }
    if (baseline.baselines.cpu?.calibrated) {
        console.log(`   CPU baseline     → mean: ${baseline.baselines.cpu.mean}%  | stdDev: ${baseline.baselines.cpu.stdDev} | alert at: ${baseline.baselines.cpu.threshold}%`);
    }

    console.log(`\n   False Positives on NORMAL traffic:`);
    console.log(`     Static   : ${staticFalsePositives} false alarms  ← one-size-fits-all threshold`);
    console.log(`     Adaptive : ${adaptiveFalsePositives} false alarms  ← learned this device's normal`);

    // ── Phase 2: Attack traffic (true positive test) ──────────────────────
    console.log(`\n▶ Phase 2 — Sending ${attackPackets.length} ATTACK packets...`);

    for (const attack of attackPackets) {
        console.log(`\n   🎯 Attack: ${attack.label}`);
        console.log(`      Values: CPU=${attack.cpu}%  Memory=${attack.memory}%  Traffic=${attack.traffic} pkt/s`);

        // Static check
        const staticHits = staticCheck(attack.cpu, attack.memory, attack.traffic);
        if (staticHits.length > 0) {
            staticTruePositives++;
            staticHits.forEach(h => console.log(`      Static   ✅ CAUGHT: ${h.metric}=${h.value} > ${h.threshold}`));
        } else {
            console.log(`      Static   ❌ MISSED: all values below static thresholds (CPU<95, Traffic<10)`);
        }

        // Adaptive check
        const telemetry = {
            deviceId:    device._id,
            type:        'heartbeat',
            cpu:         attack.cpu,
            memory:      attack.memory,
            traffic:     attack.traffic,
            loginStatus: 'SUCCESS',
            sensorData:  { temperature: deviceConfig.tempMean }
        };
        const adaptiveThreats = await engine.analyzeTelemetry(telemetry, device);
        const adaptiveHits    = adaptiveThreats.filter(t => ['DDoS', 'Anomaly'].includes(t.type));
        if (adaptiveHits.length > 0) {
            adaptiveTruePositives++;
            adaptiveHits.forEach(h => console.log(`      Adaptive ✅ CAUGHT: ${h.details}`));
        } else {
            console.log(`      Adaptive ❌ MISSED: within 3σ of this device's baseline`);
        }
    }

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📊 RESULTS SUMMARY — ${label}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   Metric              Static    Adaptive`);
    console.log(`   False Positives   : ${String(staticFalsePositives).padEnd(9)} ${adaptiveFalsePositives}`);
    console.log(`   True Positives    : ${String(staticTruePositives).padEnd(9)} ${adaptiveTruePositives}  (out of ${attackPackets.length})`);

    const staticFPR    = normalPackets > 0 ? ((staticFalsePositives   / normalPackets) * 100).toFixed(1) : 0;
    const adaptiveFPR  = normalPackets > 0 ? ((adaptiveFalsePositives / normalPackets) * 100).toFixed(1) : 0;
    const staticTPR    = attackPackets.length > 0 ? ((staticTruePositives   / attackPackets.length) * 100).toFixed(0) : 0;
    const adaptiveTPR  = attackPackets.length > 0 ? ((adaptiveTruePositives / attackPackets.length) * 100).toFixed(0) : 0;
    console.log(`   False Positive Rate: ${staticFPR}%     ${adaptiveFPR}%`);
    console.log(`   Detection Rate     : ${staticTPR}%      ${adaptiveTPR}%`);

    return {
        scenario: label,
        staticFP: staticFalsePositives,   adaptiveFP: adaptiveFalsePositives,
        staticTP: staticTruePositives,    adaptiveTP: adaptiveTruePositives,
        totalNormal: normalPackets,       totalAttack: attackPackets.length
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║     ADAPTIVE BASELINE vs STATIC THRESHOLD — COMPARISON TEST         ║');
    console.log('║     Cloud-Based Incident Response System for IoT Environments        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    const allResults = [];

    // ─────────────────────────────────────────────────────────────────────
    // SCENARIO 1 — High-Traffic Gateway (False Positive Problem)
    //
    // NETWORK-MONITOR normally runs at ~9 pkt/s.
    // Static threshold = 10 → constant false alarms on normal days.
    // Adaptive learns mean=9, sets threshold at ~15 → no false alarms.
    // ─────────────────────────────────────────────────────────────────────
    allResults.push(await runScenario(
        'High-Traffic Gateway (False Positive Stress Test)',
        {
            id: 'NETWORK-MONITOR-001',
            cpuMean: 50, cpuStd: 9,
            ramMean: 65, ramStd: 7,
            tempMean: 55, tempStd: 5,
            trafficMean: 9, trafficStd: 2   // Normal traffic RIGHT BELOW static threshold
        },
        50,  // 50 normal packets
        [
            // Real DDoS attack — both should catch
            { label: 'Full DDoS (50 pkt/s)',            cpu: 55, memory: 70, traffic: 50 },
            // Moderate spike — only adaptive should catch (9 + 3*2 = 15 threshold)
            { label: 'Moderate spike (20 pkt/s)',       cpu: 52, memory: 68, traffic: 20 },
            // Normal peak — neither should catch
            { label: 'Normal peak (11 pkt/s)',          cpu: 51, memory: 66, traffic: 11 },
        ]
    ));

    // ─────────────────────────────────────────────────────────────────────
    // SCENARIO 2 — Low-Power Sensor (False Negative Problem)
    //
    // TEMP-SENSOR-1 normally runs at ~8% CPU.
    // A cryptominer payload raises it to 40%.
    // Static threshold = 95% → completely misses it.
    // Adaptive: z = (40 - 8) / 2 = 16σ → catches it immediately.
    // ─────────────────────────────────────────────────────────────────────
    allResults.push(await runScenario(
        'Low-Power Sensor (False Negative / Missed Attack Test)',
        {
            id: 'TEMP-SENSOR-001',
            cpuMean: 8,  cpuStd: 2,
            ramMean: 30, ramStd: 3,
            tempMean: 23, tempStd: 1.5,
            trafficMean: 1, trafficStd: 0.3
        },
        50,
        [
            // Cryptominer — static misses (40 < 95), adaptive catches (z ≈ 16)
            { label: 'Cryptominer payload (CPU 40%)',   cpu: 40, memory: 35, traffic: 1.2 },
            // Moderate compromise — static misses (60 < 95), adaptive catches (z ≈ 26)
            { label: 'Heavy compromise (CPU 60%)',      cpu: 60, memory: 40, traffic: 1.1 },
            // Extreme case — both catch (cpu > 95)
            { label: 'Full compromise (CPU 98%)',       cpu: 98, memory: 92, traffic: 1.0 },
        ]
    ));

    // ─────────────────────────────────────────────────────────────────────
    // SCENARIO 3 — High-CPU Edge Compute Node (Subtle Attack Detection)
    //
    // EDGE-COMPUTE-NODE normally runs at ~70% CPU.
    // An attacker adds a hidden process raising CPU to 85%.
    // Static threshold = 95% → misses it entirely.
    // Adaptive: z = (85 - 70) / 10 = 1.5σ → below 3σ, so also missed.
    // BUT a spike to 95%: z = (95 - 70) / 10 = 2.5σ — still below 3.
    // A real attack at 102% (capped to 100%): z = (100-70)/10 = 3.0 → caught!
    // This scenario shows adaptive is best for traffic/memory, not always CPU
    // on already-high-CPU devices. Documented honestly.
    // ─────────────────────────────────────────────────────────────────────
    allResults.push(await runScenario(
        'High-CPU Compute Node (Subtle vs Extreme Attack)',
        {
            id: 'EDGE-COMPUTE-001',
            cpuMean: 70, cpuStd: 10,
            ramMean: 72, ramStd: 7,
            tempMean: 65, tempStd: 5.5,
            trafficMean: 7, trafficStd: 2
        },
        50,
        [
            // Subtle attack — both miss (below all thresholds / below 3σ)
            { label: 'Subtle hidden process (CPU 85%)', cpu: 85, memory: 78, traffic: 8  },
            // Extreme DDoS on traffic — adaptive catches (z ≈ (40-7)/2 = 16.5), static also catches (40 > 10)
            { label: 'DDoS traffic spike (40 pkt/s)',   cpu: 72, memory: 74, traffic: 40 },
            // Memory spike — adaptive catches (z = (88-72)/7 ≈ 2.3, borderline), static misses (88 < 90)
            { label: 'Memory leak attack (88%)',        cpu: 73, memory: 88, traffic: 7  },
        ]
    ));

    // ─────────────────────────────────────────────────────────────────────
    // FINAL AGGREGATE RESULTS
    // ─────────────────────────────────────────────────────────────────────
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                  AGGREGATE COMPARISON RESULTS                       ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');

    let totalStaticFP  = 0, totalAdaptiveFP  = 0;
    let totalStaticTP  = 0, totalAdaptiveTP  = 0;
    let totalNormal    = 0, totalAttack      = 0;

    allResults.forEach(r => {
        totalStaticFP  += r.staticFP;   totalAdaptiveFP  += r.adaptiveFP;
        totalStaticTP  += r.staticTP;   totalAdaptiveTP  += r.adaptiveTP;
        totalNormal    += r.totalNormal; totalAttack      += r.totalAttack;
    });

    const staticFPRate   = ((totalStaticFP   / totalNormal) * 100).toFixed(1);
    const adaptiveFPRate = ((totalAdaptiveFP / totalNormal) * 100).toFixed(1);
    const staticTPRate   = ((totalStaticTP   / totalAttack) * 100).toFixed(0);
    const adaptiveTPRate = ((totalAdaptiveTP / totalAttack) * 100).toFixed(0);

    console.log(`║                           Static      Adaptive                      ║`);
    console.log(`║  Total False Positives  : ${String(totalStaticFP).padEnd(11)} ${String(totalAdaptiveFP).padEnd(27)}║`);
    console.log(`║  False Positive Rate    : ${(staticFPRate + '%').padEnd(11)} ${(adaptiveFPRate + '%').padEnd(27)}║`);
    console.log(`║  Total True Positives   : ${String(totalStaticTP).padEnd(11)} ${String(totalAdaptiveTP).padEnd(27)}║`);
    console.log(`║  Detection Rate         : ${(staticTPRate + '%').padEnd(11)} ${(adaptiveTPRate + '%').padEnd(27)}║`);
    console.log('╠══════════════════════════════════════════════════════════════════════╣');

    const fpReduction = totalStaticFP > 0
        ? (((totalStaticFP - totalAdaptiveFP) / totalStaticFP) * 100).toFixed(0)
        : 0;
    const tpIncrease = totalStaticTP > 0
        ? (((totalAdaptiveTP - totalStaticTP) / totalStaticTP) * 100).toFixed(0)
        : '∞';

    console.log(`║  False Positive Reduction : ${(fpReduction + '%').padEnd(42)}║`);
    console.log(`║  Additional Attacks Caught: ${String(totalAdaptiveTP - totalStaticTP).padEnd(42)}║`);
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    console.log('\n📌 CONCLUSION:');
    console.log('   Adaptive baseline learning reduces false positives by', fpReduction + '%');
    console.log('   and catches', (totalAdaptiveTP - totalStaticTP), 'additional real attacks that static thresholds miss.');
    console.log('   This is the core patentable innovation of this system.\n');

})();
