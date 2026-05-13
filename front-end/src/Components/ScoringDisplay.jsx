/**
 * Components/ScoringDisplay.jsx
 * Shows the running karaoke score (0–100) and a compact history of the
 * last few line results as coloured chips (✓ green / ✗ red).
 *
 * Props:
 *   score       — number, 0–100
 *   lineResults — Array<{ correct: boolean, text: string }>
 */

import { Box, Chip, Stack, Typography } from '@mui/material';

// Show the most recent N line results so the chip row doesn't overflow.
const MAX_CHIPS = 8;

export default function ScoringDisplay({ score, lineResults }) {
    const recent = lineResults.slice(-MAX_CHIPS);

    return (
        <Box sx={{ textAlign: 'center' }}>
            <Typography
                variant="h3"
                sx={{
                    fontWeight: 700,
                    color: 'primary.main',
                    lineHeight: 1,
                    mb: 0.25,
                    // Tabular nums keep the score from jumping horizontally
                    // as digits change.
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {Math.round(score)}
            </Typography>
            <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.06em' }}
            >
                SCORE
            </Typography>

            {recent.length > 0 && (
                <Stack
                    direction="row"
                    gap={0.5}
                    sx={{ mt: 1.5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 200 }}
                >
                    {recent.map((r, i) => (
                        <Chip
                            key={i}
                            label={r.correct ? '✓' : '✗'}
                            size="small"
                            sx={{
                                bgcolor: r.correct ? 'success.main' : 'error.main',
                                color: '#fff',
                                fontWeight: 700,
                                height: 20,
                                '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' },
                            }}
                        />
                    ))}
                </Stack>
            )}
        </Box>
    );
}
