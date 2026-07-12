# Smart Routing Logic

The Smart Routing contract handles algorithmic distribution of funds across predefined treasury vaults (e.g., Master, Payroll, Marketing).

## Routing Configuration
The contract maintains a stateful routing configuration map, defining percentage allocations for incoming deposits.

### Configuration Struct
```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RouteConfig {
    pub destination: Address, // The sub-vault address
    pub weight: u32,          // e.g., 5000 for 50.00%
}
```

## Execution Flow (`[[transaction-lifecycle]]`)
1. **Inbound Transfer**: A user or external protocol transfers assets to the Smart Routing contract address.
2. **Distribution Trigger**: The `route_funds(env: Env, amount: i128)` function is invoked.
3. **Calculation**: The contract calculates the exact mathematical splits based on the stored `RouteConfig` weights (totaling 10,000 basis points).
4. **Dispatch**: The contract initiates cross-contract calls or native transfers to distribute the `amount` across the configured destinations.
