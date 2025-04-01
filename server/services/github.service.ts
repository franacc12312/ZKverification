import axios from 'axios';
import { config } from '../config.js';

export class GitHubService {
    private static instance: GitHubService;
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly callbackUrl: string;
    private readonly scope: string;

    private constructor() {
        this.clientId = process.env.GITHUB_CLIENT_ID || '';
        this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
        this.callbackUrl = process.env.GITHUB_CALLBACK_URL || '';
        this.scope = process.env.GITHUB_SCOPE || '';
    }

    public static getInstance(): GitHubService {
        if (!GitHubService.instance) {
            GitHubService.instance = new GitHubService();
        }
        return GitHubService.instance;
    }

    public getAuthorizationUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.callbackUrl,
            scope: this.scope,
            state: state,
            allow_signup: 'false'
        });

        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    public async exchangeCodeForToken(code: string, state: string): Promise<{access_token: string}> {
        try {
            const response = await axios.post('https://github.com/login/oauth/access_token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                redirect_uri: this.callbackUrl,
                state: state
            }, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.data.access_token) {
                throw new Error('Failed to get access token');
            }

            return {
                access_token: response.data.access_token
            };
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            throw new Error('Failed to exchange code for token');
        }
    }

    public async getUserData(accessToken: string): Promise<any> {
        try {
            const response = await axios.get('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching user data:', error);
            throw new Error('Failed to fetch user data');
        }
    }
} 