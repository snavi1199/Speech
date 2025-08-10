import React from 'react';

interface Props {
    onClose: () => void;
}

const APIKeyGuide: React.FC<Props> = ({ onClose }) => {
    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h2>🔑 How to Create Your API Key</h2>
                <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
                    <li>Go to <a href="https://openrouter.ai/" target="_blank" rel="noreferrer">OpenRouter.ai</a></li>
                    <li>Sign in or create a free account</li>
                    <li>Click on your profile and go to <strong>API Keys</strong></li>
                    <li>Click <strong>Generate New Key</strong></li>
                    <li>Copy the key and paste it into the API Key field in the app</li>
                </ol>
                <button style={styles.closeButton} onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    modal: {
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
    },
    closeButton: {
        marginTop: '15px',
        padding: '8px 14px',
        border: 'none',
        background: '#007bff',
        color: '#fff',
        borderRadius: '5px',
        cursor: 'pointer',
    },
};

export default APIKeyGuide;
