/**
 * CYBER CUBE TIMER - Statistics Module
 * Calculates Ao5, Ao12, and other statistics
 */

const Statistics = {
    /**
     * Calculate all statistics from times array
     */
    calculate(times) {
        if (!times || times.length === 0) {
            return {
                count: 0,
                best: null,
                worst: null,
                mean: null,
                ao5: { value: null, detail: '' },
                ao12: { value: null, detail: '' },
                bestAo5: null,
                bestAo12: null
            };
        }

        // Filter out DNF times for best/worst calculations
        const validTimes = times.filter(t => !t.dnf);
        const timeValues = validTimes.map(t => t.time + (t.penalty || 0));

        // Calculate best and worst (keep as numbers, format only when displaying)
        const bestValue = timeValues.length > 0 ? Math.min(...timeValues) : null;
        const worstValue = timeValues.length > 0 ? Math.max(...timeValues) : null;
        const best = bestValue !== null ? (window.TimeUtil ? TimeUtil.formatTime(bestValue) : (bestValue/1000).toFixed(3)) : null;
        const worst = worstValue !== null ? (window.TimeUtil ? TimeUtil.formatTime(worstValue) : (worstValue/1000).toFixed(3)) : null;

        // Calculate mean
        const meanValue = timeValues.length > 0
            ? timeValues.reduce((a, b) => a + b, 0) / timeValues.length
            : null;
        const mean = meanValue !== null ? (window.TimeUtil ? TimeUtil.formatTime(meanValue) : (meanValue/1000).toFixed(3)) : null;

        // Calculate current Ao5
        const ao5 = this.calculateAverage(times.slice(0, 5));

        // Calculate current Ao12
        const ao12 = this.calculateAverage(times.slice(0, 12));

        // Calculate best Ao5 ever
        const bestAo5 = this.calculateBestAverage(times, 5);

        // Calculate best Ao12 ever
        const bestAo12 = this.calculateBestAverage(times, 12);

        return {
            count: times.length,
            best,
            worst,
            mean,
            ao5,
            ao12,
            bestAo5,
            bestAo12
        };
    },

    /**
     * Calculate average of N (removing best and worst)
     */
    calculateAverage(times) {
        if (!times || times.length < 3) {
            return { value: null, detail: '' };
        }

        const n = times.length;
        const requiredCount = n === 5 ? 5 : (n === 12 ? 12 : n);

        if (times.length < requiredCount) {
            return { value: null, detail: '' };
        }

        // Get time values with penalties
        const timeData = times.slice(0, requiredCount).map(t => ({
            value: t.dnf ? Infinity : (t.time + (t.penalty || 0)),
            dnf: t.dnf,
            display: t.dnf ? 'DNF' : (window.TimeUtil ? TimeUtil.formatTime(t.time + (t.penalty || 0)) : ((t.time + (t.penalty || 0))/1000).toFixed(3))
        }));

        // Count DNFs
        const dnfCount = timeData.filter(t => t.dnf).length;

        // More than 1 DNF means the average is DNF
        if (dnfCount > 1) {
            return { value: 'DNF', detail: '' };
        }

        // Sort by value to find best and worst
        const sorted = [...timeData].sort((a, b) => a.value - b.value);
        const bestTime = sorted[0];
        const worstTime = sorted[sorted.length - 1];

        // Remove best and worst
        const middleTimes = timeData.filter(t =>
            t !== bestTime && t !== worstTime && !t.dnf
        );

        // If we don't have enough valid middle times, return DNF
        if (middleTimes.length < requiredCount - 2) {
            return { value: 'DNF', detail: '' };
        }

        // Calculate average
        const sum = middleTimes.reduce((acc, t) => acc + t.value, 0);
        const avg = sum / middleTimes.length;

        // Build detail string
        const detailParts = timeData.map(t => {
            if (t === bestTime || t === worstTime) {
                return `(${t.display})`;
            }
            return t.display;
        });

        return {
            value: window.TimeUtil ? TimeUtil.formatTime(avg) : (avg/1000).toFixed(3),
            detail: detailParts.join(', ')
        };
    },

    /**
     * Calculate best average of N from all times
     */
    calculateBestAverage(times, n) {
        if (!times || times.length < n) {
            return null;
        }

        let bestAvg = Infinity;

        // Iterate through all possible windows of size n
        for (let i = 0; i <= times.length - n; i++) {
            const window = times.slice(i, i + n);
            const avg = this.calculateAverage(window);

            if (avg.value && avg.value !== 'DNF') {
                const avgValue = parseFloat(avg.value);
                if (avgValue < bestAvg) {
                    bestAvg = avgValue;
                }
            }
        }

        return bestAvg === Infinity ? null : bestAvg.toFixed(3);
    },

    /**
     * Get time distribution
     */
    getDistribution(times, bucketSize = 1000) {
        if (!times || times.length === 0) {
            return [];
        }

        const validTimes = times.filter(t => !t.dnf);
        const timeValues = validTimes.map(t => t.time + (t.penalty || 0));

        if (timeValues.length === 0) {
            return [];
        }

        const min = Math.min(...timeValues);
        const max = Math.max(...timeValues);

        const buckets = [];
        for (let i = Math.floor(min / bucketSize) * bucketSize; i <= max; i += bucketSize) {
            const count = timeValues.filter(t => t >= i && t < i + bucketSize).length;
            buckets.push({
                range: `${window.TimeUtil ? TimeUtil.formatTime(i) : (i/1000).toFixed(3)}-${window.TimeUtil ? TimeUtil.formatTime(i + bucketSize) : ((i + bucketSize)/1000).toFixed(3)}`,
                count
            });
        }

        return buckets;
    },

    /**
     * Get success rate (non-DNF percentage)
     */
    getSuccessRate(times) {
        if (!times || times.length === 0) {
            return 0;
        }

        const successCount = times.filter(t => !t.dnf).length;
        return ((successCount / times.length) * 100).toFixed(1);
    },

    /**
     * Get improvement rate
     */
    getImprovementRate(times, windowSize = 10) {
        if (!times || times.length < windowSize * 2) {
            return null;
        }

        const recentTimes = times.slice(0, windowSize)
            .filter(t => !t.dnf)
            .map(t => t.time + (t.penalty || 0));

        const oldTimes = times.slice(windowSize, windowSize * 2)
            .filter(t => !t.dnf)
            .map(t => t.time + (t.penalty || 0));

        if (recentTimes.length === 0 || oldTimes.length === 0) {
            return null;
        }

        const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
        const oldAvg = oldTimes.reduce((a, b) => a + b, 0) / oldTimes.length;

        const improvement = ((oldAvg - recentAvg) / oldAvg) * 100;

        return {
            percentage: improvement.toFixed(1),
            recentAvg: window.TimeUtil ? TimeUtil.formatTime(recentAvg) : (recentAvg/1000).toFixed(3),
            oldAvg: window.TimeUtil ? TimeUtil.formatTime(oldAvg) : (oldAvg/1000).toFixed(3)
        };
    }
};

// Make Statistics globally available
window.Statistics = Statistics;
