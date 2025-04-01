export const styles = `
    .container {
        padding: 20px;
        text-align: left;
        max-width: 600px;
        margin: 0 auto;
    }

    .success-message {
        color: #2ea043;
        margin-bottom: 24px;
        font-size: 16px;
        font-weight: 600;
    }

    .data-container {
        background-color: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #e1e4e8;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .data-container:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .data-title {
        font-weight: 600;
        margin-bottom: 12px;
        color: #24292e;
        font-size: 15px;
    }

    .data-field {
        margin-bottom: 8px;
        font-size: 14px;
        color: #57606a;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .data-field strong {
        color: #24292e;
        min-width: 100px;
    }

    .logout-btn {
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: background-color 0.2s, transform 0.1s;
        width: 100%;
        margin-top: 12px;
    }

    .logout-btn:hover {
        background-color: #c82333;
        transform: translateY(-1px);
    }

    .logout-btn:active {
        transform: translateY(0);
    }
`; 