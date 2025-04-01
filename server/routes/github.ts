import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

// Generate GitHub OAuth URL
router.post('/auth', async (req, res) => {
    try {
        console.log('Received GitHub auth request');
        
        const clientId = process.env.GITHUB_CLIENT_ID;
        if (!clientId) {
            console.error('Missing GITHUB_CLIENT_ID in environment');
            return res.status(500).json({ error: 'GitHub client configuration missing' });
        }

        // Generate random state for CSRF protection
        const state = crypto.randomBytes(16).toString('hex');

        // Store state in session or cache for validation during callback
        // TODO: Implement state storage for validation

        // Construct authorization URL with required parameters
        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('redirect_uri', 'http://localhost:5173/github-callback');
        params.append('scope', 'read:user repo');
        params.append('state', state);
        params.append('response_type', 'code');
        params.append('allow_signup', 'true');

        const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
        console.log('Generated GitHub auth URL:', authUrl);

        // Validate URL format
        try {
            new URL(authUrl);
        } catch (e) {
            console.error('Invalid auth URL generated:', e);
            return res.status(500).json({ error: 'Invalid authorization URL generated' });
        }

        res.json({ url: authUrl });
    } catch (error) {
        console.error('GitHub Auth URL generation error:', error);
        res.status(500).json({ error: 'Failed to generate GitHub auth URL' });
    }
});

// Handle token exchange
router.post('/token', async (req, res) => {
    try {
        console.log('Received GitHub token exchange request');
        const { code, state } = req.body;

        if (!code) {
            console.error('Missing code');
            return res.status(400).json({ error: 'Code is required' });
        }

        // TODO: Validate state parameter against stored state

        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
            redirect_uri: 'http://localhost:5173/github-callback'
        }, {
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('Received GitHub token response');
        res.json(response.data);
    } catch (error) {
        console.error('GitHub Token exchange error:', error);
        res.status(500).json({ error: 'Failed to exchange GitHub token' });
    }
});

// Get user data
router.get('/user', async (req, res) => {
    try {
        console.log('Received GitHub user data request');
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            console.error('Invalid authorization header');
            return res.status(401).json({ error: 'Invalid authorization header' });
        }

        const token = authHeader.split(' ')[1];

        const response = await axios.get('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        console.log('Received GitHub user data');
        res.json(response.data);
    } catch (error) {
        console.error('GitHub User data fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub user data' });
    }
});

export default router;  