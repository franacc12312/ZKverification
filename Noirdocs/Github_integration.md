GitHub Commit Signature Verification and ZK Proof Integration
This document describes how to extend the existing OAuth2 + ECDSA-based signing system (previously integrated with Twitter) to support GitHub commit proofs with zero-knowledge (ZK) proof generation. We outline the architecture changes, GitHub OAuth flow, commit signature retrieval, frontend proof generation using Noir + Barretenberg, Noir circuit design for verifying signatures, and key security considerations. The style and structure mirror the provided Twitter integration docs for consistency.
Architecture Extension
The current application architecture (with Twitter OAuth and ECDSA signing) will be extended to incorporate GitHub commit verification. Key additions to the architecture include:
GitHub OAuth2 Integration: A new OAuth provider is added for GitHub, using existing OAuth 2.0 flows. This includes routes for GitHub login and callback, and storing the GitHub access token in the backend (similarly to how Twitter tokens are handled).
Commit Retrieval Service: A backend service or module to fetch a user’s recent commits from GitHub’s REST API, including commit signature data. This service will filter for cryptographically signed commits and extract the signature payload and signature block from GitHub’s API response​
DOCS.GITHUB.COM
. It may also fetch the user’s public keys (GPG or SSH) from GitHub to identify the signing key.
ZK Proof Module: Integration of a Noir circuit and the Aztec Barretenberg proving system in the frontend for generating proofs that the user has at least N signed commits. The Noir circuit will verify ECDSA/EdDSA signatures against commit payloads inside the proof. A verification key for this circuit can be used on the backend to verify proofs, or verification can occur in the frontend if needed.
Data Flow Updates: The frontend-backend interaction is extended with new API endpoints for GitHub commit data and proof submission (detailed below). The backend may cache commit data for performance and ensure it matches the authenticated user.
Token & Storage Changes: The user profile data store is expanded to hold GitHub credentials (access token, GitHub user ID) and any derived attestations (e.g. the public key fingerprint and commit proof status). If the system issues its own tokens or badges for verified accounts, it will include GitHub verification results as well.
UI Additions: New frontend components are introduced for GitHub: a “Connect GitHub” button for OAuth, a commit selection interface, and a display of proof generation status. The UI will align with the style of the Twitter verification flow, reusing components where possible.
Overall, the extension treats GitHub as an analogous identity provider and proof source as Twitter. The backend remains the orchestrator for OAuth and data fetching, while the heavy cryptographic proof logic is done client-side for privacy. The next sections detail the new GitHub-specific flows and components.
New GitHub Integration Flow
The GitHub integration flow covers authenticating the user via GitHub, retrieving their signed commits, and establishing a proof of ownership of those commits. The high-level sequence is as follows (optional steps for additional security are noted):
mermaid
Copiar
sequenceDiagram
    participant U as User
    participant FE as Frontend (Browser)
    participant BE as Backend (Server)
    participant GH as GitHub API

    U ->> FE: Click "Connect GitHub"
    FE ->> GH: **OAuth2 Authorization Request** (redirect to GitHub)
    GH -->> U: GitHub Login & Consent
    GH ->> FE: **OAuth Callback** (with auth code)
    FE ->> BE: Send auth code to backend
    BE ->> GH: **Exchange code** for access token
    GH -->> BE: Return GitHub access token
    BE ->> BE: Store token (assoc. with user session/account)
    BE -->> FE: Confirm OAuth success (user now linked)

    %% Fetch commits after auth
    FE ->> BE: Request signed commits data
    BE ->> GH: **GET /repos/{user}/*/commits?author={user}** (for each repo or via events)
    GH -->> BE: Return commit list (with `verification` objects)
    BE ->> BE: Filter commits for verified signatures
    BE ->> BE: Extract payload & signature for each signed commit&#8203;:contentReference[oaicite:1]{index=1}
    BE ->> BE: (Optional) Fetch user's GPG/SSH keys to identify public keys
    BE -->> FE: Send signed commit data (commits list)

    %% User selects commits & proves
    U ->> FE: Select N signed commits from list
    opt (Optional Key Ownership Challenge)
        BE ->> BE: Generate random challenge string
        BE -->> FE: Send challenge to frontend
        U ->> U: Sign challenge with the same commit key (using GPG/SSH locally)
        U ->> FE: Provide challenge signature
        FE ->> BE: Send challenge signature
        BE ->> BE: Verify signature with user's public key
        BE -->> FE: Confirm key ownership (if valid)
    end
    FE ->> FE: Prepare circuit inputs (commit hashes, signature bytes, pubkey, N)
    FE ->> FE: Run Noir + Barretenberg (WASM) to generate ZK proof&#8203;:contentReference[oaicite:2]{index=2}
    FE -->> U: Display proof success (or errors)
    FE ->> BE: Submit ZK proof (and public inputs like key or threshold)
    BE ->> BE: Verify proof using circuit verifier
    BE ->> BE: Store verification result (user has proven N commits)
    BE -->> FE: Send success response (or failure)
    FE -->> U: Show verification status in UI
Step-by-Step Flow:
OAuth2 Login with GitHub: The user initiates GitHub authentication by clicking "Connect GitHub". The frontend redirects the user to GitHub’s OAuth2 authorization URL with the necessary scopes (e.g. read:user and repo or repo:read scope to read commits and user keys). After the user grants access, GitHub redirects back to our app with an authorization code.
Token Exchange: The frontend sends the auth code to the backend (e.g. via a POST to /auth/github/callback). The backend exchanges this code for an access token by calling GitHub (server-side) and receives an OAuth access token for the user. The token is stored (e.g. in the database or session) for subsequent API calls. The backend now knows the user’s GitHub identity (GitHub username/ID) from the token response.
Fetching Signed Commits: Once authenticated, the frontend (or backend proactively) triggers retrieval of the user’s commits:
The frontend calls a new API endpoint (e.g. GET /api/github/commits) on our backend to request the user’s commit data.
The backend uses the stored GitHub token to fetch commits via GitHub REST API. This can be done per repository (e.g. iterate over the user’s repositories and call GET /repos/{username}/{repo}/commits?author={username}) or via a global commits search/event feed. For each commit retrieved, the backend inspects the verification object included by GitHub.
Filtering and Extraction: The backend filters for commits where verification.verified == true and verification.reason == "valid"​
DOCS.GITHUB.COM
, meaning GitHub has cryptographically verified the commit’s signature with a known key. For those commits, the backend extracts the payload (the exact bytes that were signed) and the signature from the response​
DOCS.GITHUB.COM
. GitHub’s API directly provides these fields, which saves us from reconstructing the signed data manually. Each commit’s relevant data (commit hash, message, date, payload, signature, and possibly the key ID or key hint) is collected.
The backend may also fetch the user’s public keys from GitHub:
GPG Keys: GET /user/gpg_keys returns the list of GPG public keys the user has registered on GitHub (with key IDs, emails, etc.).
SSH Signing Keys: GET /user/ssh_signing_keys returns SSH keys registered for commit signing. Using these, the backend can match which key was used for each commit (e.g. by key ID or by attempting verification). This step ensures the commit truly belongs to the authenticated user (the key is on their account) and gathers the public key material needed for later verification steps.
The backend returns a structured list of signed commits to the frontend. For example:
json
Copiar
{
  "repository": "octocat/HelloWorld",
  "commits": [
    {
      "sha": "abc1234...",
      "message": "Fix critical bug",
      "date": "2025-03-01T12:34:56Z",
      "verified": true,
      "payload": "tree 9f8...\\nauthor Octo Cat <octo@example.com> ...\\ncommitter Octo Cat <octo@example.com> ...\\n\\nFix critical bug",
      "signature": "-----BEGIN PGP SIGNATURE-----\\n...\n-----END PGP SIGNATURE-----"
    },
    { /* ...other commits... */ }
  ]
}
Each commit object contains the payload and signature that GitHub provided. The verified:true and the absence of any error reason (like unknown_key) indicates these are valid signatures by the user’s keys​
DOCS.GITHUB.COM
.
Commit Selection (Frontend): The frontend displays the fetched commits to the user in the UI. To ensure a smooth UX:
Commits can be listed grouped by repository or by the signing key. It’s important to note if the user has multiple signing keys; commits signed by different keys should be indicated. The UI might let the user filter or group by key, since the proof will require using commits all signed by the same key.
Each commit entry shows identifying info (message, date, perhaps repository) and a checkbox or selection mechanism. The UI should guide the user to select at least N commits signed by the same key for the proof (or exactly N if the proof expects a fixed number).
If the user has fewer than N signed commits, the UI can disable the proof-generation or show a warning (since the proof requires at least N signatures).
Challenge-Response (Key Ownership Verification): This step is optional but recommended. Before generating the ZK proof, we ensure the user currently possesses the private key that signed those commits:
The backend generates a random challenge string (e.g. a random nonce or a timestamped message like "Prove ownership for user <GitHubID> at <time>").
The user is prompted to sign this challenge with the same key that was used for the commits. For example, if their commits were GPG-signed, they must use their GPG software to sign the challenge message (the app might display the challenge and instructions, then allow the user to paste the signature). If their commits were signed with an SSH key, they could use an SSH signing utility.
The user returns the signature of the challenge to our application. The backend verifies this signature using the public key (retrieved earlier or via GitHub API). If valid, it proves the user controls the private key now (not just historically when commits were made). This mitigates scenarios where someone might use another’s commit data without actually owning the key.
If the challenge signature verification fails, the process is aborted (the user either chose the wrong key’s commits or does not have the key). The UI would notify the user to retry or choose different commits.
Note: This challenge step prevents an attacker from using public commit data alone to generate a proof. Without the private key, they would be unable to produce a valid signature on the fresh challenge, stopping the process before any proof generation.
Prepare Noir Circuit Inputs: Once we have a set of N commits (and have optionally confirmed key ownership), the frontend prepares inputs for the Noir ZK circuit:
Message Hashes: For each selected commit, the commit payload (a string of the git commit content) is hashed to a 32-byte value. We use the same hash algorithm that the signature scheme expects. For instance, if the commits are PGP signed with SHA-256, we hash the payload with SHA-256. (GitHub’s payload is exactly the bytes that were signed, so using SHA-256 here should reproduce the digest that the commit’s signature covers.)
Signature Parsing: The commit’s signature (ASCII armored if PGP or a base64 if SSH) is parsed to raw signature bytes. Typically, for ECDSA or Ed25519 signatures, this yields the two components r and s. We format these as a 64-byte array [r||s]. (Noir’s ECDSA verify function expects a 64-byte signature array consisting of r and s​
NOIR-LANG.ORG
.)
If the signature is PGP, we parse the ASN.1 structure to extract r and s. If it’s an Ed25519 signature (64 bytes) or an SSH signature, we similarly extract the raw signature bytes.
Public Key: We also prepare the public key corresponding to the commits. For ECDSA keys (like an ECC GPG key or an X.509 certificate key), this will be the X and Y coordinates of the public point (32 bytes each for secp256k1/r1 curves). For Ed25519, it would be the 32-byte public key. The public key can be obtained from the GitHub API (our backend could include it in the commit data, since we have the user’s keys).
Other Inputs: The circuit might also take the number N (or a threshold parameter) as an input. Depending on the circuit design, N can be a public input or hard-coded. For flexibility, we could make min_commits a public input to the circuit so that the proof explicitly attests “at least N commits were verified”.
The frontend now has all inputs ready in the correct format (byte arrays, etc.). This data is kept client-side (private) for the proof generation.
Generate ZK Proof in Browser: Using Noir and Barretenberg compiled to WebAssembly, the frontend generates a zero-knowledge proof that all selected commits were signed by the same key:
We utilize the Noir JavaScript API (noir_js and noir_wasm) to execute the circuit. Noir will generate a witness (assignment of values) given the input data. Then, using the Barretenberg WASM backend (bb.js), we create a proof from the witness​
NOIR-LANG.ORG
. This all runs locally in the browser for security and privacy.
The application should provide feedback to the user during this process, as it can take a few seconds (especially if N is large or the device is slow). For example, show “Generating proof… ⏳” and then “Proof generated! ✅” similar to the style in the tutorial​
NOIR-LANG.ORG
.
If the inputs do not satisfy the circuit (e.g., the commits were not all signed by the same key, so the circuit’s assertion will fail), the proof generation will fail. In that case, the code should catch the error and inform the user (e.g., “Proof generation failed: commits do not share the same signature key” or any circuit assertion failure reason).
Proof Output: The result is a proof artifact (typically a byte array or hex string). Noir/Barretenberg will produce this along with any public outputs. We will likely make the proof and some public inputs (like the threshold or even the public key) available for verification.
Submit and Verify Proof: Once a proof is obtained, the frontend sends it to the backend for verification and record-keeping:
A new endpoint (e.g. POST /api/github/proof) accepts the proof (and possibly the public inputs such as threshold N, and maybe an identifier of the public key used, if we choose to include that for safety).
The backend uses the Noir verifier (which could be the same Barretenberg library or a verifier key in a different environment) to verify the proof. If the proof is valid, it mathematically guarantees that the user presented N commits all signed by the same key (and if we made threshold a public input, that it was at least that many).
If we chose to reveal the public key in the proof’s public inputs, the backend can cross-check that public key against the user’s known keys (ensuring it matches one of the keys on the user’s GitHub account). This double-check links the proof to the user’s identity. (If the key is kept private in the proof, the backend should rely on the earlier challenge-response step or other measures to bind the proof to the user.)
On successful verification, the backend records that the user has completed the GitHub commit proof. For instance, it may store a flag like user.githubVerified = true, the key ID used, and the number of commits proven (N). This can be used later to issue a credential or allow access to certain features.
The backend responds to the frontend with success status. If desired, it can also return some credential (for example, a JWT containing a claim about the verification, or an attestation object).
Completion: The frontend notifies the user that their GitHub commit proof is verified. In the UI, the user might see a “GitHub Verified” badge or a summary like “✅ Proven ownership of 5 signed commits”. This status can be stored in the app (and possibly displayed alongside the Twitter verification status if both are present).
The GitHub integration flow thus adds a parallel path to the Twitter flow: instead of proving via Twitter posts, the user proves via commit signatures. The critical difference is the inclusion of cryptographic commit signatures and a Noir circuit to validate them in ZK, rather than a simple OAuth-based check.
Frontend Flow and UI
On the frontend, the user experience for GitHub verification is designed to be as seamless as the Twitter verification flow:
Connecting GitHub Account: The UI will show a “Connect your GitHub” button (adjacent to the Twitter connect if present). Clicking it triggers the OAuth process. After returning from OAuth, the frontend updates to show the GitHub account as linked (e.g., display the user’s GitHub username/avatar, similar to how the Twitter handle might be displayed).
Fetching and Displaying Commits: Once linked, the frontend automatically (or on user action) fetches the user’s signed commits via the backend API. A loading indicator (spinner or message) informs the user that their GitHub data is being retrieved. After fetching:
If no signed commits are found, the UI will display a message like “No signed commits found for your GitHub account” or instructions on how to enable commit signing on GitHub.
If commits are found, they are listed in a clear, concise manner. For example, a list or table where each entry shows:
Commit message (possibly truncated for length).
Repository name (if multiple repos are included).
Date of commit.
An icon or label indicating it’s verified (since the list is already filtered to verified commits).
Possibly the key identifier (like the fingerprint short ID) if the user has more than one key, or group commits by that key.
The user can select multiple commits. If the goal is to prove at least N commits, the UI might enforce selecting at least N before proceeding (e.g., “Select at least 5 commits to prove”). The selection can be done via checkboxes or multi-select controls.
For usability, we might add a “Select All” for convenience if the user has many signed commits and they want to prove all or a large subset. However, proving with a large number of commits will increase proving time, so we may recommend exactly N for efficiency.
Commit Selection and Validation: Once the user makes a selection, the frontend can do a quick validation:
Ensure all selected commits share the same signing key. (If not, it should warn the user: “Selected commits are signed with different keys. Please select commits signed by the same key to continue.”) This check can be done by comparing a key identifier for each commit.
Ensure the count selected is >= the required threshold N. If the user selects more than N, that’s fine (the proof can be configured to use all of them, or just use the first N — but it’s better to use exactly N to simplify the circuit logic unless the circuit supports a variable number).
Proof Generation UI: Provide a clear call-to-action, e.g., a button “Generate ZK Proof”. When clicked:
The app transitions into a processing state. For example, disable the button and show a log area or status text updates: “Preparing proof inputs…”, then “Generating proof… ⏳”. This is similar to how the tutorial logs status messages to the page​
NOIR-LANG.ORG
.
During this step, the frontend code is performing hashing of payloads and calling the Noir circuit. This could take a moment, so the user should see a progress indicator. We can even break it into stages (e.g., “Hashing commits…”, “Verifying signatures in circuit…”, “Proof constructed”) for transparency.
If using WebAssembly multi-threading or heavy computation, ensure the UI remains responsive (web workers can be used for the proof generation to avoid freezing the main thread).
Using Noir WASM + Barretenberg: In code, the frontend might do something like the following (pseudocode):
js
Copiar
// Assume `selectedCommits` is an array of commit objects from backend.
const inputs = {
  msgHashes: selectedCommits.map(c => sha256(c.payload)),       // 32-byte hashes
  signatures: selectedCommits.map(c => parseSignature(c.signature)), // 64-byte [r||s]
  pubKeyX: commitPubKey.xBytes,  // 32-byte X coordinate (if ECDSA)
  pubKeyY: commitPubKey.yBytes,  // 32-byte Y coordinate
  // If Ed25519, pubKey could be 32 bytes and circuit would use EdDSA verify logic.
  min_commits: selectedCommits.length  // public input or used in logic
};

// Execute Noir circuit
const { witness } = await noir.execute(inputs);
const proof = await backend.generateProof(witness);  // using bb.js to generate proof
Here noir and backend are part of the Noir JS API:
The noir.execute will run our Noir circuit with the given inputs to produce a witness (assignments of all intermediate variables).
backend.generateProof uses the Barretenberg backend to create a proof from that witness​
NOIR-LANG.ORG
. Under the hood, @noir-lang/noir_js and @aztec/bb.js are used, which leverage WebAssembly for fast proving in the browser​
NOIR-LANG.ORG
.
After proof is obtained, we can also locally verify it (for extra assurance) using backend.verifyProof(proof) as shown in the Noir tutorial​
NOIR-LANG.ORG
, but this is optional since the backend server will verify anyway.
Proof Submission & UI Update: If proof generation succeeds, the UI should indicate success (e.g., “✅ Proof generated successfully!”). The user might not see the proof itself (it’s a blob of data not meaningful to humans), but the frontend will send it to the server. Upon receiving the server’s verification response:
If successful, show a success message: “GitHub verification complete! You have proven ownership of N signed commits.” Possibly display the number of commits proven or the key (if not sensitive). The UI can now mark the GitHub section as verified.
If the proof failed verification (which should not happen if it was generated correctly), handle as an error – possibly ask the user to retry.
Post-Verification UI: Similar to how the Twitter verification might show a status or allow the user to regenerate/refresh the proof, the GitHub verification UI can:
Show the user’s GitHub account as verified. If we store the number of commits or a particular key, display summary info (e.g., “Verified with GPG key ABC1234 and 5 commits”).
Provide an option to update the proof in the future. For instance, if the user makes new signed commits and wants to prove a higher number, they could re-run the flow to generate a new proof with a higher N.
Possibly allow the user to download or copy the proof if they intend to use it elsewhere (though in this context, it's mainly for internal use by the agent).
Throughout the frontend flow, we maintain the same tone and guidance as the Twitter flow documentation. For example, helpful notes or tips in the UI (like “Make sure all selected commits are signed with the same key uploaded to your GitHub account”) can mirror the friendly yet technical style of the prior docs.
Noir Circuit Design
At the heart of this integration is the Noir circuit that validates commit signatures in zero-knowledge. We outline the circuit’s purpose, inputs/outputs, and inner logic (ECDSA/EdDSA verification on commit data). Circuit Goal: Prove that at least N commits (for some threshold N) have been signed by the same public key (belonging to the user), without revealing which commits or the key itself (if we choose to keep those private). Essentially, the circuit outputs a proof of the statement: “I know N valid signatures on N distinct commit messages, all produced by one public key.” Inputs:
Private (Witness) Inputs:
The set of commit message hashes (e.g., an array of length N of 32-byte values). These are hashes of the actual commit payloads.
The set of signatures corresponding to those messages (an array of N signatures, each 64 bytes for ECDSA/EdDSA).
The public key of the signer, represented appropriately (for ECDSA, two 32-byte field elements for X and Y coordinates of the EC point; for Ed25519, a 32-byte compressed point).
(Optionally, if using a challenge signature inside the circuit for ownership, the challenge message hash and signature could be additional inputs. This would allow the circuit to also verify the user signed a known challenge, but doing this in-circuit isn’t strictly necessary if done off-circuit.)
Public Inputs:
The threshold count N (unless the circuit is compiled separately for each N). By having N as a public input, verifiers of the proof will know the claim “at least N commits”. If the circuit is specialized per threshold, this may not be needed as an input.
We might also choose to make the public key a public input if we want the verifier (backend) to see which key was used. However, that reveals the user’s key in the proof. For privacy, we prefer the public key to remain private in the proof, and rely on external checks. We will assume the public key stays a witness input, to maximize privacy (the proof then only reveals that some key signed N commits, without saying which key).
No other outputs are needed except perhaps a boolean success output which is implicitly true if the proof verifies.
Circuit Logic:
Signature Verification: For each of the N commits, the circuit verifies the signature against the message hash using the provided public key.
If using ECDSA (e.g., secp256k1 or secp256r1 curve, which cover Ethereum keys and common X.509 keys), we can use Noir’s standard library function std::ecdsa_secp256k1::verify_signature or std::ecdsa_secp256r1::verify_signature as appropriate​
NOIR-LANG.ORG
​
NOIR-LANG.ORG
. Noir supports ECDSA verification natively for those curves.
If using EdDSA (Ed25519, commonly used by GPG and newer GitHub SSH signing), Noir currently does not have a built-in ed25519 verifier (as of this writing, ed25519 support is an open grant idea​
AZTEC.NETWORK
). To handle EdDSA, one would need to implement custom circuit logic (for example, port an ed25519 verification circuit from Circom or use an external library). This is complex, so an initial implementation might restrict to ECDSA keys or use the challenge method as a workaround. (We’ll discuss this more under considerations.)
Pseudo-code (Noir): The circuit might look like:
rust
Copiar
// Pseudocode for Noir circuit (for ECDSA secp256r1 as example)
fn main(pub_key_x: [u8; 32], pub_key_y: [u8; 32], 
        msg_hashes: [ [u8; 32]; N ], signatures: [ [u8; 64]; N ], min_commits: u32) {
    let mut count = 0;
    for i in 0..N {
        // Verify each signature
        let valid = std::ecdsa_secp256r1::verify_signature(pub_key_x, pub_key_y, signatures[i], msg_hashes[i]);
        assert(valid == true); // each signature must be valid
        count += 1;
    }
    // Ensure we have at least min_commits signatures verified
    assert(count >= min_commits);
}
This circuit iterates over N provided signatures (N is fixed at compile-time or a maximum). It uses Noir’s ECDSA verifier, which returns true if the signature is valid for the given pub_key_x, pub_key_y and message hash​
NOIR-LANG.ORG
. We assert that each is true. Then we assert the count is >= the threshold (if min_commits is a public input).
In practice, if N is fixed (say 5), the last assert could be simply assert(N >= min_commits) or even omit min_commits and assume N. If we allow variable count, we might supply dummy hashes/signatures for unused slots and include a boolean array indicating which entries are real, but that complicates the design. A simpler approach is to compile separate circuits for different N values or require exactly N commits to be provided for the proof of “at least N”.
Same Public Key: Notice that pub_key_x and pub_key_y are single inputs used for all verifications. This inherently ensures all signatures are checked against the same key. We do not allow different pubkeys for different commits in the circuit. So if the user accidentally mixed commits from two keys, the circuit would fail (because signatures for the wrong key would not verify). This enforces the "same public key" requirement.
Hashing inside vs outside: We chose to hash the commit payloads outside the circuit (in the frontend) and supply the hash. This is for efficiency – hashing a large payload inside the circuit would add many constraints. By providing msg_hashes as inputs, we assume the user hashed correctly. Since the signatures were verified by GitHub and also by our circuit, a malicious user cannot benefit from providing an incorrect hash (they would need a matching signature for that incorrect hash, which they don’t have). Using a secure hash (SHA-256) outside the circuit is acceptable here.
For completeness, the circuit could also recompute the hash from a shorter input (like a commit hash) if needed, but given we have the full payload and the signature uses it, external hashing is simplest.
Threshold Check: The circuit ensures that the number of valid signatures is at least the threshold:
In the pseudo-code above, we used a simple count and assert. Noir being an arithmetic circuit language, we might need to implement this carefully (e.g. using bit constraints or assuming N is small enough to safely compare as integers).
If N is fixed, this check is trivial. If we allowed a public input min_commits, we might set that as a constant when generating the proof. The circuit just ensures the loop ran N times successfully. Essentially, if the proof verifies at all, it inherently means N signatures were valid. So one could argue the threshold check in-circuit is redundant if we require exactly N signatures as input. However, to allow “at least N out of M possible inputs” concept, one could design more dynamic logic.
For our scope, it’s fine to have the circuit take exactly N commits and succeed only if all N are valid. The “at least” is satisfied because the user provided N of them. (They could always choose a subset of their commits equal to the threshold to prove that threshold.)
EdDSA (Ed25519) handling: If the user’s commits are signed with Ed25519 keys (common for GPG and SSH), we face the limitation that Noir doesn’t have a built-in ed25519 verifier yet. Two approaches:
Alternate Circuit/Lib: Develop a custom Noir circuit or use an external gadget for Ed25519. This would involve implementing point multiplication on ed25519’s curve (or a isomorphic twist like Ristretto) within the BN254 field, which is non-trivial and would increase proving time. Until such a library is available, this is an advanced task.
Convert to ECDSA if possible: This is not generally possible (Ed25519 and ECDSA are different algorithms). So instead, if a user’s commits are Ed25519-signed, we might handle those outside the ZK proof for now or simply not support them in the first iteration.
Recommendation: Initially, we can restrict the ZK proof feature to commits signed with ECDSA keys (e.g., if the user uses an ECC P-256 or secp256k1 signing key, or an S/MIME certificate, etc.). Many GitHub users use GPG RSA or Ed25519, which are unsupported in-circuit. We should clearly document this limitation. Users with unsupported signature types can still link their GitHub (we know they have commits, and perhaps we trust GitHub’s verification without ZK), but they won’t be able to generate the ZK proof until support is added.
Going forward, as Noir or community libraries add ed25519 verification support (which is an explicitly mentioned need​
AZTEC.NETWORK
), we can extend the circuit to cover that. For now, the circuit might have two modes or two versions: one for ECDSA signatures (fast path) and potentially one for EdDSA (slower path, if available).
Output: The circuit does not need to output any readable value; the primary result is whether all assertions pass. If they do, a proof is generated. We may include the threshold as a public output just to reinforce the statement, but it’s not necessary. The verification key on the backend will be used to check the proof’s validity.
In summary, the Noir circuit is straightforward for ECDSA: it leverages built-in crypto verification​
NOIR-LANG.ORG
 to ensure each signature is valid under one public key, and it confirms the count. By doing this in zero-knowledge, we never reveal which commits or which key – only that such commits exist and were signed by a key the user controls. Example: If N=5, the proof might be interpreted as: “There exists a public key (hidden) such that it has signed 5 known commit messages (hidden) with valid signatures.” The verifier (our backend) trusts this because the proof is valid. If we provided the key publicly in the proof, it would read: “Public key X has signed 5 messages (hidden).” Depending on the privacy requirement, we choose the appropriate approach.
Security Considerations
Integrating GitHub commit verification introduces several security aspects that we must carefully address:
Use Only Verified Commits: We strictly rely on commits that GitHub has marked as verified with a known key. In the commit retrieval step, we filter for verification.verified == true and reason == "valid"​
DOCS.GITHUB.COM
. This ensures the commit’s signature was cryptographically checked by GitHub and the key is linked to a GitHub account. We do not trust commits with reason: "unknown_key" or other failure reasons (e.g., an attacker could forge an unsigned commit with someone’s email; those will show verified:false or no_user etc., and we ignore them). By requiring GitHub’s valid status, we know the commit was genuinely signed by the user’s key and not tampered with​
DOCS.GITHUB.COM
.
Public Key Ownership (No Impersonation): A malicious user might try to use someone else’s public commit data to generate a proof. Without countermeasures, since anyone can obtain public commit payloads and signatures from GitHub, they could feed these to the circuit and produce a proof (because the circuit’s verification doesn’t require the private key — it only checks signatures that are already valid). To prevent this:
We implemented the challenge-response mechanism. The user must sign a fresh challenge with the same key, proving they hold the private key. An attacker using someone else’s commits would not have that private key and thus fail this step.
Additionally, the backend cross-checks that the public key used in commits is indeed one of the keys on this user’s GitHub account. GitHub’s verification already implies that (since if the key wasn’t the user’s, the commit wouldn’t be “valid” for them). But consider an edge case: an attacker picks public commits from user B (which are verified by user B’s key). If the attacker somehow got user B’s GitHub token, that’s a full account compromise beyond our scope. If they didn’t, they could still retrieve B’s commits if public. However, when our backend fetches commits using user A’s token, by filtering author=userA, we typically wouldn’t get user B’s commits. We also double-check the commit author/committer email matches the authenticated user. This binding on the backend side further ensures the commits belong to the logged-in user.
If we include the public key as a public input in the proof, the backend will verify that this key is in the user's GitHub key list on record. If it’s not, the proof is rejected. This ties the proof to the user’s identity.
Replay and Reuse of Proofs: Each proof generated is specific to a set of commits and a key. However, could someone reuse a proof? If an attacker somehow obtained the proof artifact of another user, they could not claim it as theirs because the backend will associate it with the original user (our system doesn’t accept a proof in isolation; it’s always tied to the authenticated session or user). To further harden:
We might incorporate a user-specific value or session ID in the circuit (as a public input) to bind the proof to that user. For example, the circuit could take the user’s GitHub ID or a hash of it as an input and include it in the verification statements. But since our proof is verified server-side in context, this might be unnecessary.
We ensure the proof is immediately stored or used server-side so it can’t be intercepted and reused elsewhere. All communication of the proof uses secure channels (HTTPS).
If desired, the proof generation could include a nonce: the backend could supply a random nonce that the frontend includes as a pseudo “commit” to sign with the key inside the circuit (effectively similar to challenge, but done in-circuit). This would make each proof unique per session and prevent any chance of replay. This is a design enhancement worth noting.
Payload Integrity: The commit payload is the exact data that was signed to produce the commit’s signature​
DOCS.GITHUB.COM
. By using GitHub’s provided payload and signature, we ensure we’re verifying the true commit content. Inside the circuit, because we verify the signature against the hash of this payload, we are assured that the commit’s message and metadata were exactly what was signed. The user cannot modify the commit content or signature without failing verification. Thus, the proof inherently attests to the integrity of those commits. We trust GitHub to give us the correct payload; an extra precaution could be to independently compute the git commit hash and compare it with the known commit SHA, but since we are already using GitHub’s verification output, this is redundant.
Choice of Cryptography: We must note which algorithms we trust:
For ECDSA (secp256k1/r1), the Noir standard library uses a secure verification function​
NOIR-LANG.ORG
. We rely on the security of the elliptic curve and that Noir/Barretenberg correctly implements it. It has been optimized for SNARKs and is considered secure​
NOIR-LANG.ORG
.
For Ed25519, if we incorporate a custom verifier, we must be careful to include the required checks (EdDSA has specifics like clamping of keys and possibly needing to check for small subgroup etc.). If using an external circuit, ensure it’s well-audited. Until then, we might avoid automating ed25519 proofs.
We do not support RSA signatures in the circuit. If a commit was signed with an RSA GPG key, we cannot verify that in SNARK feasibly (RSA operations are too large for our circuit). Therefore, such commits would be skipped. This is a limitation: users with only RSA-signed commits cannot generate a proof in the current design. We should communicate this. In practice, many users have moved to ECC keys, but this is a consideration.
Key Revocation and Expiry: It’s possible a user’s GPG key is expired or revoked after the commits were made. GitHub’s API verification.reason might show expired_key​
DOCS.GITHUB.COM
 in those cases, and verified might be false. We already filter those out. If a key was valid at commit time but later revoked, the commits might still show as verified (not 100% certain – GitHub could mark them invalid). We assume that only currently valid keys yield reason: valid. Our proof only states that those commits were signed by the same key, not that the key is still valid. However, since we also do challenge/ownership check, the user must have an active key (even if expired, they can still sign if not revoked, but if revoked and removed from their account, GitHub wouldn’t mark as valid anyway). So this is a minor edge case.
Privacy Considerations:
The zero-knowledge approach ensures the content of the commits remains hidden in the proof. We never send commit messages or hashes to the backend or third parties. This means we preserve the privacy of what the user worked on. Only the fact they have N commits is revealed.
If we keep the public key hidden in the proof, we also don’t reveal which key or which GitHub account in the proof itself. However, our backend obviously knows the GitHub account via OAuth. The privacy benefit here is mostly if the proof were to be shown to an external verifier (not our system). In our context, privacy is mainly about not revealing repository names or commit messages to our backend.
Our design keeps all raw commit data client-side, which is a good security practice (no risk of us logging or leaking it, intentional or not). The proof is the only thing sent, and it’s zero-knowledge.
If an autonomous agent or external service were verifying the proof without knowing the user’s identity, they wouldn’t learn which specific contributions the user made – just that they have some. This could be extended to anonymous reputation systems.
API Security: The new endpoints should be protected:
Only an authenticated user (with a valid session or token in our app) can call GET /api/github/commits and POST /api/github/proof. These endpoints should check the user’s session and ensure they are linked to a GitHub account (for the commits endpoint).
The GitHub access token should be stored securely (e.g., encrypted in DB or in memory) and never exposed to the frontend or any other user’s session. All GitHub API calls are made server-side to avoid exposing the token.
When fetching commit data, use caution with user-provided parameters. For example, if we allow specifying a repository, ensure it belongs to the user (to avoid an attacker using our system as a proxy to fetch someone else’s commit data).
Rate limiting and caching on our side can prevent abuse of the GitHub API through our service.
Proof Verification: Always verify the proof server-side with the matching verification key (from the exact compiled circuit that the frontend used). Never trust a proof that wasn’t verified, and be mindful of version mismatches (if we update the circuit, proofs from an old circuit should be considered invalid or need re-verification with the old key accordingly).
Failure Modes: If any step fails (GitHub API failure, no commits, challenge fail, proof invalid), the system should handle it gracefully:
Inform the user clearly and allow retry or alternative verification (e.g., if no commits or unsupported key, perhaps suggest using Twitter or another method as a fallback until they have a supported setup).
Do not partially store data on failure (to avoid inconsistent state). E.g., only mark user as verified after final proof success.
By considering these security points, we ensure that adding GitHub commit proofs actually improves trust (through cryptographic guarantees) without introducing new vulnerabilities. The combination of OAuth authentication, GitHub’s own verification, our challenge-response, and ZK proof yields a robust chain of evidence that the user is the author of at least N signed commits.
API Extensions
To implement the above flows, we introduce a few new API endpoints and extend some existing ones. All new endpoints are prefixed under our API (assuming base path /api/):
GitHub OAuth Endpoints: (If not already handled by a generic OAuth system)
GET /api/auth/github/login – Initiates GitHub OAuth 2.0 by redirecting the user to GitHub’s authorize URL. This might not return data but rather redirect (in web flows, this is handled by the frontend as described).
GET /api/auth/github/callback?code=... – The callback URL that GitHub redirects to after user consent. The backend receives the code, exchanges it for an access token (with GitHub’s token endpoint), and then typically redirects or responds to the frontend. In a SPA scenario, we might have the frontend catch a token and call our backend as done in the flow. In any case, this results in the backend storing the token and associating it with the user’s account. After this, the user is considered “GitHub connected”.
Commit Retrieval Endpoint:
GET /api/github/commits?repo=<optional> – Returns signed commit data for the authenticated user. If repo parameter is provided, the backend will limit commits to that repository; if omitted, it can gather commits from all accessible repositories (potentially a larger response or requiring pagination).
Response: A JSON object (as shown earlier) containing an array of commits with fields: sha, message (commit message), date, verified, payload, signature, and possibly repo and key_id. For brevity, the backend might exclude payload and signature if the plan was to not send those to frontend, but since the proof generation needs them, we include them. (If we were extremely concerned about sending signature material to frontend, note that the user already has access via Git itself, and since it’s their data it’s fine.)
We preserve the citation of where payload and signature come from to ensure clarity: these are directly from GitHub’s commit API​
DOCS.GITHUB.COM
.
This endpoint requires the user’s session and uses the stored token to query GitHub. It may internally call multiple GitHub endpoints:
e.g., GET /user/repos to list repos, then for each GET /repos/:owner/:repo/commits?author=:user.
or GET /users/:user/events to get PushEvents that contain commits.
It will then filter and compile results.
Caching: The backend can cache the result of this call for a short time (say a few minutes) since commit history won’t change frequently. This can reduce GitHub API calls if the user refreshes the page or retries.
If the user has a very large number of signed commits, we might paginate this endpoint (e.g., ?page=2&per_page=50). But typically, proving a huge number is impractical, so we might just fetch the latest few hundred commits.
Example request: GET /api/github/commits
Example response: (as shown in JSON snippet earlier)
Proof Submission Endpoint:
POST /api/github/proof – Accepts the ZK proof and related data for verification. The request body would contain:
proof: the proof blob (likely base64 or hex encoded).
publicInputs: any public inputs that the verifier needs (e.g., threshold N, and if we decided, maybe the public key or its hash).
(Optionally, commits: could include commit IDs that were used, but this defeats the purpose of zero-knowledge if we wanted privacy. We likely skip sending commit identities. The server doesn’t need them if it trusts the proof.)
The endpoint will load the appropriate verifying key (which corresponds to the circuit version that frontend used – possibly determined by N or by a circuit ID).
It uses the verifier to check the proof. For instance, using barretenberg.js on the server or calling a verification service.
If verification passes, it updates the user’s record (e.g., marking GitHub proof verified, storing the proven commit count and maybe the public key fingerprint for record).
It returns a result JSON, e.g. { "success": true, "verified": true, "commitsProven": 5 } or an error if invalid.
This is an authenticated endpoint (must be called in the user’s session). We also ensure it’s called only after commits have been fetched or user is flagged as having done the prior steps.
Supporting Endpoints (if needed):
GET /api/github/keys – (Optional) to retrieve the user’s public keys from GitHub that we cached. In our flow, the backend uses them internally, so we might not expose this to frontend except for maybe displaying in UI (“Your signing keys on GitHub: …”). This would return the list of keys (with key_id, public_key, and possibly associated emails). It requires read:gpg_key or read:public_key scopes. This is not strictly needed in the proof flow, it’s more informational.
GET /api/github/status – Could return a summary of the user’s GitHub verification status (e.g., whether connected, how many commits verified). This could be used to refresh UI or for other parts of the app to know the state. Alternatively, the existing user profile endpoint can be extended to include this info.
All new endpoints will follow the same security practices as existing ones (authentication via session/cookie or token, input validation, error handling). We will also reuse similar response schemas and error codes as the Twitter API parts for consistency. For instance, if the Twitter endpoints return errors like {"error": "OAuth failed"}, we do similarly for GitHub. Example schema for GET /api/github/commits response:
json
Copiar
{
  "commits": [
    {
      "sha": "string",
      "repo": "string",
      "message": "string",
      "date": "ISO8601 timestamp",
      "verified": true,
      "payload": "string (commit payload text)",
      "signature": "string (signature in ASCII or base64)",
      "key_id": "string (Key fingerprint or ID)"
    }
    // ... more commits
  ]
}
Example schema for POST /api/github/proof request:
json
Copiar
{
  "proof": "string (base64)",
  "publicInputs": {
    "threshold": 5,
    "pubKey": "optional, e.g. hex of compressed key"
  }
}
Example response for proof submission:
json
Copiar
{
  "success": true,
  "verified": true,
  "commitsProven": 5
}
The success and verified would typically be the same (if verified is false, success might still be true in terms of HTTP 200 but indicate proof invalid). Note that the actual content of publicInputs depends on our earlier design choices. If we decided not to reveal pubKey in proof, we wouldn't include it here either. Additionally, we maintain proper HTTP status codes:
401 Unauthorized if user is not logged in.
400 Bad Request if, say, the proof format is wrong.
500 if an internal error occurs (like failure loading the proving key, etc.).
200 OK with a JSON body for successful operations.
By extending the API in this way, we ensure the frontend and backend can coordinate the new GitHub verification feature in a clean, RESTful manner, similar to the existing Twitter integration.
Integration with Existing Token Storage & UI
Finally, we need to integrate this new functionality into the existing system’s data models and user interface, ensuring a unified experience. Backend Data Integration:
User Profile Data: Extend the user model to include GitHub account info:
Fields like githubId, githubUsername, and githubToken (if tokens are stored) will be added. If the app already has an OAuth provider mapping (e.g., a table for linked accounts), we add an entry for GitHub.
Also add fields to store verification results, for example:
githubVerified (boolean) – true if the user has successfully generated a proof.
githubProofCommits (integer) – the number of commits proven (N).
githubProofKey (string) – identifier of the key used (could be a fingerprint or key ID). This could be useful to display or to ensure the user uses the same key if re-verifying.
If the system issues a JWT or token with user claims, we might include a claim like "github_verified": true and "github_commits_proven": N so that client-side or other microservices can trust this info.
Token Storage: The GitHub OAuth access token should be stored securely similar to Twitter’s:
If using a database, encrypt the token at rest. Or only store a refresh token if using OAuth apps that support it (GitHub’s classic OAuth tokens usually don’t expire, but fine-grained tokens might).
We should also store the token scope and expiry (if any).
Ensure that revoking the token or unlinking account is handled (a user might want to disconnect GitHub later; we should provide a way to remove their token and related data).
Session Management: After GitHub login, the user’s session should reflect that they have connected GitHub. For example, in the session object or Redux state (if any), mark user.githubConnected = true and store basic profile info from GitHub (like username, avatar URL) for UI use.
Concurrency and Consistency: If the user is verifying both Twitter and GitHub around the same time, our backend should handle that. There might be separate flags. We should ensure one doesn’t overwrite the other. Possibly we unify these into a generic "verifications" structure internally, but given the question context, we keep them separate and simple.
Caching and Rate Limits: We might want to cache the user's commit data in our DB after a successful proof, to avoid re-fetching commits every login. But commits can grow over time, so perhaps not permanently — maybe cache the last known commit count or last fetch time. We must also respect GitHub’s rate limits (the app likely won’t hit them unless we loop over huge repo lists).
Logging: For auditing, log important events: GitHub account linked (with GitHub ID), commit proof attempted, proof result (success/fail). This helps in debugging and security audits.
Frontend UI Integration:
Navigation & Visibility: The UI should now have a GitHub section alongside Twitter. For instance, on a verification page, have two cards: "Verify with Twitter" and "Verify with GitHub". If the user hasn’t connected GitHub, show the connect button; if connected but not proven, show the commit selection interface; if proven, show the verified status.
Consistency with Twitter UI: Use similar styling and wording. For example, if Twitter’s section says "Twitter account linked: @user (Verified ✓)" after verification, the GitHub section might say "GitHub account linked: user (Verified ✓)" once proof is done. The tone remains encouraging and developer-focused.
Guidance Messages: Add tooltips or info modals about what commit signing is, if needed. Some users might not know how to sign commits, so possibly include a short help: e.g., “(i) We detected 0 signed commits. To use this feature, enable commit signature in Git and add a GPG or SSH key to GitHub​
DOCS.GITHUB.COM
.” This goes slightly beyond the scope, but improves UX.
Error Display: Any errors encountered (no commits, wrong key selection, challenge failure, proof failure) should be displayed in a user-friendly way. Likely in the form of red text or an alert box. Provide actionable advice (like “Try selecting commits from the same repository or key” or “Make sure your GPG agent is setup to sign the provided challenge”).
Updating in Real-Time: After proof is verified, update the UI state without requiring a full page refresh. E.g., the "Generate Proof" button can turn into a green checkmark or disabled state that says "Verified". The application state should note that, so if the user navigates away and back, it shows as verified. This can be done by updating the global state or refetching the profile data from server.
Multiple Verifications: If the system supports multiple identities, ensure the UI clearly distinguishes them. The user could verify Twitter and GitHub. If so, maybe display two checkmarks on their profile, etc. Integrating into a unified “Identity Verified” display might be a future consideration.
Responsive Design: Ensure the commit list UI scrolls nicely if there are many commits, and that on mobile the text (commit messages) wrap properly. Possibly use a modal or accordion to show the commit list if space is constrained.
Example UI Elements:
A section like: GitHub Verification
Status: Not verified.
<button>Connect GitHub</button> (After connecting:)
GitHub Account: octocat (50 verified commits detected)
Select commits to prove you control this account:
[ ] Fix critical bug (Oct 1, 2025)
[ ] Add README (Sep 20, 2025)
[ ] Update CI config (Sep 10, 2025)
...
(Select at least 5)
<button disabled={!selectionValid}>Generate ZK Proof</button> (During proof generation:)
Generating proof... (spinner) (After success:)
✅ Proof verified! You have proven ownership of 5 signed commits.
(Your GitHub is now verified in the system.)
The frontend code will handle the OAuth popup/redirect. Possibly using a similar function as used for Twitter (just different endpoints).
Re-use components: If the app has a generic OAuth connect button component or a loading indicator, those can be used for GitHub to minimize new code.
Testing UI: We should test with various scenarios: user with no signed commits (see that it handles gracefully), user with multiple keys (ensure UI warns or groups properly), error from GitHub (like token expired – perhaps handle by prompting re-connect if API calls fail with 401), etc.
In integration, we maintain a cohesive experience: the user simply logs in with GitHub, clicks a few commits, and gets a verification, just like they would tweet something for Twitter verification. Under the hood, we added complex cryptography, but the UI abstracts that complexity away, just showing progress messages. This ensures even an autonomous agent or developer assistant using the interface can easily follow the steps (the instructions and logs in the UI can guide an agent to do the right things, e.g., it can parse “Proof is valid… ✅” from logs similar to how the Noir tutorial does​
NOIR-LANG.ORG
). Overall, by integrating with the existing token storage (for OAuth) and mirroring the frontend patterns, we add GitHub commit verification as a first-class citizen of the app’s identity verification system. This not only extends the trust model (now we trust cryptographic proofs of open-source contributions) but does so in a user-friendly manner consistent with the app’s design.