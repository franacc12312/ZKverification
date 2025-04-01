
# Noir General Context

Noir is a domain-specific language (DSL) for writing zero-knowledge circuits. It is used to create zk-SNARK-based applications. The language emphasizes privacy, simplicity, and correctness.

## 🧠 Core Principles

- Noir is constraint-first, meaning logic is compiled into algebraic constraints.
- All values are either **private** (known only to the Prover) or **public** (known to both Prover and Verifier).
- You write code that looks imperative, but it defines a **static circuit**.

## 🛠 Project Structure

- `main.nr`: Entry file with a `fn main(...)` definition.
- `Nargo.toml`: Project config.
- `nargo` is the CLI for building, proving, and verifying Noir circuits.

## 🔁 Flow

1. Write Noir code with constraints (`assert`, `pub`, etc.)
2. Use `nargo prove` to generate a proof.
3. Use `nargo verify` to verify it, optionally with a smart contract.

## 🔣 Visibility

```rust
fn main(x: Field, y: pub Field) -> pub Field {
    x + y
}
```

- `x`: private
- `y`: public input
- return value: public output

## 📦 Key Concepts

- `Field`: the default numeric type.
- `assert`: enforces a constraint in the circuit.
- `pub`: makes a variable visible to the Verifier.
- `mut`, `let`, `struct`, `trait`, `slice`, `array`: common Rust-like syntax for working with logic and memory.

Always use `Field` instead of `u64` when possible, unless specific integer range constraints are needed.
