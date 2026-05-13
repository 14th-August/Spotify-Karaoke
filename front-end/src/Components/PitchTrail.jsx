/**
 * Components/PitchTrail.jsx
 * Japanese-karaoke-style pitch visualization. A canvas-based band that
 * scrolls right-to-left as the song plays, with:
 *
 *   • Expected-pitch bars for each lyric line (green, fade with distance).
 *     For Phase 1 these heights are placeholders derived from a hash of
 *     the line text — they're visually melodic but not the real melody.
 *     They get replaced with the real backend pitch contour once the
 *     Phase 2 pipeline lands.
 *   • A vertical "now" line at the left third of the band.
 *   • A glowing ball at the now line — its vertical position tracks the
 *     user's current pitch in real time.
 *   • A trailing line of the user's recent pitch samples, scrolling left
 *     with time (mirrors what they just sang).
 *
 * Why a canvas: we redraw at 60 fps via requestAnimationFrame and read
 * mic-pitch + position from refs — no React re-render per frame.
 *
 * Props:
 *   lines            — Array<{ time_ms, text }> from the LRClib parser
 *   getPositionMs    — () => number; current playback position in ms.
 *                       Called every frame so the trail can extrapolate
 *                       smoothly between SDK state events.
 *   featuresRef      — { current: { pitch, confidence, ... } } from usePitchDetector
 *   pitchHistoryRef  — { current: Array<{ time_ms, pitch }> } accumulated
 *                       in the parent (Karaoke.jsx) at the same poll rate
 *                       as the pitch detector.
 */

import { Box } from '@mui/material';
import { useEffect, useRef } from 'react';

// Vertical pitch range shown on screen. C2 (MIDI 36) → C6 (MIDI 84)
// covers everything from bass voices to soprano belts with room to spare.
const MIDI_MIN = 36;
const MIDI_MAX = 84;
const MIDI_RANGE = MIDI_MAX - MIDI_MIN;

// Time window: 1.5 s of past + 4.5 s of upcoming = 6 s total visible.
const PAST_MS = 1500;
const FUTURE_MS = 4500;
const TOTAL_MS = PAST_MS + FUTURE_MS;

// Where the "now" cursor sits in the canvas (fraction of width from left).
const NOW_FRAC = PAST_MS / TOTAL_MS;

// Bar geometry (in pixels). The bar's total height is BAR_HEIGHT; the
// brighter "active" stripe inside is BAR_CORE_HEIGHT.
const BAR_HEIGHT = 16;
const BAR_CORE_HEIGHT = 6;

// Trail / ball styling
const TRAIL_ALPHA_OLDEST = 0.05;
const TRAIL_ALPHA_NEWEST = 0.85;
const BALL_RADIUS = 9;

// Convert Hz → MIDI float (so a slightly-flat singer still maps onto a
// fractional position between two whole notes).
const hzToMidi = (hz) => 69 + 12 * Math.log2(hz / 440);

// Deterministic placeholder pitch for a lyric line. Hashes text + index
// into a stable MIDI value inside a comfortable singing band so the bars
// look melodic. Same song always produces the same pattern.
const hashLineToMidi = (idx, text) => {
    let h = idx * 31;
    for (let i = 0; i < text.length; i++) {
        h = ((h << 5) - h) + text.charCodeAt(i);
        h |= 0;
    }
    // Range: MIDI 52 (E3) → MIDI 71 (B4) — typical pop singing band.
    return 52 + (Math.abs(h) % 20);
};

export default function PitchTrail({
    lines,
    getPositionMs,
    featuresRef,
    pitchHistoryRef,
}) {
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    const rafRef = useRef(null);

    // Backing-store sizing: keep the canvas's internal pixel grid in sync
    // with its CSS box on every resize, otherwise everything looks blurry
    // on hi-DPI displays.
    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        const sync = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = wrapper.getBoundingClientRect();
            canvas.width = Math.round(rect.width * dpr);
            canvas.height = Math.round(rect.height * dpr);
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(wrapper);
        return () => observer.disconnect();
    }, []);

    // The draw loop. One rAF per frame, reads playback position + latest
    // pitch + history from the refs the parent passes us.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx2d = canvas.getContext('2d');

        const draw = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (w === 0 || h === 0) {
                rafRef.current = requestAnimationFrame(draw);
                return;
            }

            const positionMs = getPositionMs();
            const nowX = w * NOW_FRAC;

            // Time → X coordinate (relative to current playback position).
            const timeToX = (timeMs) =>
                nowX + ((timeMs - positionMs) / TOTAL_MS) * w;

            // MIDI → Y (low at bottom, high at top, with a small margin).
            const midiToY = (midi) => {
                const t = (midi - MIDI_MIN) / MIDI_RANGE;
                return h - t * (h - 24) - 12;
            };

            ctx2d.clearRect(0, 0, w, h);

            // Background — subtle horizontal gridlines at each octave.
            ctx2d.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx2d.lineWidth = 1;
            for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi += 12) {
                const y = midiToY(midi);
                ctx2d.beginPath();
                ctx2d.moveTo(0, y);
                ctx2d.lineTo(w, y);
                ctx2d.stroke();
            }

            // Expected-pitch bars for visible lyric lines.
            if (lines) {
                const windowStart = positionMs - PAST_MS;
                const windowEnd = positionMs + FUTURE_MS;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const next = lines[i + 1];
                    const lineStart = line.time_ms;
                    const lineEnd = next ? next.time_ms : lineStart + 4000;

                    // Skip bars entirely outside the visible window.
                    if (lineEnd < windowStart || lineStart > windowEnd) continue;

                    const midi = hashLineToMidi(i, line.text);
                    const y = midiToY(midi);
                    const x1 = timeToX(lineStart);
                    const x2 = timeToX(lineEnd);
                    const barW = Math.max(4, x2 - x1 - 3);

                    // Bars that contain the "now" line are currently active;
                    // brighten them so the singer can see what to aim for.
                    const isActive = lineStart <= positionMs && lineEnd > positionMs;
                    ctx2d.fillStyle = isActive
                        ? 'rgba(29, 185, 84, 0.85)'
                        : 'rgba(29, 185, 84, 0.32)';
                    ctx2d.fillRect(x1, y - BAR_HEIGHT / 2, barW, BAR_HEIGHT);

                    ctx2d.fillStyle = isActive
                        ? 'rgba(255,255,255,0.9)'
                        : 'rgba(29, 185, 84, 0.75)';
                    ctx2d.fillRect(x1, y - BAR_CORE_HEIGHT / 2, barW, BAR_CORE_HEIGHT);
                }
            }

            // The "now" line — vertical marker at nowX.
            ctx2d.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx2d.lineWidth = 2;
            ctx2d.beginPath();
            ctx2d.moveTo(nowX, 0);
            ctx2d.lineTo(nowX, h);
            ctx2d.stroke();

            // User's pitch trail — a polyline from older samples to newer
            // ones, fading from transparent → opaque. Each segment uses
            // its own alpha so we don't have to gradient-fill.
            const history = pitchHistoryRef?.current;
            if (history && history.length > 1) {
                const windowStart = positionMs - PAST_MS;
                let prev = null;
                for (let i = 0; i < history.length; i++) {
                    const sample = history[i];
                    if (!sample.pitch) { prev = null; continue; }
                    if (sample.time_ms < windowStart) { prev = null; continue; }

                    const midi = hzToMidi(sample.pitch);
                    if (midi < MIDI_MIN || midi > MIDI_MAX) { prev = null; continue; }

                    const x = timeToX(sample.time_ms);
                    const y = midiToY(midi);

                    if (prev) {
                        // Newer samples → higher alpha. age in [0,1].
                        const age = 1 - (positionMs - sample.time_ms) / PAST_MS;
                        const alpha =
                            TRAIL_ALPHA_OLDEST +
                            (TRAIL_ALPHA_NEWEST - TRAIL_ALPHA_OLDEST) * Math.max(0, age);
                        ctx2d.strokeStyle = `rgba(255, 200, 87, ${alpha.toFixed(3)})`;
                        ctx2d.lineWidth = 3;
                        ctx2d.lineCap = 'round';
                        ctx2d.beginPath();
                        ctx2d.moveTo(prev.x, prev.y);
                        ctx2d.lineTo(x, y);
                        ctx2d.stroke();
                    }
                    prev = { x, y };
                }
            }

            // The ball — user's current pitch at the now line.
            const features = featuresRef?.current;
            const pitch = features?.pitch;
            if (pitch) {
                const midi = hzToMidi(pitch);
                if (midi >= MIDI_MIN && midi <= MIDI_MAX) {
                    const y = midiToY(midi);
                    // Glow halo
                    ctx2d.shadowColor = '#FFC857';
                    ctx2d.shadowBlur = 18;
                    ctx2d.fillStyle = '#FFC857';
                    ctx2d.beginPath();
                    ctx2d.arc(nowX, y, BALL_RADIUS, 0, Math.PI * 2);
                    ctx2d.fill();
                    ctx2d.shadowBlur = 0;
                    // Inner highlight
                    ctx2d.fillStyle = '#FFF7E0';
                    ctx2d.beginPath();
                    ctx2d.arc(nowX - 2, y - 2, BALL_RADIUS / 3, 0, Math.PI * 2);
                    ctx2d.fill();
                }
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [lines, getPositionMs, featuresRef, pitchHistoryRef]);

    return (
        <Box
            ref={wrapperRef}
            sx={{
                position: 'relative',
                width: '100%',
                height: 200,
                bgcolor: 'rgba(0, 0, 0, 0.55)',
                borderBottom: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </Box>
    );
}
