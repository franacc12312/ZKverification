export const config = {
    github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        callbackUrl: process.env.GITHUB_CALLBACK_URL || '',
        scope: process.env.GITHUB_SCOPE || ''
    },
    server: {
        port: process.env.PROXY_PORT || 3000,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174'
    }
}; 