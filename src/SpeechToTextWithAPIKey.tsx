import React, { useState, useRef, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import APIKeyGuide from './APIKeyGuide';

const SpeechToTextWithAPIKey: React.FC = () => {
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [role, setRole] = useState(`Coding in Data Structure Algorithm using Java - LeetCode problems think medium and hard - amazon dsa interview round`);
    const [apiKey, setApiKey] = useState('');
    const [showKeyGuide, setShowKeyGuide] = useState(false);

    const [fullTranscript, setFullTranscript] = useState("");
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [sectionName, setSectionName] = useState("");
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyTab, setHistoryTab] = useState<'current' | 'old'>('current');

    const { transcript, listening, resetTranscript } = useSpeechRecognition();

    // New approach: separate base (edited/saved) + live transcript
    const [baseTranscript, setBaseTranscript] = useState(''); // holds the edited/saved base
    const [isEditing, setIsEditing] = useState(false);
    const [editableTranscript, setEditableTranscript] = useState('');

    const responseAnchorRef = useRef<HTMLDivElement | null>(null);

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

    useEffect(() => {
        if (!responseAnchorRef.current) return;
        const scrollable = findScrollableAncestor(responseAnchorRef.current);
        const anchorRect = responseAnchorRef.current.getBoundingClientRect();

        if (scrollable === document) {
            const top = anchorRect.top + window.scrollY - 24;
            window.scrollTo({ top, behavior: 'smooth' });
        } else {
            const sc = scrollable as HTMLElement;
            const scRect = sc.getBoundingClientRect();
            const relativeTop = anchorRect.top - scRect.top + sc.scrollTop - 24;
            sc.scrollTo({ top: relativeTop, behavior: 'smooth' });
        }
    }, [response, loading]);

    const handleStart = () => {
        // Start fresh live transcript
        resetTranscript();
        setError('');
        setResponse('');
        SpeechRecognition.startListening({ continuous: true });
    };

    const getCombinedText = () => {
        // When editing, use editable value
        if (isEditing) return editableTranscript.trim();
        // Not editing: use base + live transcript (live may be empty)
        const live = transcript.trim();
        if (baseTranscript && live) return (baseTranscript + ' ' + live).trim();
        if (baseTranscript) return baseTranscript.trim();
        return live;
    };

    const handleStop = async () => {
        const currentText = getCombinedText();
        if (!currentText.trim()) {
            setError('Please say something before asking AI.');
            return;
        }
        if (!role.trim()) {
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
        resetTranscript();
        setBaseTranscript(''); // Clear base transcript after sending to AI
        setEditableTranscript(''); // Clear editable as well

        try {
            const res = await fetch('https://backend-8rwr.onrender.com/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: currentText,
                    role: role.trim(),
                    apiKey: apiKey.trim(),
                }),
            });

            const contentType = res.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                const data = await res.json();
                if (data.response) {
                    setResponse(data.response);
                } else {
                    setError('No valid response from AI.');
                }
                setLoading(false);
                // keep listening state as is (do not change)
                setFullTranscript((prev) => prev + (prev ? "--" : "") + currentText);
                return;
            }

            if (!res.body) throw new Error('No response body from server');

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                let processedText = chunk;

                if (chunk.includes('data:')) {
                    processedText = chunk
                        .split('\n')
                        .filter(line => line.trim() && !line.includes('[DONE]'))
                        .map(line => line.replace(/^data:\s*/, ' '))
                        .join(' ');
                }

                fullText += processedText;
                setResponse(fullText);
            }

            setFullTranscript((prev) => prev + (prev ? "--" : "") + currentText);

        } catch (err) {
            console.error('Streaming error:', err);
            setError('Failed to get response from AI. Please try again.');
        } finally {
            setLoading(false);
            // Keep listening after asking AI
            SpeechRecognition.startListening({ continuous: true });
        }
    };

    const handleListenStop = () => {
        SpeechRecognition.stopListening();
        setShowSaveModal(true);
        resetTranscript();
        setResponse('');
        setError('');
    };

    const handleClear = () => {
        resetTranscript();
        setError('');
        setBaseTranscript('');
        setEditableTranscript('');
        setFullTranscript('');
    };

    // Edit toggle using baseTranscript to avoid overwrite issues
    const handleEditToggle = () => {
        if (!isEditing) {
            // Enter edit mode
            // Stop listening to avoid live updates
            SpeechRecognition.stopListening();
            // Pre-fill editable with current combined text (base + live)
            const live = transcript.trim();
            const combined = baseTranscript ? (baseTranscript + (live ? ' ' + live : '')).trim() : live;
            setEditableTranscript(combined);
            setIsEditing(true);
        } else {
            // Exit edit mode -> commit edited text into baseTranscript, reset live transcript and resume listening
            const trimmed = editableTranscript.trim();
            setBaseTranscript(trimmed);
            resetTranscript(); // clear the live transcript buffer so new speech doesn't duplicate
            setIsEditing(false);
            // Small timeout sometimes helps the browser to start mic again reliably; optional
            setTimeout(() => {
                SpeechRecognition.startListening({ continuous: true });
            }, 50);
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditableTranscript(e.target.value);
    };

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
        return <div>Your browser does not support speech recognition.</div>;
    }

    const handleSaveSection = () => {
        const trimmedTranscript = fullTranscript.trim();
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeSectionName = sectionName.trim()
            ? sectionName.trim().replace(/[^a-zA-Z0-9-_]/g, '_')
            : 'Transcript';
        const fileName = `${safeSectionName}_${dateStr}.txt`;

        const blob = new Blob([trimmedTranscript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setShowSaveModal(false);
        setSectionName("");
        setFullTranscript("");
        resetTranscript();
        setBaseTranscript('');
        setEditableTranscript('');
    };

    // Display text: if editing -> editableTextarea, else base + live
    const displayText = isEditing
        ? editableTranscript
        : ((baseTranscript ? baseTranscript : '') + (transcript.trim() ? (baseTranscript ? ' ' : '') + transcript.trim() : '')).trim();

    return (
        <div style={styles.container}>
            {showKeyGuide && <APIKeyGuide onClose={() => setShowKeyGuide(false)} />}

            {/* SAVE MODAL */}
            {showSaveModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Save Transcript Section</h3>
                        <input
                            type="text"
                            value={sectionName}
                            onChange={(e) => setSectionName(e.target.value)}
                            placeholder="Enter section name"
                            style={styles.input}
                        />
                        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                            <button
                                style={{
                                    ...styles.button,
                                    background: (!sectionName || !fullTranscript) ? '#ccc' : styles.button.background,
                                    color: (!sectionName || !fullTranscript) ? '#666' : styles.button.color,
                                    cursor: (!sectionName || !fullTranscript) ? 'not-allowed' : styles.button.cursor,
                                }}
                                onClick={handleSaveSection}
                                disabled={!sectionName || !fullTranscript}
                            >
                                Download
                            </button>
                            <button
                                style={{ ...styles.button, background: "#dc3545" }}
                                onClick={() => setShowSaveModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL */}
            {showHistoryModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Chat History</h3>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <button
                                onClick={() => setHistoryTab('current')}
                                style={{
                                    flex: 1,
                                    background: historyTab === 'current' ? '#28a745' : '#ccc',
                                    color: '#fff',
                                    padding: '6px',
                                    border: 'none',
                                    borderRadius: '4px'
                                }}
                            >
                                Current Chat
                            </button>
                            <button
                                onClick={() => setHistoryTab('old')}
                                disabled={true}
                                style={{
                                    flex: 1,
                                    background: historyTab === 'old' ? '#007bff' : '#ccc',
                                    color: '#fff',
                                    padding: '6px',
                                    border: 'none',
                                    borderRadius: '4px'
                                }}
                            >
                                Old History
                            </button>
                        </div>
                        {historyTab === 'current' ? (
                            <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#f4f4f4', padding: '10px', borderRadius: '5px' }}>
                                {fullTranscript ? fullTranscript : <em>No speech recorded yet.</em>}
                            </div>
                        ) : (
                            <div style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px' }}>
                                <em>No old history yet.</em>
                            </div>
                        )}
                        <div style={{ textAlign: 'right', marginTop: '10px' }}>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                style={{ background: '#dc3545', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div style={styles.topBar}>
                <h1 style={styles.heading}>🎙 AI Help</h1>
                <div style={styles.topBarButtons}>
                    <button
                        style={styles.stopButton}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0px 4px 12px rgba(217, 4, 41, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={handleListenStop}
                    >
                        Stop
                    </button>
                    <button style={styles.getKeyButton} onClick={() => setShowKeyGuide(true)}>
                        Get API Key
                    </button>
                    <button style={{ ...styles.getKeyButton, background: '#ff9800' }} onClick={() => setShowHistoryModal(true)}>
                        History
                    </button>
                </div>
            </div>

            <p style={styles.status}>
                <strong>Status:</strong> {listening ? '🎤 Listening...' : '🛑 Stopped'}
            </p>

            {/* API Key Input */}
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

            {/* Role Input */}
            <div style={styles.inputGroup}>
                <label style={styles.label}>
                    <strong>Role:</strong>
                    <input
                        type="text"
                        value={role}
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
                <button style={{ ...styles.button, background: '#dc3545' }} onClick={handleClear}>
                    Clear
                </button>
            </div>

            {/* Transcript Display with Edit Mode */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>You said:</strong>
                    {(displayText) && (
                        <button
                            style={{
                                ...styles.button,
                                background: isEditing ? '#17a2b8' : '#6c63ff',
                                flex: 'none',
                                padding: '5px 10px',
                                fontSize: '0.85rem',
                                borderRadius: '5px',
                            }}
                            onClick={handleEditToggle}
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <textarea
                        value={editableTranscript}
                        onChange={handleEditChange}
                        style={{
                            ...styles.transcriptBox,
                            background: '#fffbea',
                            width: '100%',
                            height: '100px',
                            resize: 'vertical',
                            border: '1px solid #ccc',
                            outline: 'none',
                            fontFamily: 'inherit',
                        }}
                    />
                ) : (
                    <div style={styles.transcriptBox}>
                        {displayText || <em>Start speaking to see the transcript...</em>}
                    </div>
                )}
            </div>

            <hr style={styles.divider} />

            <div ref={responseAnchorRef} aria-hidden style={{ height: 0 }} />

            {error && <p style={styles.error}>{error}</p>}

            {loading ? (
                <p>🤖 AI is thinking...</p>
            ) : (
                response && (
                    <div>
                        <strong>AI says:</strong>
                        <div style={styles.responseBox}>{response}</div>
                    </div>
                )
            )}
        </div>
    );
};

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
        position: 'relative',
    },
    topBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
    },
    heading: {
        fontSize: '1.5rem',
        margin: 0,
        color: '#333',
    },
    topBarButtons: {
        display: 'flex',
        gap: '10px',
    },
    stopButton: {
        background: 'linear-gradient(90deg, #ff4b5c, #d90429)',
        color: '#fff',
        border: 'none',
        padding: '5px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        cursor: 'pointer',
        height: '35px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    getKeyButton: {
        background: '#6c63ff',
        color: '#fff',
        border: 'none',
        padding: '5px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        cursor: 'pointer',
        height: '35px',
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
        background: '#eaf4ff',
        padding: '10px',
        borderRadius: '5px',
        marginTop: '5px',
        whiteSpace: 'pre-wrap',
    },
    divider: {
        margin: '1rem 0',
        border: 'none',
        borderBottom: '1px solid #ddd',
    },
    error: {
        color: '#d9534f',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modalContent: {
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
};

export default SpeechToTextWithAPIKey;

