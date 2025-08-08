import React, { useState, useRef, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const SpeechToTextWithAPIKey: React.FC = () => {
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [role, setRole] = useState('');
    const [apiKey, setApiKey] = useState('');
    const { transcript, listening, resetTranscript } = useSpeechRecognition();
    const defaultRole = `Full Stack Developer - HTML, CSS, React, Java, SpringBoot, NodeJs, GoLang`;

    // Anchor that always exists where response will appear
    const responseAnchorRef = useRef<HTMLDivElement | null>(null);
    // The inner response box (scrolls to bottom as text grows)
    // const responseBoxRef = useRef<HTMLDivElement | null>(null);

    // Helper: find nearest scrollable ancestor (falls back to window/document)
    const findScrollableAncestor = (node: HTMLElement | null): HTMLElement | Document => {
        if (!node) return document;
        let current: HTMLElement | null = node.parentElement;
        while (current) {
            const style = getComputedStyle(current);
            const overflowY = style.overflowY;
            if (/(auto|scroll|overlay)/.test(overflowY) && current.scrollHeight > current.clientHeight) {
                return current;
            }
            current = current.parentElement;
        }
        return document;
    };

    // Scroll when loading starts or response updates
    useEffect(() => {
        // Only scroll when there's something to show (either loading while streaming or after response)
        if (!responseAnchorRef.current) return;

        // Scroll the nearest scrollable ancestor so the anchor is visible
        const scrollable = findScrollableAncestor(responseAnchorRef.current);
        const anchorEl = responseAnchorRef.current;
        const anchorRect = anchorEl.getBoundingClientRect();

        if (scrollable === document) {
            // page-level scroll
            const top = anchorRect.top + window.scrollY - 24; // small offset
            window.scrollTo({ top, behavior: 'smooth' });
        } else {
            const sc = scrollable as HTMLElement;
            const scRect = sc.getBoundingClientRect();
            const relativeTop = anchorRect.top - scRect.top + sc.scrollTop - 24;
            sc.scrollTo({ top: relativeTop, behavior: 'smooth' });
        }

        // Also keep the inner response box scrolled to bottom so streaming text stays visible
        // if (responseBoxRef.current) {
        //     // Use a tiny timeout to allow DOM update to happen before adjusting scroll
        //     requestAnimationFrame(() => {
        //         const box = responseBoxRef.current!;
        //         box.scrollTop = box.scrollHeight;
        //     });
        // }
    }, [response, loading]);

    const handleStart = () => {
        resetTranscript();
        setError('');
        setResponse('');
        SpeechRecognition.startListening({ continuous: true });
    };

    const handleStop = async () => {
        SpeechRecognition.stopListening();

        if (!transcript.trim()) {
            setError('Please say something before asking AI.');
            return;
        }
        if (!defaultRole.trim()) {
            setError('Please enter your role first.');
            return;
        }
        if (!apiKey.trim()) {
            setError('Please enter your API key.');
            return;
        }

        setLoading(true);
        setError('');
        setResponse('');

        try {
            const res = await fetch('https://backend-8rwr.onrender.com/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: transcript,
                    role: defaultRole.trim(),
                    apiKey: apiKey.trim(),
                }),
            });

            const contentType = res.headers.get('content-type') || '';

            // Non-stream JSON response
            if (contentType.includes('application/json')) {
                const data = await res.json();
                setResponse(data.response || JSON.stringify(data));
                setLoading(false);
                return;
            }

            // Streaming response
            if (!res.body) {
                throw new Error('No response body from server');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                let processedText = chunk;

                // Handle SSE style "data:" format
                if (chunk.includes('data:')) {
                    processedText = chunk
                        .split('\n')
                        .filter(line => line.trim() && !line.includes('[DONE]'))
                        .map(line => line.replace(/^data:\s*/, ' '))
                        .join(' ');
                }

                fullText += processedText;
                setResponse(fullText); // triggers useEffect which scrolls
            }
        } catch (err) {
            console.error('Streaming error:', err);
            setError('Failed to get response from AI. Please try again.');
        } finally {
            setLoading(false);
            resetTranscript();
            SpeechRecognition.startListening({ continuous: true });
        }
    };

    const handleClear = () => {
        SpeechRecognition.stopListening();
        resetTranscript();
        setResponse('');
        setError('');
    };

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
        return <div>Your browser does not support speech recognition.</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>🎙 AI Voice Chat</h1>
            <p style={styles.status}>
                <strong>Status:</strong> {listening ? '🎤 Listening...' : '🛑 Stopped'}
            </p>

            {/* API Key */}
            <div style={styles.inputGroup}>
                <label style={styles.label}>
                    <strong>API Key:</strong>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        style={styles.input}
                    />
                </label>
            </div>

            {/* Role */}
            <div style={styles.inputGroup}>
                <label style={styles.label}>
                    <strong>Role:</strong>
                    <input
                        type="text"
                        value={defaultRole || role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g., Full Stack Developer"
                        style={styles.input}
                    />
                </label>
            </div>

            {/* Buttons */}
            <div style={styles.buttonGroup}>
                <button style={styles.button} onClick={handleStart} disabled={listening}>
                    Start Talking
                </button>
                <button
                    style={{ ...styles.button, background: '#007bff' }}
                    onClick={handleStop}
                    disabled={loading || !listening}
                >
                    Ask AI
                </button>
                <button
                    style={{ ...styles.button, background: '#dc3545' }}
                    onClick={handleClear}
                >
                    Clear
                </button>
            </div>

            {/* Transcript */}
            <div>
                <strong>You said:</strong>
                <div style={styles.transcriptBox}>
                    {transcript || <em>Start speaking to see the transcript...</em>}
                </div>
            </div>

            <hr style={styles.divider} />

            {/* Anchor - always present so scroll target exists */}
            <div ref={responseAnchorRef} aria-hidden style={{ height: 0 }} />

            {/* Error */}
            {error && <p style={styles.error}>{error}</p>}

            {/* Loading / Response */}
            {loading ? (
                <p>🤖 AI is thinking...</p>
            ) : (
                response && (
                    <div>
                        <strong>AI says:</strong>
                        {/* <div ref={responseBoxRef} style={styles.responseBox}>{response}</div> */}
                        <div style={styles.responseBox}>{response}</div>
                    </div>
                )
            )}
        </div>
    );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '1rem',
        fontFamily: 'Arial, sans-serif',
        background: '#ffffff',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '90%',
    },
    heading: {
        textAlign: 'center',
        color: '#333',
    },
    status: {
        textAlign: 'center',
        marginBottom: '1rem',
    },
    inputGroup: {
        marginBottom: '1rem',
    },
    label: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.9rem',
        color: '#555',
    },
    input: {
        padding: '0.5rem',
        borderRadius: '5px',
        border: '1px solid #ccc',
        fontSize: '1rem',
        marginTop: '0.25rem',
        width: '100%',
    },
    buttonGroup: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '1rem',
    },
    button: {
        flex: '1',
        padding: '0.6rem',
        border: 'none',
        borderRadius: '5px',
        background: '#28a745',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'background 0.3s ease',
    },
    transcriptBox: {
        background: '#f4f4f4',
        padding: '10px',
        borderRadius: '5px',
        minHeight: '60px',
        marginTop: '5px',
        wordBreak: 'break-word',
    },
    responseBox: {
        background: '#e2ffe2',
        padding: '10px',
        borderRadius: '5px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: '300px',
        overflowY: 'auto',
        marginTop: '5px',
    },
    divider: {
        margin: '1rem 0',
    },
    error: {
        color: 'red',
        fontWeight: 'bold',
    },
};

export default SpeechToTextWithAPIKey;





