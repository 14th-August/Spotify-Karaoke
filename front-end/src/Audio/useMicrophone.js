/**
 * Audio/useMicrophone.js
 * Requests microphone access via getUserMedia and returns the live stream.
 * The stream is stopped automatically when the component using this hook
 * unmounts — no manual cleanup needed at the call site.
 *
 * Return shape: { stream: MediaStream | null, error: string | null }
 *   error values:
 *     'microphone_denied'    — user clicked "Block" on the permission prompt
 *     'microphone_not_found' — device has no mic, or it's in use elsewhere
 *     'microphone_error'     — any other getUserMedia failure
 */

import { useEffect, useState } from 'react';

export default function useMicrophone() {
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let localStream = null;

        navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then((s) => {
                localStream = s;
                setStream(s);
            })
            .catch((err) => {
                // Map browser error names to our own stable string codes so
                // callers don't have to know the exact DOMException names.
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setError('microphone_denied');
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    setError('microphone_not_found');
                } else {
                    setError('microphone_error');
                }
            });

        return () => {
            // Stop every track so the browser releases the mic indicator light.
            if (localStream) {
                localStream.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    return { stream, error };
}
