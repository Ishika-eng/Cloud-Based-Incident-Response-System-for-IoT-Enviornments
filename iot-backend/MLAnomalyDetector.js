/**
 * MLAnomalyDetector — Per-device Isolation Forest
 *
 * How Isolation Forest works:
 *   - Build an ensemble of random binary trees on the training data
 *   - Anomalies get "isolated" near the root (short path) because they
 *     are rare and different; normal points need more splits to isolate
 *   - Anomaly score = normalised average path length across all trees
 *     Score → 1.0 means very anomalous, → 0.0 means very normal
 *
 * Why better than z-score:
 *   - Analyses ALL metrics (cpu + traffic + memory) TOGETHER
 *   - Catches slow-burn attacks: gradual drift across multiple metrics
 *     that each look normal individually but are unusual in combination
 *   - No assumption of Gaussian distribution
 */

// ── Euler-Mascheroni constant used in the c(n) correction ────────────────────
const EULER = 0.5772156649;

/**
 * Expected path length for a subtree of size n.
 * This is the theoretical average path in a random binary search tree.
 */
function c(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + EULER) - (2 * (n - 1) / n);
}

// ── Single Isolation Tree ─────────────────────────────────────────────────────
class IsolationTree {
    /**
     * @param {Array<object>} data   - Array of feature objects e.g. [{cpu:40, traffic:55}]
     * @param {number}        depth  - Current depth
     * @param {number}        maxDepth
     */
    constructor(data, depth, maxDepth) {
        this.size = data.length;

        if (depth >= maxDepth || data.length <= 1) {
            this.isLeaf = true;
            return;
        }

        // Pick a random feature from the first data point's keys
        const features = Object.keys(data[0]);
        this.feature = features[Math.floor(Math.random() * features.length)];

        // Find range for that feature in this subset
        const vals = data.map(d => d[this.feature]);
        const min  = Math.min(...vals);
        const max  = Math.max(...vals);

        // If all values are identical we can't split — make a leaf
        if (min === max) {
            this.isLeaf = true;
            return;
        }

        // Random split point strictly between min and max
        this.splitValue = min + Math.random() * (max - min);

        const left  = data.filter(d => d[this.feature] <  this.splitValue);
        const right = data.filter(d => d[this.feature] >= this.splitValue);

        this.left  = new IsolationTree(left,  depth + 1, maxDepth);
        this.right = new IsolationTree(right, depth + 1, maxDepth);
    }

    /**
     * Returns the path length for a single data point through this tree.
     * Adds the c(n) correction at leaves to account for unbuilt subtrees.
     */
    pathLength(point, currentDepth = 0) {
        if (this.isLeaf || !this.feature) {
            return currentDepth + c(this.size);
        }
        if (point[this.feature] < this.splitValue) {
            return this.left.pathLength(point, currentDepth + 1);
        }
        return this.right.pathLength(point, currentDepth + 1);
    }
}

// ── Isolation Forest ──────────────────────────────────────────────────────────
class IsolationForest {
    /**
     * @param {number} nTrees      - Number of trees (100 is standard)
     * @param {number} sampleSize  - Subsample size per tree (256 is standard)
     */
    constructor(nTrees = 100, sampleSize = 64) {
        this.nTrees     = nTrees;
        this.sampleSize = sampleSize;
        this.trees      = [];
        this.trained    = false;
        this.cN         = 0; // c(sampleSize) — precomputed normalisation constant
    }

    /**
     * Train the forest on a dataset.
     * @param {Array<object>} data  e.g. [{cpu:40, traffic:55, memory:30}, ...]
     */
    fit(data) {
        if (data.length < 2) return;

        const n         = Math.min(this.sampleSize, data.length);
        const maxDepth  = Math.ceil(Math.log2(n));
        this.cN         = c(n);
        this.trees      = [];

        for (let i = 0; i < this.nTrees; i++) {
            // Random subsample without replacement
            const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, n);
            this.trees.push(new IsolationTree(shuffled, 0, maxDepth));
        }

        this.trained = true;
    }

    /**
     * Score a single data point.
     * Returns a value in (0, 1):
     *   > 0.65  →  likely anomaly
     *   > 0.75  →  strong anomaly
     *   < 0.45  →  normal
     */
    score(point) {
        if (!this.trained || this.trees.length === 0) return 0;

        const avgPathLen = this.trees.reduce((sum, tree) => {
            return sum + tree.pathLength(point);
        }, 0) / this.trees.length;

        // Normalise: score = 2^(-avgPathLen / c(n))
        return Math.pow(2, -avgPathLen / this.cN);
    }
}

// ── Per-device ML Anomaly Detector ────────────────────────────────────────────
const ML_SAMPLES_NEEDED = 50;   // packets before ML model is built
const ML_RETRAIN_EVERY  = 100;  // retrain every N packets to adapt

class MLAnomalyDetector {
    constructor() {
        // deviceId → { samples, forest, packetCount, lastRetrain }
        this.deviceModels = new Map();
    }

    /**
     * Normalise raw telemetry into a feature vector.
     * Isolation Forest works best when features are on similar scales.
     * We log-scale traffic since it can range from 0 to 100,000+.
     */
    _buildFeatureVector(telemetry) {
        const vec = {};

        if (telemetry.cpu      !== undefined) vec.cpu      = telemetry.cpu;
        if (telemetry.memory   !== undefined) vec.memory   = telemetry.memory;
        if (telemetry.traffic  !== undefined) vec.traffic  = Math.log1p(telemetry.traffic); // log(1+x)

        // Sensor data
        if (telemetry.sensorData) {
            if (telemetry.sensorData.temperature !== undefined)
                vec.temperature = telemetry.sensorData.temperature;
            if (telemetry.sensorData.humidity    !== undefined)
                vec.humidity    = telemetry.sensorData.humidity;
            if (telemetry.sensorData.gasValue    !== undefined)
                vec.gasValue    = Math.log1p(telemetry.sensorData.gasValue);
        }

        return Object.keys(vec).length >= 2 ? vec : null; // need at least 2 features
    }

    /**
     * Main entry point — call this for every telemetry packet.
     * Returns:
     *   { phase: 'calibrating', samplesCollected, samplesNeeded }
     *   { phase: 'calibrated',  score, isAnomaly, features }
     */
    analyze(deviceId, telemetry) {
        const features = this._buildFeatureVector(telemetry);
        if (!features) return { phase: 'insufficient_features' };

        // Load or create model state for this device
        if (!this.deviceModels.has(deviceId)) {
            this.deviceModels.set(deviceId, {
                samples:     [],
                forest:      new IsolationForest(),
                packetCount: 0,
                lastRetrain: 0,
            });
        }

        const model = this.deviceModels.get(deviceId);
        model.packetCount++;

        // ── Phase 1: Collect samples ─────────────────────────────────────────
        if (!model.forest.trained) {
            model.samples.push(features);

            if (model.samples.length >= ML_SAMPLES_NEEDED) {
                model.forest.fit(model.samples);
                model.lastRetrain = model.packetCount;
                console.log(`[ML] Isolation Forest trained for device ${deviceId} on ${model.samples.length} samples`);
            } else {
                return {
                    phase:            'calibrating',
                    samplesCollected: model.samples.length,
                    samplesNeeded:    ML_SAMPLES_NEEDED,
                };
            }
        }

        // ── Phase 2: Score the new point ─────────────────────────────────────
        const score     = model.forest.score(features);
        const isAnomaly = score > 0.65;

        if (score > 0.55) {
            console.log(`[ML] Device ${deviceId} score=${score.toFixed(3)} features=${JSON.stringify(features)} ANOMALY=${isAnomaly}`);
        }

        // ── Periodic retraining (absorbs legitimate long-term changes) ───────
        if (model.packetCount - model.lastRetrain >= ML_RETRAIN_EVERY) {
            // Add current point to sample pool, cap at 500 to avoid memory growth
            model.samples.push(features);
            if (model.samples.length > 500) model.samples.shift();

            model.forest.fit(model.samples);
            model.lastRetrain = model.packetCount;
            console.log(`[ML] Isolation Forest retrained for device ${deviceId} (${model.packetCount} total packets)`);
        } else {
            // Still collecting for future retraining
            model.samples.push(features);
            if (model.samples.length > 500) model.samples.shift();
        }

        return {
            phase:     'calibrated',
            score:     parseFloat(score.toFixed(3)),
            isAnomaly,
            features,
        };
    }

    /**
     * Returns debug info for a device — used by /debug/baseline endpoint.
     */
    getStatus(deviceId) {
        const model = this.deviceModels.get(deviceId);
        if (!model) return { status: 'no_data' };

        return {
            status:       model.forest.trained ? 'trained' : 'calibrating',
            packetCount:  model.packetCount,
            samplesStored: model.samples.length,
            samplesNeeded: ML_SAMPLES_NEEDED,
            lastRetrain:  model.lastRetrain,
            anomalyThreshold: 0.65,
        };
    }
}

// Singleton — shared across all SecurityEngine instances (same as deviceStateCache)
const mlDetector = new MLAnomalyDetector();

module.exports = { MLAnomalyDetector, mlDetector };
