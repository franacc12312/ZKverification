# 🎓 Frontend Example: Age Verification with NoirJS

## 📚 Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Circuit Implementation](#circuit-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Technical Details](#technical-details)
6. [Security Considerations](#security-considerations)
7. [Best Practices](#best-practices)

## 🌟 Overview

This example demonstrates how to create a web application that uses Zero Knowledge Proofs (ZKP) to verify that a user's age is greater than or equal to 18, without revealing the actual age. The application uses NoirJS for circuit execution and Barretenberg for proof generation.

### Key Features
- Zero-knowledge age verification
- Browser-based proof generation
- Real-time verification
- User-friendly interface
- Secure data handling

## 📁 Project Structure

```
noirjsapp/
├── circuit/
│   ├── src/
│   │   └── main.nr      # Noir circuit definition
│   └── Nargo.toml       # Circuit configuration
├── index.html           # User interface
├── index.js            # Application logic
├── vite.config.js      # Vite configuration
└── package.json        # Project dependencies
```

## 🔧 Circuit Implementation

### Circuit Code (main.nr)
```rust
fn main(age: u8) {
    assert(age >= 18);
}
```

### Circuit Explanation
- Takes a private input `age` of type `u8` (0-255)
- Creates a constraint that verifies age ≥ 18
- Returns true if constraint is satisfied, false otherwise

### Nargo.toml Configuration
```toml
[package]
name = "age_verification"
type = "bin"
```

## 💻 Frontend Implementation

### HTML Structure (index.html)
```html
<div class="container">
    <h1>Age Verification with Zero Knowledge Proof</h1>
    <div class="input-group">
        <input type="number" id="age" placeholder="Enter your age" min="0" max="255">
        <button id="submit">Verify Age</button>
    </div>
    <div id="result" class="result"></div>
</div>
```

### Key Components
1. **Input Field**
   - Type: number
   - Range: 0-255 (u8)
   - Placeholder text for user guidance

2. **Submit Button**
   - Triggers verification process
   - Handles user interaction

3. **Result Display**
   - Shows verification status
   - Displays proof (if successful)

### Styling
```css
.container {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.input-group {
    margin-bottom: 20px;
}

.result {
    margin-top: 20px;
    padding: 15px;
    border-radius: 4px;
    background-color: #f8f9fa;
}
```

## 🔍 Technical Details

### 1. Dependencies
```json
{
  "dependencies": {
    "@noir-lang/noir_wasm": "1.0.0-beta.2",
    "@noir-lang/noir_js": "1.0.0-beta.2",
    "@aztec/bb.js": "0.72.1"
  }
}
```

### 2. WASM Initialization
```javascript
await Promise.all([
    initACVM(fetch(acvm)),
    initNoirC(fetch(noirc))
]);
```

### 3. Circuit Loading
```javascript
async function getCircuit() {
    const fm = createFileManager("/");
    const { body } = await fetch(main);
    const { body: nargoTomlBody } = await fetch(nargoToml);

    fm.writeFile("./src/main.nr", body);
    fm.writeFile("./Nargo.toml", nargoTomlBody);
    return await compile(fm);
}
```

### 4. Proof Generation Flow
1. **Witness Generation**
   ```javascript
   const { witness } = await noir.execute({ age });
   ```

2. **Proof Creation**
   ```javascript
   const proof = await backend.generateProof(witness);
   ```

3. **Proof Verification**
   ```javascript
   const isValid = await backend.verifyProof(proof);
   ```

## 🔒 Security Considerations

### 1. Zero Knowledge
- Actual age is never revealed
- Only proof of age ≥ 18 is generated
- Proof cannot be used to derive the age

### 2. Input Validation
- Age must be between 0 and 255
- Input is parsed as integer
- Invalid inputs are rejected

### 3. Error Handling
- Graceful error handling
- User-friendly error messages
- Console logging for debugging

## 🎯 Best Practices

### 1. Code Organization
- Separate concerns (UI, logic, circuit)
- Modular function design
- Clear error handling

### 2. User Experience
- Clear input validation
- Immediate feedback
- Intuitive interface

### 3. Performance
- Lazy loading of WASM
- Efficient proof generation
- Minimal UI updates

### 4. Development
- Use Vite for development
- Proper error logging
- Clear code comments

## 🚀 Next Steps

1. **Enhancements**
   - Add more complex age verification rules
   - Implement multiple proof types
   - Add proof persistence

2. **Features**
   - User authentication
   - Proof history
   - Multiple verification methods

3. **Optimization**
   - Improve proof generation speed
   - Reduce WASM bundle size
   - Enhance UI responsiveness

## 📚 References

1. [NoirJS Documentation](https://noir-lang.org/docs/tutorials/noirjs_app)
2. [Barretenberg Documentation](https://github.com/AztecProtocol/barretenberg)
3. [Vite Documentation](https://vitejs.dev/) 