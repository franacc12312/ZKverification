import { Router } from 'express';
import elliptic from 'elliptic';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();
const ec = new elliptic.ec('secp256k1');

// Generate a key pair for ECDSA signing (in production, this should be stored securely)
const key = ec.genKeyPair();

// Generate Twitter OAuth URL with PKCE
router.post('/auth', async (req, res) => {
    try {
        console.log('Received auth request:', req.body);
        const { code_challenge, state } = req.body;
        
        if (!code_challenge) {
            console.error('No code challenge provided');
            return res.status(400).json({ error: 'Code challenge is required' });
        }

        if (!process.env.TWITTER_CLIENT_ID) {
            console.error('Missing TWITTER_CLIENT_ID in environment');
            return res.status(500).json({ error: 'Twitter client configuration missing' });
        }

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.TWITTER_CLIENT_ID,
            redirect_uri: process.env.REDIRECT_URI || 'http://localhost:5174/callback',
            scope: 'tweet.read users.read',
            code_challenge: code_challenge,
            code_challenge_method: 'S256',
            state: state || crypto.randomBytes(32).toString('hex')
        });

        const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
        console.log('Generated auth URL:', authUrl);
        res.json({ url: authUrl });
    } catch (error) {
        console.error('Auth URL generation error:', error);
        res.status(500).json({ error: 'Failed to generate auth URL' });
    }
});

// Handle token exchange
router.post('/token', async (req, res) => {
    try {
        console.log('Received token exchange request:', req.body);
        const { code, code_verifier } = req.body;

        if (!code || !code_verifier) {
            console.error('Missing code or code verifier');
            return res.status(400).json({ error: 'Code and code verifier are required' });
        }

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.REDIRECT_URI || 'http://localhost:5174/callback',
            code_verifier: code_verifier
        });

        console.log('Sending token request to Twitter');
        const response = await axios.post('https://api.twitter.com/2/oauth2/token', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(
                    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
                ).toString('base64')}`
            }
        });

        console.log('Received token response');
        res.json(response.data);
    } catch (error) {
        console.error('Token exchange error:', error);
        res.status(500).json({ error: 'Failed to exchange token' });
    }
});

// Get user data and sign it with ECDSA
router.get('/user', async (req, res) => {
    try {
        console.log('Received user data request');
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            console.error('Invalid authorization header');
            return res.status(401).json({ error: 'Invalid authorization header' });
        }

        const token = authHeader.split(' ')[1];

        console.log('Fetching user data from Twitter');
        const response = await axios.get('https://api.twitter.com/2/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            params: {
                'user.fields': 'created_at,public_metrics'
            }
        });

        const userData = response.data.data;
        console.log('Received user data:', userData);

        // Sign the user data
        const serializedData = JSON.stringify(userData, Object.keys(userData).sort());
        const msgHash = crypto.createHash('sha256').update(serializedData).digest();
        const signature = key.sign(msgHash);

        // Create signed payload
        const signedPayload = {
            twitter_data: userData,
            messageHash: msgHash.toString('hex'),
            signature: {
                r: signature.r.toString(16),
                s: signature.s.toString(16)
            },
            publicKey: {
                x: key.getPublic().getX().toString(16),
                y: key.getPublic().getY().toString(16)
            }
        };

        console.log('Generated signed payload');
        res.json(signedPayload);
    } catch (error) {
        console.error('User data fetch/sign error:', error);
        res.status(500).json({ error: 'Failed to fetch or sign user data' });
    }
});

export default router; 