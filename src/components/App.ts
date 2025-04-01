export class App extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    private render() {
        const isAuthenticated = localStorage.getItem('twitter_token') && localStorage.getItem('twitter_signed_data');

        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = `
                <style>
                    .container {
                        text-align: center;
                        padding: 20px;
                        background-color: white;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        min-width: 600px;
                    }
                    h1 {
                        color: #1DA1F2;
                        margin-bottom: 30px;
                    }
                </style>
                <div class="container">
                    <h1>Twitter Authentication</h1>
                    ${isAuthenticated 
                        ? '<authenticated-view></authenticated-view>' 
                        : '<twitter-login></twitter-login>'}
                </div>
            `;
        }
    }
}

// Register the custom element
customElements.define('app-root', App); 