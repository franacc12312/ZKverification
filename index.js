import { compile, createFileManager } from "@noir-lang/noir_wasm";
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import main from "./circuit/src/main.nr?url";
import nargoToml from "./circuit/Nargo.toml?url";

// Initialize WASM modules
await Promise.all([
    initACVM(fetch(acvm)),
    initNoirC(fetch(noirc))
]);

// Load and compile the circuit
async function getCircuit() {
    const fm = createFileManager("/");
    const { body } = await fetch(main);
    const { body: nargoTomlBody } = await fetch(nargoToml);

    fm.writeFile("./src/main.nr", body);
    fm.writeFile("./Nargo.toml", nargoTomlBody);
    return await compile(fm);
}

// Initialize Noir and backend
let noir;
let backend;

async function initializeNoir() {
    try {
        const { program } = await getCircuit();
        noir = new Noir(program);
        backend = new UltraHonkBackend(program.bytecode);
        console.log("Noir initialized successfully");
    } catch (error) {
        console.error("Failed to initialize Noir:", error);
        showResult("Failed to initialize Noir. Check console for details.", false);
    }
}

// Show results in the UI
function showResult(message, success) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = `
        <div class="${success ? 'success' : 'error'}">
            ${message}
        </div>
    `;
}

// Serialize proof data
function serializeProof(proof) {
    // Log the proof structure to understand it
    console.log("Proof structure:", proof);
    
    // Convert the proof to a format that can be serialized
    return {
        proof: Array.from(proof.proof), // Convert Uint8Array to regular array
        publicInputs: proof.publicInputs || [],
        timestamp: Date.now()
    };
}

// Handle form submission
document.getElementById("submit").addEventListener("click", async () => {
    try {
        const ageInput = document.getElementById("age");
        const age = parseInt(ageInput.value);

        if (isNaN(age)) {
            showResult("Please enter a valid age", false);
            return;
        }

        if (!noir || !backend) {
            await initializeNoir();
        }

        showResult("Generating proof... ⏳", true);

        // Generate witness
        const { witness } = await noir.execute({ age });
        console.log("Witness generated");

        // Generate proof
        const proof = await backend.generateProof(witness);
        console.log("Proof generated");

        // Verify proof
        const isValid = await backend.verifyProof(proof);
        console.log("Proof verified:", isValid);

        if (isValid) {
            // Serialize and save proof to localStorage
            const proofData = serializeProof(proof);
            localStorage.setItem('ageProof', JSON.stringify(proofData));

            showResult(`
                ✅ Success! Your age is verified to be 18 or greater.
                <div class="proof">
                    <h3>Your Proof:</h3>
                    <pre>${JSON.stringify(proofData, null, 2)}</pre>
                    <button id="copyProof">Copy Proof</button>
                    <p>You can now <a href="verification.html">verify this proof</a> on the verification page.</p>
                </div>
            `, true);

            // Add copy functionality
            document.getElementById("copyProof").addEventListener("click", () => {
                const proofText = JSON.stringify(proofData, null, 2);
                navigator.clipboard.writeText(proofText).then(() => {
                    showResult("Proof copied to clipboard! You can now paste it on the verification page.", true);
                }).catch(err => {
                    showResult("Failed to copy proof. Please copy it manually.", false);
                });
            });
        } else {
            showResult("❌ Verification failed. Please check your input.", false);
        }
    } catch (error) {
        console.error("Error:", error);
        showResult("An error occurred. Check console for details.", false);
    }
});

// Initialize Noir when the page loads
initializeNoir(); 