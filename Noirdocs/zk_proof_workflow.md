# 🔄 Workflow de Pruebas ZK en Aplicaciones Reales

## 📚 Table of Contents
1. [Flujo de Trabajo Básico](#flujo-de-trabajo-básico)
2. [Almacenamiento de Pruebas](#almacenamiento-de-pruebas)
3. [Verificación de Pruebas](#verificación-de-pruebas)
4. [Integración con Smart Contracts](#integración-con-smart-contracts)
5. [Ejemplo de Aplicación Completa](#ejemplo-de-aplicación-completa)

## 🔄 Flujo de Trabajo Básico

### 1. Generación de Prueba
```typescript
// 1. Usuario ingresa datos
const age = 25;

// 2. Generar witness
const { witness } = await noir.execute({ age });

// 3. Generar prueba
const proof = await backend.generateProof(witness);

// 4. Verificar prueba localmente
const isValid = await backend.verifyProof(proof);
```

### 2. Estructura de la Prueba
```typescript
interface Proof {
    proof: Uint8Array;        // La prueba criptográfica
    publicInputs: Field[];    // Inputs públicos (si los hay)
    verificationKey: Uint8Array; // Clave de verificación
}
```

## 💾 Almacenamiento de Pruebas

### 1. Almacenamiento Local
```typescript
// Guardar prueba en localStorage
function saveProof(proof: Proof) {
    const proofData = {
        proof: Array.from(proof.proof),
        publicInputs: proof.publicInputs,
        verificationKey: Array.from(proof.verificationKey),
        timestamp: Date.now()
    };
    localStorage.setItem('ageProof', JSON.stringify(proofData));
}

// Recuperar prueba
function loadProof(): Proof | null {
    const proofData = localStorage.getItem('ageProof');
    if (!proofData) return null;
    
    const data = JSON.parse(proofData);
    return {
        proof: new Uint8Array(data.proof),
        publicInputs: data.publicInputs,
        verificationKey: new Uint8Array(data.verificationKey)
    };
}
```

### 2. Almacenamiento en Base de Datos
```typescript
// Estructura de la base de datos
interface ProofRecord {
    id: string;
    proof: string;        // Base64 encoded
    publicInputs: string[];
    verificationKey: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
}

// Guardar en base de datos
async function saveProofToDatabase(proof: Proof, userId: string) {
    const proofRecord: ProofRecord = {
        id: generateUUID(),
        proof: btoa(String.fromCharCode(...proof.proof)),
        publicInputs: proof.publicInputs.map(String),
        verificationKey: btoa(String.fromCharCode(...proof.verificationKey)),
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    };
    
    await db.proofs.insert(proofRecord);
    return proofRecord.id;
}
```

## ✅ Verificación de Pruebas

### 1. Verificación Local
```typescript
async function verifyProofLocally(proof: Proof): Promise<boolean> {
    try {
        return await backend.verifyProof(proof);
    } catch (error) {
        console.error('Error verifying proof:', error);
        return false;
    }
}
```

### 2. Verificación en Servidor
```typescript
// API endpoint para verificación
async function verifyProofOnServer(proof: Proof): Promise<VerificationResult> {
    // 1. Validar formato de la prueba
    if (!isValidProofFormat(proof)) {
        return { valid: false, error: 'Invalid proof format' };
    }

    // 2. Verificar prueba
    const isValid = await backend.verifyProof(proof);
    
    // 3. Registrar verificación
    await logVerification(proof, isValid);
    
    return {
        valid: isValid,
        timestamp: new Date(),
        verificationId: generateUUID()
    };
}
```

## 🔗 Integración con Smart Contracts

### 1. Verificación On-Chain
```solidity
// Solidity contract para verificación
contract AgeVerifier {
    function verifyProof(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) public view returns (bool) {
        // Implementar verificación usando el verificador de Noir
        return noirVerifier.verify(proof, publicInputs);
    }
}
```

### 2. Integración Frontend
```typescript
async function verifyProofOnChain(proof: Proof): Promise<boolean> {
    const contract = new ethers.Contract(
        VERIFIER_ADDRESS,
        VERIFIER_ABI,
        provider
    );

    try {
        return await contract.verifyProof(
            ethers.utils.hexlify(proof.proof),
            proof.publicInputs
        );
    } catch (error) {
        console.error('On-chain verification failed:', error);
        return false;
    }
}
```

## 🎯 Ejemplo de Aplicación Completa

### 1. Sistema de Verificación de Edad para Servicios

```typescript
class AgeVerificationService {
    private noir: Noir;
    private backend: UltraHonkBackend;
    private contract: ethers.Contract;

    constructor() {
        this.initializeNoir();
        this.initializeContract();
    }

    async verifyAge(age: number): Promise<VerificationResult> {
        // 1. Generar prueba
        const proof = await this.generateProof(age);
        
        // 2. Guardar prueba
        const proofId = await this.saveProof(proof);
        
        // 3. Verificar localmente
        const localVerification = await this.verifyLocally(proof);
        
        // 4. Verificar en blockchain
        const onChainVerification = await this.verifyOnChain(proof);
        
        return {
            proofId,
            localVerification,
            onChainVerification,
            timestamp: new Date()
        };
    }

    async checkVerificationStatus(proofId: string): Promise<Status> {
        // Implementar verificación de estado
    }
}
```

### 2. Flujo de Usuario

1. **Registro Inicial**
   ```typescript
   // Usuario ingresa edad
   const age = 25;
   
   // Genera y guarda prueba
   const result = await ageVerificationService.verifyAge(age);
   ```

2. **Uso Posterior**
   ```typescript
   // Verificar estado de prueba
   const status = await ageVerificationService.checkVerificationStatus(result.proofId);
   
   if (status.isValid) {
       // Permitir acceso a servicio
       await grantAccessToService(userId);
   }
   ```

### 3. Consideraciones de Seguridad

1. **Validación de Pruebas**
   - Verificar expiración
   - Validar formato
   - Comprobar integridad

2. **Almacenamiento Seguro**
   - Encriptar pruebas sensibles
   - Implementar rotación de claves
   - Mantener registros de auditoría

3. **Control de Acceso**
   - Implementar autenticación
   - Validar permisos
   - Monitorear uso

## 📈 Mejores Prácticas

1. **Gestión de Pruebas**
   - Implementar sistema de expiración
   - Mantener historial de verificaciones
   - Permitir revocación

2. **Optimización**
   - Cachear verificaciones frecuentes
   - Batch processing de pruebas
   - Compresión de datos

3. **Monitoreo**
   - Registrar métricas de uso
   - Monitorear tiempos de verificación
   - Alertar sobre anomalías

## 🔄 Workflow Completo

1. **Generación**
   - Usuario ingresa datos
   - Sistema genera prueba
   - Almacena prueba de forma segura

2. **Verificación**
   - Verifica localmente
   - Verifica en blockchain (si aplica)
   - Registra resultado

3. **Uso**
   - Consulta estado de prueba
   - Otorga/deniega acceso
   - Mantiene registro de auditoría

4. **Mantenimiento**
   - Renueva pruebas expiradas
   - Actualiza verificadores
   - Optimiza rendimiento 