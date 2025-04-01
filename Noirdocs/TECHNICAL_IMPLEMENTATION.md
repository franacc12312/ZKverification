# Technical Implementation Guide: Twitter Chequer System

## Abstract

This document provides a comprehensive technical analysis of the Twitter Chequer system, a zero-knowledge proof application that verifies Twitter account properties while maintaining privacy through cryptographic attestations. The system combines OAuth 2.0 authentication, Ethereum wallet integration, and zero-knowledge proofs using the Noir language.

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Cryptographic Implementation](#2-cryptographic-implementation)
3. [Zero-Knowledge Circuit Design](#3-zero-knowledge-circuit-design)
4. [Authentication Flow](#4-authentication-flow)
5. [Data Structures and Protocols](#5-data-structures-and-protocols)
6. [Security Considerations](#6-security-considerations)
7. [Implementation Details](#7-implementation-details)
8. [Twitter Authentication and Proxy Server Implementation](#8-twitter-authentication-and-proxy-server-implementation)

## 1. System Architecture

### 1.1 Component Overview
```
├── Frontend (Browser)
│   ├── Noir WASM Compiler
│   ├── Barretenberg Proving System
│   └── MetaMask Integration
├── Backend Proxy
│   ├── Twitter OAuth Handler
│   └── Attestation Service
└── Zero-Knowledge Components
    ├── Circuit Compiler
    └── Proof Verifier
```

### 1.2 Technology Stack
- **Frontend**: 
  - Noir WASM (`@noir-lang/noir_wasm@1.0.0-beta.2`)
  - Barretenberg Backend (`@aztec/bb.js@0.72.1`)
  - Ethereum Web3 (`ethers@5.7.2`)
- **Backend**:
  - Express.js Server
  - Twitter API v2
  - OAuth 2.0 with PKCE
- **Cryptographic**:
  - ECDSA Signature Verification
  - Pedersen Commitments
  - Groth16 Proving System

## 2. Cryptographic Implementation

### 2.1 ECDSA Signature Verification
```rust
struct ECDSASignature {
    r: [u8; 32],
    s: [u8; 32],
    v: u8
}

fn verify_signature(
    message_hash: [u8; 32],
    signature: ECDSASignature,
    public_key: [u8; 64]
) -> bool {
    // Verify ECDSA signature using secp256k1 curve
    let is_valid = ecrecover(
        message_hash,
        signature.r,
        signature.s,
        signature.v
    );
    assert(is_valid == public_key);
    true
}
```

### 2.2 Pedersen Commitment Scheme
```rust
fn generate_commitment(
    value: Field,
    blinding_factor: Field
) -> Field {
    pedersen_commit([value, blinding_factor])
}
```

## 3. Zero-Knowledge Circuit Design

### 3.1 Main Circuit Components
```rust
struct TwitterClaim {
    account_age_days: Field,
    follower_count: Field,
    twitter_id_hash: [u8; 32],
    eth_address: [u8; 20]
}

fn main(
    private claim: TwitterClaim,
    public signature: ECDSASignature,
    public eth_address: [u8; 20]
) {
    // 1. Verify account age
    assert(claim.account_age_days > 150);
    
    // 2. Verify follower count
    assert(claim.follower_count > 150);
    
    // 3. Verify Twitter-Ethereum linkage
    let message = hash(claim.twitter_id_hash);
    let is_valid = verify_signature(
        message,
        signature,
        eth_address
    );
    assert(is_valid);
}
```

### 3.2 Circuit Constraints
1. Account Age Verification:
   ```rust
   fn verify_account_age(age_days: Field) {
       let min_age = 150;
       assert(age_days >= min_age);
       // Range proof to ensure age_days is within u64
       constrain age_days in 0..2^64;
   }
   ```

2. Follower Count Verification:
   ```rust
   fn verify_follower_count(count: Field) {
       let min_followers = 150;
       assert(count >= min_followers);
       // Range proof for follower count
       constrain count in 0..2^32;
   }
   ```

## 4. Authentication Flow

### 4.1 OAuth 2.0 with PKCE Implementation
```typescript
interface PKCEChallenge {
    codeVerifier: string;
    codeChallenge: string;
    state: string;
}

async function generatePKCEChallenge(): Promise<PKCEChallenge> {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await sha256(codeVerifier);
    const state = generateRandomString(32);
    
    return {
        codeVerifier,
        codeChallenge: base64URLEncode(codeChallenge),
        state
    };
}
```

### 4.2 Token Exchange Protocol
```typescript
interface TokenExchange {
    grant_type: 'authorization_code';
    code: string;
    redirect_uri: string;
    client_id: string;
    code_verifier: string;
}

async function exchangeCodeForToken(
    code: string,
    codeVerifier: string
): Promise<OAuthToken> {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier
    });

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
        },
        body: params
    });

    return response.json();
}
```

## 5. Data Structures and Protocols

### 5.1 Proof Generation Structure
```typescript
interface ProofInput {
    twitter_data: {
        id: string;
        created_at: string;
        public_metrics: {
            followers_count: number;
        };
    };
    ethereum_address: string;
    signature: ECDSASignature;
}

interface ProofOutput {
    proof: Uint8Array;
    publicInputs: string[];
}
```

### 5.2 Witness Generation
```typescript
async function generateWitness(
    input: ProofInput,
    circuit: NoirCircuit
): Promise<Witness> {
    const witness = await circuit.generateWitness({
        account_age_days: calculateAccountAge(input.twitter_data.created_at),
        follower_count: input.twitter_data.public_metrics.followers_count,
        twitter_id_hash: hashTwitterId(input.twitter_data.id),
        eth_address: input.ethereum_address,
        signature: input.signature
    });
    
    return witness;
}
```

## 6. Security Considerations

### 6.1 Cryptographic Security Parameters
```typescript
const SECURITY_PARAMETERS = {
    curve: 'secp256k1',
    hashFunction: 'sha256',
    minEntropyBits: 256,
    proofSystem: 'groth16',
    commitmentScheme: 'pedersen'
};
```

### 6.2 Attack Vector Mitigations
1. **Replay Attacks**:
   ```typescript
   interface SignaturePayload {
       message: string;
       nonce: string;
       timestamp: number;
   }
   
   function verifySignatureTimestamp(
       timestamp: number,
       maxAgeSeconds: number = 300
   ): boolean {
       const now = Math.floor(Date.now() / 1000);
       return (now - timestamp) <= maxAgeSeconds;
   }
   ```

2. **Front-running Protection**:
   ```typescript
   function generateCommitment(
       value: bigint,
       nonce: bigint
   ): Uint8Array {
       return pedersen.commit([value, nonce]);
   }
   ```

## 7. Implementation Details

### 7.1 Circuit Compilation and Execution
```typescript
async function setupCircuit(): Promise<NoirCircuit> {
    // Initialize WASM modules
    await Promise.all([
        initACVM(fetch(acvmWasm)),
        initNoirC(fetch(noircWasm))
    ]);

    // Create file manager and compile circuit
    const fm = createFileManager("/");
    fm.writeFile("./src/main.nr", circuitCode);
    fm.writeFile("./Nargo.toml", nargoConfig);
    
    const { program } = await compile(fm);
    return new Noir(program);
}
```

### 7.2 Proof Generation Pipeline
```typescript
async function generateProof(
    input: ProofInput,
    circuit: NoirCircuit
): Promise<ProofOutput> {
    // 1. Generate witness
    const witness = await generateWitness(input, circuit);
    
    // 2. Setup proving system
    const backend = new UltraHonkBackend(circuit.program.bytecode);
    
    // 3. Generate proof
    const proof = await backend.generateProof(witness);
    
    // 4. Verify proof
    const isValid = await backend.verifyProof(proof);
    assert(isValid, "Proof verification failed");
    
    return proof;
}
```

### 7.3 Attestation Service Integration
```typescript
interface Attestation {
    twitter_id: string;
    eth_address: string;
    proof: ProofOutput;
    timestamp: number;
    signature: string;
}

async function createAttestation(
    proofOutput: ProofOutput,
    twitterData: TwitterData,
    ethAddress: string
): Promise<Attestation> {
    const attestation: Attestation = {
        twitter_id: twitterData.id,
        eth_address: ethAddress,
        proof: proofOutput,
        timestamp: Date.now(),
        signature: await signAttestation(proofOutput)
    };
    
    return attestation;
}
```

## 8. Twitter Authentication and Proxy Server Implementation

### 8.1 Environment Configuration
```typescript
// Required environment variables
interface TwitterConfig {
    TWITTER_CLIENT_ID: string;
    TWITTER_CLIENT_SECRET: string;
    PROXY_PORT: number;
    FRONTEND_URL: string;
}

// Example .env structure
```bash
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
PROXY_PORT=3000
FRONTEND_URL=http://localhost:1234
```

### 8.2 Proxy Server Architecture
```typescript
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

// CORS Configuration
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
```

### 8.3 OAuth Token Exchange Endpoint
```typescript
interface TokenRequest {
    code: string;
    codeVerifier: string;
    redirectUri: string;
}

app.post('/api/twitter/token', async (req, res) => {
    const { code, codeVerifier, redirectUri } = req.body as TokenRequest;
    
    // Parameter validation
    if (!code || !codeVerifier) {
        return res.status(400).json({ 
            error: 'Missing required parameters' 
        });
    }

    try {
        // Create Basic Auth header
        const authHeader = Buffer.from(
            `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
        ).toString('base64');

        // Prepare token request parameters
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: TWITTER_CLIENT_ID,
            code_verifier: codeVerifier
        });

        // Make request to Twitter OAuth endpoint
        const response = await axios.post(
            'https://api.twitter.com/2/oauth2/token',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authHeader}`
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        handleTwitterAPIError(error, res);
    }
});
```

### 8.4 User Data Retrieval Endpoint
```typescript
interface TwitterUserResponse {
    data: {
        id: string;
        created_at: string;
        public_metrics: {
            followers_count: number;
        };
    };
}

app.get('/api/twitter/user', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(400).json({ 
            error: 'Invalid authorization header' 
        });
    }
    
    const accessToken = authHeader.split(' ')[1];

    try {
        const response = await axios.get<TwitterUserResponse>(
            'https://api.twitter.com/2/users/me',
            {
                params: {
                    'user.fields': 'created_at,public_metrics'
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        handleTwitterAPIError(error, res);
    }
});
```

### 8.5 Error Handling
```typescript
interface TwitterAPIError {
    response?: {
        status: number;
        data: any;
    };
    request?: any;
    message: string;
}

function handleTwitterAPIError(
    error: TwitterAPIError,
    res: express.Response
): void {
    console.error('Twitter API Error:', error.message);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.response) {
        // Error with response from Twitter
        console.error('Error details:', error.response.data);
        errorMessage = `Twitter API error: ${error.response.status}`;
        statusCode = error.response.status;
    } else if (error.request) {
        // Network error
        errorMessage = 'Failed to connect to Twitter API';
        statusCode = 503;
    }
    
    res.status(statusCode).json({ error: errorMessage });
}
```

### 8.6 Security Middleware
```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);

// Request validation middleware
function validateTwitterRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
): void {
    const origin = req.headers.origin;
    
    if (origin !== process.env.FRONTEND_URL) {
        return res.status(403).json({
            error: 'Unauthorized origin'
        });
    }

    if (req.method === 'POST' && !req.is('application/json')) {
        return res.status(415).json({
            error: 'Content-Type must be application/json'
        });
    }

    next();
}

app.use('/api/twitter/', validateTwitterRequest);
```

### 8.7 Session Management
```typescript
interface TwitterSession {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

const sessions = new Map<string, TwitterSession>();

function storeSession(userId: string, session: TwitterSession): void {
    sessions.set(userId, {
        ...session,
        expiresAt: Date.now() + session.expiresIn * 1000
    });
}

async function refreshTokenIfNeeded(
    userId: string,
    session: TwitterSession
): Promise<string> {
    if (Date.now() >= session.expiresAt - 300000) { // 5 minutes buffer
        const newToken = await refreshTwitterToken(session.refreshToken);
        storeSession(userId, newToken);
        return newToken.accessToken;
    }
    return session.accessToken;
}
```

### 8.8 Token Refresh Implementation
```typescript
async function refreshTwitterToken(
    refreshToken: string
): Promise<TwitterSession> {
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: TWITTER_CLIENT_ID
    });

    const authHeader = Buffer.from(
        `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        params.toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authHeader}`
            }
        }
    );

    return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
    };
}
```

### 8.9 Proxy Server Initialization
```typescript
async function initializeProxyServer(): Promise<void> {
    try {
        // Validate environment variables
        const requiredEnvVars = [
            'TWITTER_CLIENT_ID',
            'TWITTER_CLIENT_SECRET',
            'PROXY_PORT',
            'FRONTEND_URL'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required env var: ${envVar}`);
            }
        }

        // Start server
        const port = process.env.PROXY_PORT || 3000;
        app.listen(port, () => {
            console.log(`Proxy server running on port ${port}`);
            console.log(`Accepting requests from: ${process.env.FRONTEND_URL}`);
        });
    } catch (error) {
        console.error('Failed to initialize proxy server:', error);
        process.exit(1);
    }
}

initializeProxyServer();
```

## Appendix A: Performance Optimizations

### A.1 Circuit Optimization
```rust
// Optimize range checks using binary decomposition
fn optimized_range_check(value: Field, bits: u32) {
    let mut acc = 0;
    for i in 0..bits {
        let bit = (value >> i) & 1;
        acc += bit * (1 << i);
    }
    assert(acc == value);
}
```

### A.2 Proof Generation Optimization
```typescript
const OPTIMIZATION_CONFIG = {
    maxConstraints: 1000000,
    maxVariables: 1000000,
    batchSize: 1000,
    threadPool: 4
};
```

## Appendix B: Error Handling and Recovery

### B.1 Error Classification
```typescript
enum ProofError {
    CIRCUIT_COMPILATION = 'CIRCUIT_COMPILATION',
    WITNESS_GENERATION = 'WITNESS_GENERATION',
    PROOF_GENERATION = 'PROOF_GENERATION',
    VERIFICATION = 'VERIFICATION',
    ATTESTATION = 'ATTESTATION'
}
```

### B.2 Recovery Procedures
```typescript
async function handleProofError(
    error: Error,
    input: ProofInput
): Promise<void> {
    switch (error.type) {
        case ProofError.CIRCUIT_COMPILATION:
            await recompileCircuit();
            break;
        case ProofError.WITNESS_GENERATION:
            await regenerateWitness(input);
            break;
        // ... other error handlers
    }
}
``` 