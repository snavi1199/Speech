import React, { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import axios from 'axios';

const SpeechToTextWithAPIKey: React.FC = () => {
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [role, setRole] = useState('');
    const [apiKey, setApiKey] = useState(''); // NEW: API key input
    const { transcript, listening, resetTranscript } = useSpeechRecognition();

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

        try {
            const res = await axios.post('https://backend-8rwr.onrender.com/api/chat', {
                prompt: transcript,
                role: role.trim(),
                apiKey: apiKey.trim(), // Send to backend
            });
            setResponse(res.data.response);
        } catch (err) {
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
        <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'Arial' }}>
            <h1>🎙 AI Voice Chat</h1>
            <p><strong>Status:</strong> {listening ? '🎤 Listening...' : '🛑 Stopped'}</p>

            {/* API Key Input */}
            <div style={{ marginBottom: '1rem' }}>
                <label>
                    <strong>API Key:</strong>{' '}
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        style={{ width: '300px' }}
                    />
                </label>
            </div>

            {/* Role Input */}
            <div style={{ marginBottom: '1rem' }}>
                <label>
                    <strong>Role:</strong>{' '}
                    <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g., Full Stack Developer"
                        style={{ width: '300px' }}
                    />
                </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <button onClick={handleStart} disabled={listening}>Start Talking</button>{' '}
                <button onClick={handleStop} disabled={loading || !listening}>Ask AI</button>{' '}
                <button onClick={handleClear}>Clear</button>
            </div>

            <div>
                <strong>You said:</strong>
                <div style={{
                    background: '#f4f4f4',
                    padding: '10px',
                    borderRadius: '5px',
                    minHeight: '60px',
                    marginTop: '5px'
                }}>
                    {transcript || <em>Start speaking to see the transcript...</em>}
                </div>
            </div>

            <hr />

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading ? (
                <p>🤖 AI is thinking...</p>
            ) : (
                response && (
                    <div>
                        <strong>AI says:</strong>
                        <div style={{
                            background: '#e2ffe2',
                            padding: '10px',
                            borderRadius: '5px',
                            whiteSpace: 'pre-wrap',
                            marginTop: '5px'
                        }}>
                            {response}
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default SpeechToTextWithAPIKey;
