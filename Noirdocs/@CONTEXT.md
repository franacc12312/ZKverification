# NoirJS Age Verification App

## Project Overview
A zero-knowledge proof application that allows users to verify they are 18 or older without revealing their exact age. The application uses Noir language for the zero-knowledge circuit and provides a web interface for proof generation and verification.

## Project Structure
```
noirjsapp/
├── circuit/                    # Noir circuit implementation
│   ├── Nargo.toml             # Noir package configuration
│   └── src/
│       └── main.nr            # Main circuit logic
├── index.html                 # Main page for age input and proof generation
├── verification.html          # Page for proof verification
├── index.js                   # Main application logic
├── verification.js            # Proof verification logic
├── package.json              # Project dependencies and scripts
└── vite.config.js            # Vite build configuration
```

## Core Components

### 1. Zero-Knowledge Circuit (`circuit/src/main.nr`)
```noir
fn main(age: u8) {
    assert(age >= 18);
}
```
- Simple circuit that proves age is >= 18 without revealing the actual age
- Takes unsigned 8-bit integer as input
- Returns boolean assertion result

### 2. Main Application (`index.js`)
Key functionalities:
- WASM initialization for Noir
- Circuit compilation and initialization
- Proof generation workflow:
  1. Age input validation
  2. Witness generation
  3. Proof generation
  4. Proof serialization
  5. Local storage of proof
- UI feedback and error handling
- Clipboard integration for proof sharing

### 3. Verification Component (`verification.js`)
Key functionalities:
- Proof deserialization
- Verification logic
- UI feedback for verification results
- Error handling for invalid proofs

## Dependencies
```json
{
  "dependencies": {
    "@noir-lang/noir_wasm": "1.0.0-beta.2",
    "@noir-lang/noir_js": "1.0.0-beta.2",
    "@aztec/bb.js": "0.72.1"
  }
}
```

## Key Features
1. **Zero-Knowledge Proof Generation**
   - Age verification without age disclosure
   - Secure proof generation using UltraHonk backend
   - Proof serialization for storage and transfer

2. **Proof Verification**
   - Separate verification interface
   - Proof deserialization and validation
   - Clear verification feedback

3. **User Interface**
   - Input validation
   - Progress feedback
   - Error handling
   - Proof copying functionality

## Technical Implementation Details

### Proof Generation Flow
1. User inputs age
2. Circuit compiles and initializes
3. Witness generation with age input
4. Proof generation using UltraHonk backend
5. Proof verification
6. Serialization and storage

### Proof Verification Flow
1. User inputs serialized proof
2. Proof deserialization
3. Verification using UltraHonk backend
4. Result display

### Data Structures

#### Proof Serialization Format
```typescript
{
  proof: Uint8Array,        // The actual zero-knowledge proof
  publicInputs: any[],      // Public inputs if any
  timestamp: number         // Generation timestamp
}
```

## Development Guidelines

### Adding New Features
1. Maintain separation of concerns between proof generation and verification
2. Follow existing error handling patterns
3. Provide clear user feedback
4. Document any new circuit modifications

### Testing Considerations
1. Verify proof generation with various valid ages
2. Test invalid age inputs
3. Verify proof serialization/deserialization
4. Test verification with valid and invalid proofs

## Configuration
- Circuit configuration in `Nargo.toml`
- Build configuration in `vite.config.js`
- Dependencies managed in `package.json`

## Logging Strategy
- Circuit initialization logs
- Proof generation step logs
- Verification result logs
- Error logging with detailed messages

## Future Considerations
1. Additional age-related proofs
2. Enhanced proof storage mechanisms
3. Integration with external verification systems
4. UI/UX improvements
5. Extended circuit capabilities

---
Last Updated: [Current Date]
Version: 1.0.0 