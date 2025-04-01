export class AuthStatus extends HTMLElement {
    private container: HTMLDivElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Create container
        this.container = document.createElement('div');
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .auth-status {
                margin: 20px 0;
                padding: 20px;
                border: 1px solid #e1e4e8;
                border-radius: 6px;
            }

            .service-status {
                margin: 10px 0;
                padding: 10px;
                background: #f6f8fa;
                border-radius: 4px;
            }

            .user-info {
                margin-top: 10px;
                font-size: 14px;
            }

            .crypto-info {
                background: #f0f6fc;
                padding: 12px;
                border-radius: 6px;
                margin-top: 10px;
                font-family: monospace;
                font-size: 12px;
                word-break: break-all;
            }

            .crypto-info h4 {
                margin: 0 0 8px 0;
                color: #24292e;
            }

            .crypto-info p {
                margin: 4px 0;
            }

            .crypto-label {
                color: #0366d6;
                font-weight: bold;
            }

            .user-info p {
                margin: 5px 0;
            }

            .disconnect-button {
                background-color: #d73a49;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
            }

            .disconnect-button:hover {
                background-color: #cb2431;
            }

            .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                margin-left: 8px;
            }

            .connected {
                background-color: #2ea043;
                color: white;
            }

            .disconnected {
                background-color: #d1d5da;
                color: #24292e;
            }

            .error-message {
                color: #d73a49;
                font-size: 14px;
                margin-top: 8px;
            }
        `;

        this.shadowRoot?.appendChild(style);
        this.shadowRoot?.appendChild(this.container);

        // Initial render
        this.render();

        // Listen for storage changes
        window.addEventListener('storage', () => this.render());
        document.addEventListener('auth-status-changed', () => this.render());
    }

    private async getTwitterUserInfo() {
        const token = localStorage.getItem('twitter_token');
        if (!token) return null;

        try {
            const response = await fetch('http://localhost:3000/api/twitter/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch Twitter user data');
            const data = await response.json();
            console.log('Twitter user data:', data);
            return data;
        } catch (error) {
            console.error('Error fetching Twitter user:', error);
            return null;
        }
    }

    private async getGitHubUserInfo() {
        const token = localStorage.getItem('github_token');
        if (!token) return null;

        try {
            const response = await fetch('http://localhost:3000/api/github/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch GitHub user data');
            const data = await response.json();
            console.log('GitHub user data:', data);
            return data;
        } catch (error) {
            console.error('Error fetching GitHub user:', error);
            return null;
        }
    }

    private renderTwitterUserInfo(user: any) {
        if (!user) return '';
        
        const twitterData = user.twitter_data || {};
        const signature = user.signature || {};
        const publicKey = user.publicKey || {};
        
        return `
            <div class="user-info">
                <p><strong>Username:</strong> ${twitterData.username ? '@' + twitterData.username : 'N/A'}</p>
                <p><strong>Name:</strong> ${twitterData.name || 'N/A'}</p>
                ${twitterData.public_metrics ? `
                    <p><strong>Followers:</strong> ${twitterData.public_metrics.followers_count || 0}</p>
                ` : ''}
                
                <div class="crypto-info">
                    <h4>ECDSA Signature Details</h4>
                    <p><span class="crypto-label">Message Hash:</span> ${user.messageHash || 'N/A'}</p>
                    <p><span class="crypto-label">Signature (r):</span> ${signature.r || 'N/A'}</p>
                    <p><span class="crypto-label">Signature (s):</span> ${signature.s || 'N/A'}</p>
                    <p><span class="crypto-label">Public Key (x):</span> ${publicKey.x || 'N/A'}</p>
                    <p><span class="crypto-label">Public Key (y):</span> ${publicKey.y || 'N/A'}</p>
                </div>

                <button class="disconnect-button" data-service="twitter">Disconnect Twitter</button>
            </div>
        `;
    }

    private renderGitHubUserInfo(user: any) {
        if (!user) return '';
        
        return `
            <div class="user-info">
                <p><strong>Username:</strong> ${user.login || 'N/A'}</p>
                <p><strong>Name:</strong> ${user.name || 'N/A'}</p>
                <p><strong>Repositories:</strong> ${user.public_repos || 0}</p>
                <button class="disconnect-button" data-service="github">Disconnect GitHub</button>
            </div>
        `;
    }

    private async render() {
        try {
            const twitterToken = localStorage.getItem('twitter_token');
            const githubToken = localStorage.getItem('github_token');

            const [twitterUser, githubUser] = await Promise.all([
                this.getTwitterUserInfo(),
                this.getGitHubUserInfo()
            ]);

            this.container.innerHTML = `
                <div class="auth-status">
                    <h2>Authentication Status</h2>
                    
                    <div class="service-status">
                        <h3>Twitter 
                            <span class="status-badge ${twitterToken ? 'connected' : 'disconnected'}">
                                ${twitterToken ? 'Connected' : 'Disconnected'}
                            </span>
                        </h3>
                        ${this.renderTwitterUserInfo(twitterUser)}
                    </div>

                    <div class="service-status">
                        <h3>GitHub
                            <span class="status-badge ${githubToken ? 'connected' : 'disconnected'}">
                                ${githubToken ? 'Connected' : 'Disconnected'}
                            </span>
                        </h3>
                        ${this.renderGitHubUserInfo(githubUser)}
                    </div>
                </div>
            `;

            // Add event listeners for disconnect buttons
            this.container.querySelectorAll('.disconnect-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const service = (e.target as HTMLButtonElement).dataset.service;
                    if (service === 'twitter') {
                        localStorage.removeItem('twitter_token');
                    } else if (service === 'github') {
                        localStorage.removeItem('github_token');
                    }
                    this.render();
                    document.dispatchEvent(new Event('auth-status-changed'));
                });
            });
        } catch (error) {
            console.error('Error rendering auth status:', error);
            this.container.innerHTML = `
                <div class="auth-status">
                    <h2>Authentication Status</h2>
                    <p class="error-message">Error loading authentication status. Please try refreshing the page.</p>
                </div>
            `;
        }
    }
}

customElements.define('auth-status', AuthStatus); 