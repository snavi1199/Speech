import React, { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import axios from 'axios';

const SpeechToText: React.FC = () => {
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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

        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5000/api/chat', {
                prompt: transcript,
            });
            setResponse(res.data.response);
        } catch (err) {
            setError('Failed to get response from AI. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
        return <div>Your browser does not support speech recognition.</div>;
    }

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'Arial' }}>
            <h1>🎙 AI Voice Chat</h1>
            <p><strong>Status:</strong> {listening ? '🎤 Listening...' : '🛑 Stopped'}</p>
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={handleStart} disabled={listening}>Start Talking</button>{' '}
                <button onClick={handleStop} disabled={loading || !listening}>Ask AI</button>{' '}
                <button onClick={() => resetTranscript()}>Clear</button>
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

export default SpeechToText;
