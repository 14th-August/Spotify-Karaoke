/**
 * Audio/useVAD.js
 * Voice-activity detection hook. Measures the RMS energy of the mic
 * stream every 100 ms and derives an `isVoiceActive` boolean from a
 * configurable RMS threshold.
 *
 * Returns: { rms: number (0–1 approx), isVoiceActive: boolean }
 *
 * The AudioContext and analyser are torn down when the stream changes or
 * the caller unmounts, releasing the audio processing resources.
 */

import { useEffect, useRef, useState } from 'react';

const POLL_MS = 100;       // How often to sample the analyser (10 Hz)
const RMS_THRESHOLD = 0.01; // Below this → silence; above → voice active
const FFT_SIZE = 2048;      // Analyser resolution (must be a power of 2)

export default function useVAD(stream) {
    const [rms, setRms] = useState(0);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    // Keep a ref to the AudioContext so we can close it in cleanup even
    // if the stream is gone by the time the effect runs its teardown.
    const ctxRef = useRef(null);

    useEffect(() => {
        if (!stream) return;

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        source.connect(analyser);
        ctxRef.current = ctx;

        const buffer = new Float32Array(analyser.fftSize);

        const id = setInterval(() => {
            analyser.getFloatTimeDomainData(buffer);
            // Root-mean-square over the full sample window.
            let sumSq = 0;
            for (let i = 0; i < buffer.length; i++) sumSq += buffer[i] * buffer[i];
            const rmsValue = Math.sqrt(sumSq / buffer.length);
            setRms(rmsValue);
            setIsVoiceActive(rmsValue > RMS_THRESHOLD);
        }, POLL_MS);

        return () => {
            clearInterval(id);
            source.disconnect();
            ctx.close();
            ctxRef.current = null;
        };
    }, [stream]);

    return { rms, isVoiceActive };
}
