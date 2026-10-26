/**
 * Hardware Timing & Display Refresh Rate Calibration Module
 * Validates browser rendering stability and calculates frame timestamp jitter.
 */

export interface CalibrationResult {
  refreshRateHz: number;
  frameJitterMs: number;
  sampleCount: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Measures the browser's display refresh rate and frame timestamp jitter
 * using high-precision requestAnimationFrame timestamps.
 */
export async function measureDisplayRefresh(sampleTarget = 90): Promise<CalibrationResult> {
  return new Promise((resolve) => {
    const frameDeltas: number[] = [];
    let lastTime = performance.now();
    let samples = 0;

    function frame(time: number) {
      if (samples > 0) {
        const delta = time - lastTime;
        // Ignore severe pauses/tab switches (>100ms)
        if (delta < 100 && delta > 4) {
          frameDeltas.push(delta);
        }
      }
      lastTime = time;
      samples++;

      if (frameDeltas.length < sampleTarget && samples < sampleTarget * 2) {
        requestAnimationFrame(frame);
      } else {
        if (frameDeltas.length === 0) {
          return resolve({
            refreshRateHz: 60.0,
            frameJitterMs: 0.5,
            sampleCount: 0,
            rating: 'good'
          });
        }

        // Calculate mean delta and standard deviation (jitter)
        const meanDelta = frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length;
        const variance = frameDeltas.reduce((a, b) => a + Math.pow(b - meanDelta, 2), 0) / frameDeltas.length;
        const jitter = Math.sqrt(variance);
        
        let calculatedHz = Math.round(1000 / meanDelta);
        // Snap to common monitor frequencies if within 4Hz
        if (Math.abs(calculatedHz - 60) <= 3) calculatedHz = 60;
        else if (Math.abs(calculatedHz - 75) <= 3) calculatedHz = 75;
        else if (Math.abs(calculatedHz - 120) <= 3) calculatedHz = 120;
        else if (Math.abs(calculatedHz - 144) <= 4) calculatedHz = 144;
        else if (Math.abs(calculatedHz - 240) <= 5) calculatedHz = 240;

        let rating: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
        if (jitter > 5.0) rating = 'poor';
        else if (jitter > 2.5) rating = 'fair';
        else if (jitter > 1.2) rating = 'good';

        resolve({
          refreshRateHz: calculatedHz,
          frameJitterMs: parseFloat(jitter.toFixed(2)),
          sampleCount: frameDeltas.length,
          rating
        });
      }
    }

    requestAnimationFrame(frame);
  });
}
