import { styles } from '../styles/authenticated-view.styles.ts';
import { TwitterData } from '../types/twitter.types.ts';

/**
 * AuthenticatedView Component
 * Displays authenticated user data and ECDSA signature details
 */
export class AuthenticatedView extends HTMLElement {
    private static readonly STORAGE_KEYS = {
        SIGNED_DATA: 'twitter_signed_data',
        TOKEN: 'twitter_token',
        VERIFIER: 'pkce_verifier',
        STATE: 'oauth_state'
    };

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
        this.setupEventListeners();
    }

    private render(): void {
        if (!this.shadowRoot) return;

        const data = this.getStoredData();
        this.shadowRoot.innerHTML = `
            <style>${styles}</style>
            <div class="container">
                <p class="success-message">✅ Successfully authenticated with Twitter!</p>
                
                ${this.renderDataSection('Twitter User Data', {
                    'User ID': data?.twitter_data?.id,
                    'Created At': data?.twitter_data?.created_at
                })}

                ${this.renderDataSection('ECDSA Signature', {
                    'Message Hash': data?.messageHash,
                    'Signature (r)': data?.signature?.r,
                    'Signature (s)': data?.signature?.s
                })}

                ${this.renderDataSection('Public Key', {
                    'X': data?.publicKey?.x,
                    'Y': data?.publicKey?.y
                })}

                <button class="logout-btn">Logout</button>
            </div>
        `;
    }

    private setupEventListeners(): void {
        this.shadowRoot
            ?.querySelector('.logout-btn')
            ?.addEventListener('click', () => this.handleLogout());
    }

    private getStoredData(): TwitterData | null {
        try {
            const data = localStorage.getItem(AuthenticatedView.STORAGE_KEYS.SIGNED_DATA);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error parsing stored data:', error);
            return null;
        }
    }

    private renderDataSection(title: string, fields: Record<string, string | undefined>): string {
        const fieldHtml = Object.entries(fields)
            .map(([label, value]) => `
                <div class="data-field">
                    <strong>${label}:</strong> ${value || 'N/A'}
                </div>
            `)
            .join('');

        return `
            <div class="data-container">
                <div class="data-title">${title}</div>
                ${fieldHtml}
            </div>
        `;
    }

    private handleLogout(): void {
        // Clear all authentication data
        Object.values(AuthenticatedView.STORAGE_KEYS)
            .forEach(key => localStorage.removeItem(key));
        
        // Reload page to show login view
        window.location.reload();
    }
}

// Register the custom element
customElements.define('authenticated-view', AuthenticatedView); 