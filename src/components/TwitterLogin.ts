import { generatePKCEChallenge } from '../utils/pkce.ts';
import { styles } from '../styles/twitter-login.styles.ts';

/**
 * TwitterLogin Component
 * Handles Twitter OAuth 2.0 authentication flow with PKCE
 */
export class TwitterLogin extends HTMLElement {
    private static readonly API_URL = 'http://localhost:3000/api/twitter/auth';
    private button: HTMLButtonElement | null = null;
    private errorDiv: HTMLDivElement | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
        this.setupEventListeners();
    }

    private render(): void {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = `
            <style>${styles}</style>
            <button class="login-button">Sign in with Twitter</button>
            <div class="error-message"></div>
        `;

        this.button = this.shadowRoot.querySelector('.login-button');
        this.errorDiv = this.shadowRoot.querySelector('.error-message');
    }

    private setupEventListeners(): void {
        this.button?.addEventListener('click', () => this.handleLogin());
    }

    private setLoading(isLoading: boolean): void {
        if (!this.button) return;
        this.button.disabled = isLoading;
        this.button.textContent = isLoading ? 'Connecting...' : 'Sign in with Twitter';
    }

    private showError(message: string): void {
        if (!this.errorDiv) return;
        this.errorDiv.textContent = message;
        this.setLoading(false);
    }

    private async handleLogin(): Promise<void> {
        this.setLoading(true);
        this.errorDiv!.textContent = '';

        try {
            const { verifier, challenge } = await generatePKCEChallenge();
            const state = crypto.randomUUID();

            // Store authentication state
            this.storeAuthState(verifier, state);

            const authUrl = await this.getAuthorizationUrl(challenge, state);
            window.location.href = authUrl;

        } catch (error) {
            console.error('Login error:', error);
            this.showError(
                error instanceof Error 
                    ? error.message 
                    : 'Failed to initiate login. Please try again.'
            );
        }
    }

    private storeAuthState(verifier: string, state: string): void {
        localStorage.setItem('pkce_verifier', verifier);
        localStorage.setItem('oauth_state', state);
    }

    private async getAuthorizationUrl(challenge: string, state: string): Promise<string> {
        const response = await fetch(TwitterLogin.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code_challenge: challenge, state })
        });

        if (!response.ok) {
            throw new Error('Failed to get authorization URL');
        }

        const { url } = await response.json();
        return url;
    }
}

// Register the custom element
customElements.define('twitter-login', TwitterLogin); 