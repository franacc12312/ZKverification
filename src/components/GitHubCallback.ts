export class GitHubCallback extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Create loading message
        const loadingDiv = document.createElement('div');
        loadingDiv.textContent = 'Processing GitHub login...';
        loadingDiv.style.padding = '20px';
        loadingDiv.style.textAlign = 'center';

        this.shadowRoot?.appendChild(loadingDiv);

        // Only process if we're on the callback route
        if (window.location.pathname === '/github-callback') {
            // Process the callback after a short delay to ensure URL parameters are available
            setTimeout(() => this.handleCallback(), 100);
        }
    }

    private async handleCallback() {
        try {
            // Get the code and state from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            console.log('GitHub callback URL:', window.location.href);
            console.log('GitHub callback parameters:', { code, state });

            if (!code) {
                throw new Error('No code received from GitHub');
            }

            // Exchange code for token
            const response = await fetch('http://localhost:3000/api/github/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, state })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to exchange code for token: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            console.log('Token exchange successful');

            if (data.access_token) {
                // Store the token
                localStorage.setItem('github_token', data.access_token);
                
                // Redirect back to home
                window.location.href = '/';
            } else {
                throw new Error('No access token received');
            }

        } catch (error) {
            console.error('GitHub callback error:', error);
            
            // Clear existing content
            if (this.shadowRoot) {
                while (this.shadowRoot.firstChild) {
                    this.shadowRoot.removeChild(this.shadowRoot.firstChild);
                }
            }

            // Create error message
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Failed to complete GitHub authentication. Please try again.';
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '20px';
            errorDiv.style.textAlign = 'center';
            
            // Add retry button
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Try Again';
            retryButton.style.marginTop = '10px';
            retryButton.style.padding = '8px 16px';
            retryButton.style.backgroundColor = '#2da44e';
            retryButton.style.color = 'white';
            retryButton.style.border = 'none';
            retryButton.style.borderRadius = '6px';
            retryButton.style.cursor = 'pointer';
            retryButton.addEventListener('click', () => {
                window.location.href = '/';
            });
            
            // Append error message and retry button
            this.shadowRoot?.appendChild(errorDiv);
            this.shadowRoot?.appendChild(retryButton);
        }
    }
}

customElements.define('github-callback', GitHubCallback); 