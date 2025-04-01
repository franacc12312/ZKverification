## 🔐 Zero-Knowledge Proofs with Signed Data: A Secure Pattern for Verifiable External Inputs

### 🧠 Overview

When working with Zero-Knowledge Proofs (ZKPs), circuits are self-contained and cannot access external APIs or real-world data on their own. To bring trusted external data into a ZK circuit (e.g. balances, identity claims, social media stats), we need to use **signed data from an external authority** (typically a backend server).

This pattern ensures that the ZK circuit only accepts external data **if it was signed by a trusted backend**, and the **integrity of the data is enforced** inside the circuit.

---

## 💪 Core Logic

The general approach works as follows:

1. **A backend fetches external data** from a reliable source (e.g. Twitter API, Etherscan).
2. **The backend signs the data** using a private key.
3. **The user receives the data and the signature**, and passes them into the ZK circuit.
4. **The ZK circuit reconstructs the original message from its inputs**, verifies the signature using a known public key, and asserts constraints over the data.

---

## ✍️ Signing the Data (Backend)

The backend signs a plain-text message constructed from the data it wants to certify. For example:

```ts
const message = `${wallet_address}:${twitter_handle}:${followers_count}`;
const messageBytes = new TextEncoder().encode(message);
const signature = ed25519.sign(messageBytes, privateKey);
```

It returns to the user:

- `wallet_address`
- `twitter_handle`
- `followers_count`
- `signature`
- (optionally) `public_key` — or this can be hardcoded in the circuit

---

## 🧠 Inside the ZK Circuit

The ZK circuit receives the same fields. It **reconstructs the original message** based on its own inputs, and uses the `verify_signature()` function to validate the signature.

Example in Noir:

```rust
use dep::std;

fn main(
    wallet: Field,
    handle: pub [u8; 15],
    followers: Field,
    signature: [u8; 64],
    public_key: [u8; 32],
) {
    let msg_str = std::string::from_field(wallet) ++ ":" ++ std::string::from_bytes(handle) ++ ":" ++ std::string::from_field(followers);
    let msg_bytes = std::string::to_bytes(msg_str);

    let is_valid = std::ed25519::verify_signature(signature, msg_bytes, public_key);
    assert(is_valid);

    assert(followers > 150); // Only allow proving eligibility if true
}
```

---

## 🛰️ Using Oracles in Noir

To integrate external data dynamically at runtime, Noir supports **oracles**, which are essentially remote functions called from the circuit using the `#[oracle]` decorator.

### 🔹 How to define an Oracle

```rust
#[oracle(get_balance)]
unconstrained fn get_balance(address: Field) -> Field {}

fn main(address: Field) {
    let balance = get_balance(address);
    assert(balance > 1000);
}
```

You must also constrain the returned value to prevent accepting any unverified data.

### 🔹 How to resolve oracles

Oracles are resolved by a JSON-RPC server. The CLI (`nargo`) uses this resolver to return values for decorated functions during testing or execution:

```bash
nargo test --oracle-resolver http://localhost:5555
```

In JavaScript (NoirJS), you can pass a custom `foreignCallHandler` instead:

```ts
const foreignCallHandler = async (name, inputs) => {
  if (name === "get_balance") {
    return ["12345"];
  }
};

await noir.execute(inputs, foreignCallHandler);
```

### 🔹 RPC server example

```js
import { JSONRPCServer } from "json-rpc-2.0";
import express from "express";

const app = express();
app.use(express.json());

const server = new JSONRPCServer();

server.addMethod("resolve_foreign_call", async ([call]) => {
  if (call.function === "get_balance") {
    return { values: [["12345"]] }; // return value as string
  }
  throw new Error("Unknown oracle function");
});

app.post("/", (req, res) => {
  server.receive(req.body).then((response) => {
    if (response) res.json(response);
    else res.sendStatus(204);
  });
});

app.listen(5555);
```

Using oracles in this way enables real-time, dynamic integration of external data in ZK circuits, **as long as you cryptographically constrain the output.**

---

## 🔍 Key Insights

### ❌ The signature does not "contain" the data  
It is not decryptable or reversible.  
Instead, the signature **proves that a specific message was signed** by the holder of the private key.

### ✅ The circuit **reconstructs the message** from the inputs  
If the user alters any input (`followers`, `wallet`, etc.), the reconstructed message changes and the signature verification fails.

---

## ✅ Why use this pattern?

| Benefit                          | Explanation                             |
|----------------------------------|-----------------------------------------|
| 🔐 Verifies integrity of off-chain data | Ensures data wasn't tampered with     |
| 🧠 Enables ZK constraints on external data | Like proving `followers > 150`         |
| 🌍 Portable & trustless proofs  | Users can generate proofs and use them elsewhere |
| 📾 Compatible with on-chain verification | Smart contracts can verify the proof and grant access, mint NFTs, etc. |

---

## 🤀 Real-World Use Case: Proving Twitter Followers

**Goal**: Prove that a Twitter account has >150 followers and is linked to a wallet, without revealing the account or follower count.

### Flow:

1. User signs in with Twitter.
2. Backend fetches followers from Twitter API.
3. Backend signs: `wallet:twitter_handle:followers`
4. User receives signature, inputs data into circuit.
5. Circuit validates:
   - Signature is valid
   - Followers > 150
6. User generates ZK proof → submits it to an app or smart contract.

---

## 🔒 Security Considerations

- The circuit should **hardcode** the trusted `public_key` (or validate it).
- Never trust unsigned external data.
- Use a cryptographic hash or a deterministic message format to avoid ambiguity.
- Use EdDSA (e.g. ed25519 or BabyJubJub) for efficient signature verification in ZK.
- Always constrain oracle return values to avoid untrusted input injection.

---

## 🧪 Optional Enhancements

| Feature | Description |
|---------|-------------|
| 🔗 Merkle Tree | Sign multiple user records and prove inclusion (scales better) |
| 📦 IPFS | Publish signed records in a public place |
| 🎟️ NFT Minting | Smart contract validates ZK proof before minting |
| 🔐 Anonymous proof | Do not expose handle, just prove you meet conditions |

---

## 💬 Summary

This pattern bridges off-chain data with on-chain or ZK applications by combining:

- **Signatures** for trust and authenticity
- **ZK circuits** for integrity, privacy, and enforceable conditions
- **Oracles** for fetching or computing off-chain values at proof time

It's simple, secure, and flexible—perfect for apps that need to prove real-world properties (e.g. social media, balances, identity) without sacrificing decentralization or privacy.