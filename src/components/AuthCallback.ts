export class AuthCallback extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.handleCallback();
    }

    private async handleCallback() {
        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
                <style>
                    .message {
                        text-align: center;
                        padding: 20px;
                        color: #1DA1F2;
                    }
                    .error {
                        color: #e0245e;
                    }
                </style>
                <div class="message">Processing authentication...</div>
            `;
        }

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const verifier = localStorage.getItem('pkce_verifier');
            const storedState = localStorage.getItem('oauth_state');

            if (!code || !verifier || !state || !storedState) {
                throw new Error('Missing required parameters');
            }

            if (state !== storedState) {
                throw new Error('Invalid state parameter');
            }

            const response = await fetch('http://localhost:3000/api/twitter/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    code_verifier: verifier,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to exchange code for token');
            }

            const data = await response.json();
            localStorage.setItem('twitter_token', data.access_token);

            // Fetch and store signed user data
            const userResponse = await fetch('http://localhost:3000/api/twitter/user', {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`,
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            localStorage.setItem('twitter_signed_data', JSON.stringify(userData));

            // Clean up PKCE and state data
            localStorage.removeItem('pkce_verifier');
            localStorage.removeItem('oauth_state');

            if (this.shadowRoot) {
                this.shadowRoot.innerHTML = `
                    <div class="message">Authentication successful! Redirecting...</div>
                `;
            }

            // Redirect to home page
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);

        } catch (error) {
            console.error('Authentication error:', error);
            if (this.shadowRoot) {
                this.shadowRoot.innerHTML = `
                    <div class="message error">
                        Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}
                        <br><br>
                        <a href="/">Return to home</a>
                    </div>
                `;
            }
        }
    }
}

// Register the custom element
customElements.define('auth-callback', AuthCallback); 