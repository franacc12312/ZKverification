# Flujo de trabajo con Noir y Barretenberg

Este documento resume el proceso completo para trabajar con Noir, desde escribir un circuito hasta generar y verificar una prueba zk-SNARK usando Barretenberg (`bb`).

---

## 🛠️ 1. Instalar herramientas

### Noir + Nargo (CLI para Noir)

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
noirup
```

### Barretenberg (Proving backend)

```bash
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/master/barretenberg/bbup/install | bash
bbup
```

### jq (requerido por `bbup`)

```bash
brew install jq
```

---

## ✏️ 2. Escribir el circuito Noir

```bash
nargo new hello_world
cd hello_world
```

Editar el archivo `src/main.nr`:

```rust
fn main(x: Field, y: pub Field) {
    assert(x != y);
}
```

---

## ⚙️ 3. Proveer inputs y ejecutar

Editar `Prover.toml`:

```toml
x = "1"
y = "2"
```

Ejecutar el circuito:

```bash
nargo execute
```

Esto genera:
- `./target/hello_world.json` → circuito compilado
- `./target/hello_world.gz` → witness (valores de entrada válidos)

---

## 🔐 4. Preparar directorios y generar la prueba

### Crear directorios necesarios
```bash
# Crear directorios para pruebas y verification key
mkdir -p ./target/proof
mkdir -p ./target/vk
```

### Generar la prueba con `bb`
```bash
bb prove -b ./target/hello_world.json -w ./target/hello_world.gz -o ./target/proof
```

Nota: El comando `bb prove` creará un archivo llamado `proof` dentro del directorio especificado.

---

## 🧾 5. Generar la verification key (VK)

```bash
bb write_vk -b ./target/hello_world.json -o ./target/vk
```

Nota: El comando `bb write_vk` creará un archivo llamado `vk` dentro del directorio especificado.

---

## ✅ 6. Verificar la prueba

```bash
bb verify -k ./target/vk/vk -p ./target/proof/proof
```

Si todo está bien, verás:
```
Proof verified successfully
```

---

## 🎯 Extra: leer inputs públicos

Para leer los inputs públicos embebidos en la prueba:

```bash
head -c 32 ./target/proof/proof | od -An -v -t x1 | tr -d $' \n'
```

---

## 🧠 Resumen

| Paso | Herramienta | Resultado |
|------|-------------|-----------|
| Escribir circuito | `main.nr` | Lógica zk |
| Ejecutar con inputs | `nargo execute` | `.json` + `.gz` |
| Crear directorios | `mkdir -p` | Directorios para pruebas y VK |
| Generar prueba | `bb prove` | `.proof` |
| Generar VK | `bb write_vk` | `.vk` |
| Verificar prueba | `bb verify` | ✅ |

---

## 🧰 Bonus: script automatizado

```bash
#!/bin/bash

# Crear directorios necesarios
mkdir -p ./target/proof
mkdir -p ./target/vk

# Ejecutar el flujo completo
nargo execute
bb prove -b ./target/hello_world.json -w ./target/hello_world.gz -o ./target/proof
bb write_vk -b ./target/hello_world.json -o ./target/vk
bb verify -k ./target/vk/vk -p ./target/proof/proof
```

## ⚠️ Notas importantes

1. **Directorios**: Asegúrate de crear los directorios necesarios antes de ejecutar los comandos de bb
2. **Rutas**: bb creará archivos con nombres predeterminados (`proof` y `vk`) dentro de los directorios especificados
3. **Verificación**: Usa las rutas completas a los archivos generados al verificar la prueba
