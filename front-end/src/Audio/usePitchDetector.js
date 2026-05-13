/**
 * Audio/usePitchDetector.js
 * Unified audio-features hook: extracts pitch, RMS, and a derived
 * voice-active flag from a mic MediaStream. One AudioContext per stream,
 * polled at 20 Hz — fast enough for a smooth pitch trail without burning
 * CPU on autocorrelation.
 *
 * Pitch detection uses standard time-domain autocorrelation with parabolic
 * interpolation around the correlation peak for sub-sample accuracy. This
 * is the same approach used by Chris Wilson's PitchDetect demo, which has
 * been the de-facto reference for browser-based vocal pitch since 2014.
 *
 * Return shape: { pitch, confidence, rms, isVoiceActive }
 *   pitch         — fundamental frequency in Hz, or null when no clear
 *                   pitch is detected (silence, noise, polyphonic input)
 *   confidence    — 0–1 score from the autocorrelation peak height
 *   rms           — 0–1 RMS energy of the current frame
 *   isVoiceActive — boolean: rms above threshold
 */

import { useEffect, useRef, useState } from 'react';

const POLL_MS = 50;              // 20 Hz updates — good for the trail
const FFT_SIZE = 2048;           // Time-domain buffer size for autocorrelation
const RMS_THRESHOLD = 0.01;      // Below this → silence
const CORRELATION_TRIM = 0.2;    // Trim near-zero samples from the buffer edges
const MIN_PITCH_HZ = 70;         // Lowest fundamental we care about (~D2)
const MAX_PITCH_HZ = 1000;       // Highest fundamental (~B5)

/**
 * Autocorrelation pitch detection. Given a time-domain buffer and the
 * stream's sample rate, returns { pitch, confidence } where pitch is in Hz
 * or null on no detection.
 */
function autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;

    // RMS gate — if the buffer is mostly silence, skip the work.
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < RMS_THRESHOLD) return { pitch: null, confidence: 0, rms };

    // Trim leading/trailing near-zero samples so the autocorrelation
    // doesn't get biased by the silent edges of the frame.
    let r1 = 0;
    let r2 = SIZE - 1;
    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buf[i]) < CORRELATION_TRIM) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buf[SIZE - i]) < CORRELATION_TRIM) { r2 = SIZE - i; break; }
    }
    const trimmed = buf.subarray(r1, r2);
    const N = trimmed.length;
    if (N < 32) return { pitch: null, confidence: 0, rms };

    // Compute the autocorrelation c[i] = Σ trimmed[j] * trimmed[j+i].
    const c = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        let sum = 0;
        for (let j = 0; j < N - i; j++) sum += trimmed[j] * trimmed[j + i];
        c[i] = sum;
    }

    // Skip the initial monotonic-decrease section (lag 0 is always the
    // global max), then find the next peak.
    let d = 0;
    while (d < N - 1 && c[d] > c[d + 1]) d++;

    let maxVal = -1;
    let maxPos = -1;
    for (let i = d; i < N; i++) {
        if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos < 1 || maxPos >= N - 1) return { pitch: null, confidence: 0, rms };

    // Parabolic interpolation around the peak for sub-sample accuracy.
    const x1 = c[maxPos - 1];
    const x2 = c[maxPos];
    const x3 = c[maxPos + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    let T0 = maxPos;
    if (a) T0 -= b / (2 * a);

    const pitch = sampleRate / T0;
    if (pitch < MIN_PITCH_HZ || pitch > MAX_PITCH_HZ) {
        return { pitch: null, confidence: 0, rms };
    }

    // Normalize the peak height by c[0] (the total energy) for a 0–1 score.
    const confidence = c[0] > 0 ? Math.min(1, maxVal / c[0]) : 0;
    return { pitch, confidence, rms };
}

export default function usePitchDetector(stream) {
    const [features, setFeatures] = useState({
        pitch: null,
        confidence: 0,
        rms: 0,
        isVoiceActive: false,
    });

    // Mirror the latest features into a ref so the canvas in PitchTrail
    // can read the freshest value inside its requestAnimationFrame loop
    // without waiting for React to re-render.
    const featuresRef = useRef(features);

    useEffect(() => {
        if (!stream) return;

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        source.connect(analyser);

        const buf = new Float32Array(analyser.fftSize);

        const id = setInterval(() => {
            analyser.getFloatTimeDomainData(buf);
            const { pitch, confidence, rms } = autoCorrelate(buf, ctx.sampleRate);
            const next = {
                pitch,
                confidence,
                rms,
                isVoiceActive: rms > RMS_THRESHOLD,
            };
            featuresRef.current = next;
            setFeatures(next);
        }, POLL_MS);

        return () => {
            clearInterval(id);
            source.disconnect();
            ctx.close();
        };
    }, [stream]);

    return { ...features, featuresRef };
}
