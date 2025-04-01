export class GitHubLogin extends HTMLElement {
    private button: HTMLButtonElement;
    private errorDiv: HTMLDivElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Create elements
        this.button = document.createElement('button');
        this.button.textContent = 'Connect GitHub';
        this.button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.handleLogin();
        });

        this.errorDiv = document.createElement('div');
        this.errorDiv.className = 'error';
        this.errorDiv.style.display = 'none';
        this.errorDiv.style.color = 'red';
        this.errorDiv.style.marginTop = '10px';

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            button {
                background-color: #2da44e;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
            }

            button:hover {
                background-color: #2c974b;
            }

            button:disabled {
                background-color: #94d3a2;
                cursor: not-allowed;
            }

            .error {
                font-size: 14px;
                margin-top: 8px;
            }
        `;

        // Append elements to shadow DOM
        this.shadowRoot?.appendChild(style);
        this.shadowRoot?.appendChild(this.button);
        this.shadowRoot?.appendChild(this.errorDiv);
    }

    private showError(message: string) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
        setTimeout(() => {
            this.errorDiv.style.display = 'none';
        }, 5000);
    }

    private async handleLogin() {
        try {
            this.button.disabled = true;
            this.button.textContent = 'Connecting...';

            console.log('Initiating GitHub login...');

            // Request auth URL from backend
            const response = await fetch('http://localhost:3000/api/github/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                throw new Error('Failed to get authorization URL');
            }

            const data = await response.json();
            console.log('Received auth URL:', data.url);
            
            if (!data.url) {
                throw new Error('No authorization URL received');
            }

            // Validate URL before redirecting
            try {
                const url = new URL(data.url);
                if (!url.searchParams.get('client_id') || !url.searchParams.get('state')) {
                    throw new Error('Invalid GitHub authorization URL');
                }
                
                // Redirect to GitHub
                console.log('Redirecting to GitHub auth page:', url.toString());
                window.location.href = url.toString();
            } catch (e) {
                throw new Error('Invalid GitHub authorization URL');
            }

        } catch (error) {
            console.error('GitHub login error:', error);
            this.showError('Failed to connect to GitHub. Please try again.');
            this.button.disabled = false;
            this.button.textContent = 'Connect GitHub';
        }
    }
}

customElements.define('github-login', GitHubLogin); 