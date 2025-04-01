import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twitterRouter from './routes/twitter.js';
import githubRouter from './routes/github.js';

// Load environment variables
dotenv.config();

// Verify required environment variables
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
    console.error('Error: TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be configured in .env file');
    process.exit(1);
}

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('Error: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured in .env file');
    process.exit(1);
}

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173', // Allow only requests from our frontend
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Enhanced request logging middleware
app.use((req, res, next) => {
    console.log('--------------------');
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    console.log('--------------------');
    next();
});

// Test routes
app.get('/api/test', (req, res) => {
    console.log('GET test route hit');
    res.json({ message: 'Server is working!' });
});

app.post('/api/test', (req, res) => {
    console.log('POST test route hit');
    res.json({ message: 'POST request working!', body: req.body });
});

// Routes
app.use('/api/twitter', twitterRouter);
app.use('/api/github', githubRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

const port = process.env.PROXY_PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Accepting requests from: http://localhost:5173');
    console.log('TWITTER_CLIENT_ID:', TWITTER_CLIENT_ID);
    console.log('GITHUB_CLIENT_ID:', GITHUB_CLIENT_ID);
}); 