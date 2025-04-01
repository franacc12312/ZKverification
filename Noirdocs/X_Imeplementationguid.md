🛠️ Technical Implementation Guide: ECDSA-Signed Twitter Data Verification with Noir
Abstract
This document outlines a technical guide for building a system that fetches Twitter data via OAuth 2.0, signs it using ECDSA (secp256k1) in Node.js, and verifies that signature inside a zero-knowledge circuit written in Noir. This provides cryptographic guarantees that the data has not been tampered with while enabling privacy-preserving verification.

Table of Contents
System Overview

Architecture

Twitter Data Flow

ECDSA Signing (Node.js)

Data Format for Noir

Noir Circuit Design

Frontend & Wallet Integration

Security Notes

1. System Overview
This system aims to:

Fetch user data from Twitter using OAuth 2.0.

Serialize and sign this data with a known ECDSA private key (Node.js).

Pass the signed message + public key into a Noir circuit.

Verify the signature inside the circuit and optionally assert conditions (e.g., minimum followers).

2. Architecture
scss
Copiar
Editar
├── Frontend (Browser)
│   ├── OAuth UI + Ethereum Wallet
│   ├── Noir WASM for circuit generation
│   └── Proof submission
├── Backend (Node.js)
│   ├── Twitter OAuth2 Token Handler
│   ├── Twitter API data fetcher
│   └── ECDSA Signer (elliptic.js)
└── Noir Circuit
    ├── Verifies ECDSA signature
    └── Optionally checks account age, followers, etc.
3. Twitter Data Flow
User authenticates via Twitter (OAuth 2.0 with PKCE).

Backend fetches user info using Twitter API v2 (/2/users/me).

Selected data (e.g., id, created_at, public_metrics.followers_count) is serialized.

The data is hashed and signed using ECDSA with secp256k1.

This signed payload is sent to the Noir circuit for ZK proof generation.

4. ECDSA Signing (Node.js)
4.1 Install Required Packages
bash
Copiar
Editar
npm install elliptic
4.2 Signing Script
js
Copiar
Editar
const { ec: EC } = require('elliptic');
const crypto = require('crypto');

const ec = new EC('secp256k1');
const key = ec.genKeyPair(); // Store securely!

const tweetData = {
  id: "1234567890",
  created_at: "2023-01-01T00:00:00.000Z",
  public_metrics: {
    followers_count: 172
  }
};

// Step 1: Deterministic serialization
const serialized = JSON.stringify(tweetData, Object.keys(tweetData).sort());

// Step 2: Hash the message
const msgHash = crypto.createHash('sha256').update(serialized).digest();

// Step 3: Sign
const signature = key.sign(msgHash);

const signedPayload = {
  messageHash: msgHash.toString('hex'),
  signature: {
    r: signature.r.toString(16),
    s: signature.s.toString(16)
  },
  publicKey: {
    x: key.getPublic().getX().toString(16),
    y: key.getPublic().getY().toString(16)
  },
  twitter_data: tweetData
};

console.log(JSON.stringify(signedPayload, null, 2));
5. Data Format for Noir
5.1 Input Structure
ts
Copiar
Editar
interface SignedTwitterPayload {
  twitter_data: {
    id: string;
    created_at: string;
    public_metrics: {
      followers_count: number;
    };
  };
  messageHash: string; // hex string (32 bytes)
  signature: {
    r: string;
    s: string;
  };
  publicKey: {
    x: string;
    y: string;
  };
}
5.2 Noir Input Conversion
You’ll need to:

Convert hex fields (r, s, x, y, hash) to Field elements.

Hash message inside or outside the circuit depending on trust/security level.

6. Noir Circuit Design
6.1 Circuit Function
rust
Copiar
Editar
fn main(
    msg_hash: Field,
    r: Field,
    s: Field,
    pub_x: Field,
    pub_y: Field,
    follower_count: Field
) {
    assert(follower_count >= 150);

    let is_valid = ecdsa::verify_secp256k1(
        pub_x,
        pub_y,
        msg_hash,
        r,
        s
    );

    assert(is_valid);
}
Note: You can import or build a verify_secp256k1 utility in Noir (or leverage the existing Barretenberg implementation if you're using bb.js).

7. Frontend & Wallet Integration
Wallet (MetaMask) can be used to authenticate the Ethereum address.

Twitter auth handled via redirect to backend.

Once both identities are verified, proof can be generated showing:

A Twitter account with N followers

Belongs to (or is linked to) an Ethereum address

This allows decentralized attestation with privacy-preserving ZK proofs.

8. Security Notes
⚠️ ECDSA private key must be securely stored on the backend or controlled by user wallet.

✅ Use OAuth 2.0 PKCE to prevent code injection attacks.

⏳ Consider adding a timestamp + nonce to prevent replay of signed data.

🔐 Signature should bind not only to Twitter data but optionally to wallet address or proof scope (e.g., for Sybil resistance).