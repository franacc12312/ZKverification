# Building a Twitter Data Signature System with ECDSA and Noir (JavaScript Version)

This document serves as a step-by-step guide for building an application that fetches Twitter data, signs it using ECDSA (via JavaScript/Node.js), and verifies the signature within a Noir circuit. The system ensures that the Twitter data has not been altered since it was received.

---

## ✨ Overview

- **Objective**: Ensure the authenticity and integrity of Twitter data using ECDSA signatures and zero-knowledge proof verification in Noir.
- **Technologies**: Node.js, Noir, Twitter API, ECDSA (`secp256k1`).

---

## 1. Fetching Twitter Data

Use the official Twitter API (v2 or v1.1) with proper OAuth2 or OAuth1.0a authentication.

Example tweet JSON:
```json
{
  "id": "1234567890",
  "user": "elonmusk",
  "text": "Going to Mars 🚀"
}
```

Serialize the data using sorted JSON keys:

```js
const serialized = JSON.stringify(tweetData, Object.keys(tweetData).sort());
```

---

## 2. Signing the Data with ECDSA (Node.js)

### a. Install Dependencies

```bash
npm install elliptic
```

### b. Generate ECDSA Key Pair

```js
const { ec: EC } = require('elliptic');
const ec = new EC('secp256k1');

const key = ec.genKeyPair();
// Optionally save and reuse the key
// const key = ec.keyFromPrivate(PRIVATE_KEY_HEX);
```

### c. Hash the Serialized Data

```js
const crypto = require('crypto');
const msgHash = crypto.createHash('sha256').update(serialized).digest();
```

### d. Sign the Hash

```js
const signature = key.sign(msgHash);
```

### e. Output Required Values

```js
const signedData = {
  tweet,
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

require('fs').writeFileSync('signed_tweet.json', JSON.stringify(signedData, null, 2));
```

You will need to convert these values into field elements when passing them to Noir.

---

## 3. Noir Circuit: Verifying ECDSA Signature

### a. Noir Circuit Skeleton

```rust
fn main(
    pub_key: [Field; 2],
    sig: [Field; 2],
    msg_hash: Field
) {
    assert(ecdsa::verify(pub_key, sig, msg_hash));
}
```

### b. Requirements
- Use a Noir ECDSA library (e.g., `secp256k1_noir` or your own).
- Ensure the hash is passed as a field element or byte array.

---

## 4. Data Flow Summary

1. Fetch Twitter data.
2. Serialize and hash it in Node.js.
3. Sign it with ECDSA.
4. Save:
   - Hashed message
   - ECDSA signature (`r`, `s`)
   - Public key (`x`, `y`)
5. Noir circuit takes these inputs and verifies the signature.

---

## 5. Use Cases
- Auditable social data pipelines
- zk-proofs for on-chain or off-chain data verification
- Proving authenticity of external APIs in zero-knowledge

---

## 6. Next Steps
- Store and load keys from file securely.
- Convert hex values to field inputs in Noir.
- Build a UI or CLI to manage signing/verifying processes.
- (Optional) Extend to batch tweet signing or schema validation.

---

This sets the foundation for integrating signed off-chain data into zero-knowledge systems. Reach out if you need a full repo setup with test vectors and a working Noir verifier.

