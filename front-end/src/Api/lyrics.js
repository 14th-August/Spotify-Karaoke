/**
 * Api/lyrics.js
 * Fetches synced lyrics from LRClib (https://lrclib.net), a free public
 * API that returns lyrics in LRC format — timestamped lines that sync to
 * playback. No API key required; CORS is open.
 *
 * Return shape of getSyncedLyrics:
 *   { lines: Array<{ time_ms, text }>, plainText: string | null }  — synced
 *   { lines: null, plainText: string }                             — plain text only
 *   { lines: [], plainText: null, instrumental: true }             — instrumental
 *   null                                                           — not found / error
 *
 * Genius is the intended plain-text fallback for a server-side environment
 * (their API blocks direct browser requests). That path is deferred until
 * the karaoke backend is standing up; for now plain-text from LRClib's own
 * `plainLyrics` field covers most cases.
 */

const LRCLIB_BASE = 'https://lrclib.net/api';

// Parse LRC format into an array sorted by time. Timestamps look like:
// [02:15.37] or [02:15.370] — minutes, seconds, centiseconds/milliseconds.
// Empty lines (musical rests / gaps between verses) are preserved as ''.
const parseLRC = (lrc) => {
    const lines = [];
    for (const raw of lrc.split('\n')) {
        // Match [mm:ss.xx] or [mm:ss.xxx] at the start of each line.
        const match = raw.match(/^\[(\d+):(\d+)\.(\d+)\]\s*(.*)/);
        if (!match) continue;
        const [, min, sec, sub, text] = match;
        // Normalize sub-second part to exactly 3 digits so parseInt gives ms.
        const time_ms =
            (parseInt(min, 10) * 60 + parseInt(sec, 10)) * 1000 +
            parseInt(sub.padEnd(3, '0').slice(0, 3), 10);
        lines.push({ time_ms, text: text.trim() });
    }
    return lines.sort((a, b) => a.time_ms - b.time_ms);
};

/**
 * Fetch synced (LRC) lyrics for a track. Passing all four params gives LRClib
 * the best chance of finding an exact match; duration (in ms) is converted to
 * seconds for the API.
 */
export const getSyncedLyrics = async ({ artist, track, album, duration }) => {
    const params = new URLSearchParams({ artist_name: artist, track_name: track });
    if (album) params.set('album_name', album);
    if (duration) params.set('duration', String(Math.round(duration / 1000)));

    let data;
    try {
        const res = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`LRClib ${res.status}`);
        data = await res.json();
    } catch {
        // Network error or non-JSON body — treat as not found.
        return null;
    }

    if (data.instrumental) {
        return { lines: [], plainText: null, instrumental: true };
    }

    if (data.syncedLyrics) {
        return { lines: parseLRC(data.syncedLyrics), plainText: data.plainLyrics || null };
    }

    if (data.plainLyrics) {
        return { lines: null, plainText: data.plainLyrics };
    }

    return null;
};
