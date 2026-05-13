/**
 * Components/MicMeter.jsx
 * Visual RMS-level meter for the mic input. A vertical bar grows from the
 * bottom as the mic gets louder — gives the singer immediate feedback that
 * their voice is being captured. Turns red at clipping levels.
 *
 * Props:
 *   rms       — 0–1 float from useVAD (raw RMS; boosted internally for display)
 *   hasStream — true once the MediaStream is live
 *   error     — string error code from useMicrophone, or null
 */

import { Box, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

// Raw mic RMS tends to sit well under 0.1 even for loud singing, so we
// scale it up so the bar actually moves noticeably on screen.
const DISPLAY_SCALE = 10;
const BAR_HEIGHT = 80;

export default function MicMeter({ rms, hasStream, error }) {
    const fillPct = Math.min(100, rms * DISPLAY_SCALE * 100);
    const isClipping = fillPct > 85;

    let tooltip;
    if (error === 'microphone_denied') tooltip = 'Mic permission denied — check browser settings';
    else if (error === 'microphone_not_found') tooltip = 'No microphone found';
    else if (!hasStream) tooltip = 'Requesting mic…';
    else tooltip = 'Mic active';

    return (
        <Tooltip title={tooltip} arrow placement="left">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                {error ? (
                    <MicOffIcon sx={{ color: 'error.main', fontSize: 22 }} />
                ) : (
                    <MicIcon
                        sx={{
                            fontSize: 22,
                            color: hasStream ? 'primary.main' : 'text.disabled',
                            transition: 'color 300ms ease',
                        }}
                    />
                )}

                {/* Vertical bar track */}
                <Box
                    sx={{
                        width: 10,
                        height: BAR_HEIGHT,
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    {/* Fill rises from the bottom */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: `${fillPct}%`,
                            bgcolor: isClipping ? 'error.main' : 'primary.main',
                            borderRadius: 2,
                            transition: 'height 80ms linear, background-color 150ms ease',
                        }}
                    />
                </Box>
            </Box>
        </Tooltip>
    );
}
