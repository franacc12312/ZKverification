export const styles = `
    .login-button {
        background-color: #1DA1F2;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 16px;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
        font-weight: 600;
        min-width: 200px;
    }

    .login-button:hover {
        background-color: #1a91da;
        transform: translateY(-1px);
    }

    .login-button:active {
        transform: translateY(0);
    }

    .login-button:disabled {
        background-color: #9fd0f5;
        cursor: not-allowed;
        transform: none;
    }

    .error-message {
        color: #e0245e;
        margin-top: 12px;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transition: opacity 0.3s;
    }

    .error-message:not(:empty) {
        opacity: 1;
    }
`; 