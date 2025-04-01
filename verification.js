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

// Load and compile the circuit
async function getCircuit() {
    const fm = createFileManager("/");
    const { body } = await fetch(main);
    const { body: nargoTomlBody } = await fetch(nargoToml);

    fm.writeFile("./src/main.nr", body);
    fm.writeFile("./Nargo.toml", nargoTomlBody);
    return await compile(fm);
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

// Deserialize proof data
function deserializeProof(data) {
    return {
        proof: new Uint8Array(data.proof),
        publicInputs: data.publicInputs || []
    };
}

// Parse proof data from JSON string
function parseProofData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        return deserializeProof(data);
    } catch (error) {
        throw new Error("Invalid proof format. Please check the JSON structure.");
    }
}

// Handle form submission
document.getElementById("verify").addEventListener("click", async () => {
    try {
        const proofText = document.getElementById("proof").value;
        if (!proofText.trim()) {
            showResult("Please enter a proof to verify.", false);
            return;
        }

        if (!noir || !backend) {
            await initializeNoir();
        }

        showResult("Verifying proof...", true);

        // Parse the proof data
        const proofData = parseProofData(proofText);

        // Verify the proof
        const isValid = await backend.verifyProof(proofData);
        console.log("Proof verification result:", isValid);

        if (isValid) {
            showResult(`
                ✅ Success! The proof is valid.
                <br>
                This means the age is verified to be 18 or greater.
            `, true);
        } else {
            showResult("❌ Verification failed. The proof is invalid.", false);
        }
    } catch (error) {
        console.error("Error:", error);
        showResult(`Error: ${error.message}`, false);
    }
});

// Initialize Noir when the page loads
initializeNoir(); 