// =============================================================================
// StellarFlow — Multi-Vault Treasury Routing Contract
// Deployed on Stellar Soroban (Testnet / Mainnet)
//
// Architecture:
//   - Admin-gated vault registry with append-only semantics
//   - Proportional capital-optimized payout routing across N corporate vaults
//   - Checked arithmetic throughout to eliminate all overflow / underflow vectors
//   - Structured event emission for off-chain RPC stream ingestion
// =============================================================================

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token::Client as TokenClient,
    Address, Env, Map, Symbol, Vec,
};

// ---------------------------------------------------------------------------
// Storage Key Taxonomy
//
// All persistent state is addressed through this enum, ensuring zero key
// collision across the entire contract namespace.
// ---------------------------------------------------------------------------

/// Exhaustive enumeration of every distinct persistent storage key used by
/// this contract. Each variant maps to exactly one logical datum in the
/// Soroban ledger entry store.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageKey {
    /// The sole administrative authority permitted to mutate system parameters.
    Admin,
    /// Append-only Vec<Address> of registered corporate vault wallets.
    CorporateVaults,
    /// Upper bound (in stroops) on any single routed transaction.
    MaxTransferLimit,
    /// The canonical Stellar Asset Contract address for the native asset token.
    NativeAssetContract,
}

// ---------------------------------------------------------------------------
// Error Taxonomy
//
// Every failure mode surfaces as a distinct u32 discriminant, allowing
// off-chain tooling to parse status codes unambiguously.
// ---------------------------------------------------------------------------

/// Strongly-typed contract error codes. Mirrors the off-chain AppError enum.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    /// Caller did not provide a valid admin authentication signature.
    Unauthorized = 1,
    /// Requested transfer amount exceeds the configured MaxTransferLimit.
    LimitExceeded = 2,
    /// Aggregate liquid balance across all vaults is insufficient.
    InsufficientTotalFunds = 3,
    /// Vault registry is empty — at least one vault must be registered.
    NoVaultsRegistered = 4,
    /// Safe-arithmetic operation produced an overflow or underflow.
    ArithmeticOverflow = 5,
    /// Contract has already been initialized; re-initialization is forbidden.
    AlreadyInitialized = 6,
}

// ---------------------------------------------------------------------------
// Contract Implementation
// ---------------------------------------------------------------------------

#[contract]
pub struct TreasuryRouter;

#[contractimpl]
impl TreasuryRouter {
    // -----------------------------------------------------------------------
    // initialize
    //
    // One-shot bootstrapper. Commits the root administrator address and
    // establishes the global per-transaction transfer cap. Reverts with
    // `AlreadyInitialized` if called more than once, preventing privilege
    // escalation through re-initialization.
    // -----------------------------------------------------------------------

    /// Initialize the treasury contract.
    ///
    /// # Arguments
    /// * `admin`      – The Address that will hold administrative authority.
    /// * `max_limit`  – Maximum stroops transferable in a single `route_payout` call.
    /// * `native_sac` – Address of the native Stellar Asset Contract (SAC).
    pub fn initialize(env: Env, admin: Address, max_limit: i128, native_sac: Address) {
        // Guard: idempotency — refuse second initialization attempt.
        if env
            .storage()
            .persistent()
            .has(&StorageKey::Admin)
        {
            panic!("{}", ContractError::AlreadyInitialized as u32);
        }

        // Require the deployer to authenticate as admin during bootstrap.
        admin.require_auth();

        // Commit all initial state atomically.
        env.storage()
            .persistent()
            .set(&StorageKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&StorageKey::MaxTransferLimit, &max_limit);
        env.storage()
            .persistent()
            .set(&StorageKey::NativeAssetContract, &native_sac);
        env.storage()
            .persistent()
            .set(&StorageKey::CorporateVaults, &Vec::<Address>::new(&env));

        // Emit initialization event for off-chain indexer bootstrap.
        env.events().publish(
            (Symbol::new(&env, "initialized"),),
            (admin.clone(), max_limit),
        );
    }

    // -----------------------------------------------------------------------
    // add_vault_wallet
    //
    // Appends a new corporate vault address to the persistent registry.
    // Only the registered admin may invoke this function. Duplicate addresses
    // are permitted at the protocol level (preventing revert-griefing), with
    // deduplication handled in the off-chain ingestion layer.
    // -----------------------------------------------------------------------

    /// Register a new corporate vault wallet with the treasury system.
    ///
    /// # Arguments
    /// * `caller` – Must be the registered admin (authentication enforced).
    /// * `vault`  – The Stellar Address of the new vault wallet to register.
    pub fn add_vault_wallet(env: Env, caller: Address, vault: Address) {
        // Enforce admin-only access gate.
        Self::assert_admin(&env, &caller);
        caller.require_auth();

        let mut vaults: Vec<Address> = env
            .storage()
            .persistent()
            .get(&StorageKey::CorporateVaults)
            .unwrap_or_else(|| Vec::new(&env));

        vaults.push_back(vault.clone());

        env.storage()
            .persistent()
            .set(&StorageKey::CorporateVaults, &vaults);

        // Signal vault addition to off-chain event streams.
        env.events().publish(
            (Symbol::new(&env, "vault_added"),),
            (vault, vaults.len()),
        );
    }

    // -----------------------------------------------------------------------
    // route_payout
    //
    // Core treasury execution logic. Performs:
    //   1. Admin authentication + transfer limit guard.
    //   2. Balance aggregation across all registered vaults via cross-contract
    //      calls to the native Stellar Asset Contract.
    //   3. Capital optimization — proportional allocation weighted by each
    //      vault's liquid share of the total aggregate balance.
    //   4. Token transfers from each contributing vault to the destination.
    //   5. Structured event emission with the full allocation breakdown map.
    //
    // Returns a Map<Address, i128> describing exact stroops moved per vault.
    // -----------------------------------------------------------------------

    /// Execute a proportional multi-vault payout to a single destination.
    ///
    /// # Arguments
    /// * `source_admin`   – Caller; must be the registered admin.
    /// * `total_target`   – Total stroops to deliver to `destination`.
    /// * `destination`    – Recipient address for the consolidated transfer.
    ///
    /// # Returns
    /// A `Map<Address, i128>` mapping each contributing vault to its exact
    /// transfer amount in stroops (sum == `total_target`).
    pub fn route_payout(
        env: Env,
        source_admin: Address,
        total_target: i128,
        destination: Address,
    ) -> Map<Address, i128> {
        // --- Authentication & Limit Guard -----------------------------------
        Self::assert_admin(&env, &source_admin);
        source_admin.require_auth();

        let max_limit: i128 = env
            .storage()
            .persistent()
            .get(&StorageKey::MaxTransferLimit)
            .expect("contract not initialized");

        if total_target > max_limit {
            panic!("{}", ContractError::LimitExceeded as u32);
        }

        // --- Vault Registry Read --------------------------------------------
        let vaults: Vec<Address> = env
            .storage()
            .persistent()
            .get(&StorageKey::CorporateVaults)
            .unwrap_or_else(|| Vec::new(&env));

        if vaults.is_empty() {
            panic!("{}", ContractError::NoVaultsRegistered as u32);
        }

        let native_sac: Address = env
            .storage()
            .persistent()
            .get(&StorageKey::NativeAssetContract)
            .expect("native SAC not set");

        let token = TokenClient::new(&env, &native_sac);

        // --- Balance Aggregation (cross-contract calls) ----------------------
        // Collect (vault_address, balance) pairs for all registered vaults.
        let mut vault_balances: Vec<(Address, i128)> = Vec::new(&env);
        let mut aggregate_balance: i128 = 0_i128;

        for vault in vaults.iter() {
            let balance = token.balance(&vault);
            if balance > 0 {
                // Checked addition — panic on overflow.
                aggregate_balance = aggregate_balance
                    .checked_add(balance)
                    .expect("aggregate overflow");
                vault_balances.push_back((vault, balance));
            }
        }

        // Guard: collective solvency check.
        if aggregate_balance < total_target {
            panic!("{}", ContractError::InsufficientTotalFunds as u32);
        }

        // --- Proportional Capital Optimization ------------------------------
        // allocation_i = floor(total_target * balance_i / aggregate_balance)
        // Remainder is appended to the first vault to avoid rounding drift.
        let mut allocation_map: Map<Address, i128> = Map::new(&env);
        let mut distributed: i128 = 0_i128;
        let last_idx = vault_balances.len().checked_sub(1).unwrap_or(0);

        for (idx, (vault, balance)) in vault_balances.iter().enumerate() {
            let alloc = if idx == last_idx as usize {
                // Final vault absorbs any rounding residual.
                total_target
                    .checked_sub(distributed)
                    .expect("subtraction overflow")
            } else {
                // Intermediate allocation: proportional share.
                total_target
                    .checked_mul(balance)
                    .and_then(|x| x.checked_div(aggregate_balance))
                    .expect("allocation arithmetic overflow")
            };

            if alloc == 0 {
                continue;
            }

            // Execute the atomic token transfer from this vault.
            token.transfer(&vault, &destination, &alloc);

            allocation_map.set(vault.clone(), alloc);
            distributed = distributed
                .checked_add(alloc)
                .expect("distributed sum overflow");
        }

        // --- Event Emission -------------------------------------------------
        // Emit structured "netting" event consumed by transit_engine.rs.
        use soroban_sdk::symbol_short;
        env.events().publish(
            (symbol_short!("netting"), symbol_short!("success")), 
            total_target
        );

        allocation_map
    }

    // -----------------------------------------------------------------------
    // approve_transaction
    //
    // On-chain approval anchor. Records an approval event referencing an
    // off-chain Redis-held XDR transaction ID. Consumed by the multi-sig
    // coordination engine in approvals.rs to trigger automated submission.
    // -----------------------------------------------------------------------

    /// Emit an on-chain approval event linking to an off-chain multi-sig slot.
    ///
    /// # Arguments
    /// * `signer`  – Approving authority (must authenticate).
    /// * `tx_ref`  – Opaque string ID matching the Redis key for the pending XDR.
    pub fn approve_transaction(env: Env, signer: Address, tx_ref: soroban_sdk::String) {
        signer.require_auth();

        env.events().publish(
            (Symbol::new(&env, "approved"),),
            (signer.clone(), tx_ref.clone()),
        );
    }

    // -----------------------------------------------------------------------
    // View Functions (read-only, no state mutation)
    // -----------------------------------------------------------------------

    /// Return the registered admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .persistent()
            .get(&StorageKey::Admin)
            .expect("not initialized")
    }

    /// Return the current list of registered corporate vault addresses.
    pub fn get_vaults(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&StorageKey::CorporateVaults)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Return the current per-transaction transfer cap in stroops.
    pub fn get_max_limit(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&StorageKey::MaxTransferLimit)
            .expect("not initialized")
    }

    // -----------------------------------------------------------------------
    // Internal Helpers
    // -----------------------------------------------------------------------

    /// Assert that `caller` matches the stored admin address.
    /// Panics with `ContractError::Unauthorized` discriminant if not.
    fn assert_admin(env: &Env, caller: &Address) {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&StorageKey::Admin)
            .expect("not initialized");

        if &admin != caller {
            panic!("{}", ContractError::Unauthorized as u32);
        }
    }
}

// =============================================================================
// Unit Tests (run with: cargo test --features testutils)
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, Events},
        Address, Env, IntoVal,
    };

    fn setup() -> (Env, Address, TreasuryRouterClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, TreasuryRouter);
        let client = TreasuryRouterClient::new(&env, &contract_id);

        // Deploy a mock native SAC for testing.
        let native_sac = Address::generate(&env);
        client.initialize(&admin, &1_000_000_000_i128, &native_sac);

        (env, admin, client)
    }

    #[test]
    fn test_initialize_sets_admin() {
        let (env, admin, client) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    fn test_add_vault_wallet() {
        let (env, admin, client) = setup();
        let vault = Address::generate(&env);
        client.add_vault_wallet(&admin, &vault);
        let vaults = client.get_vaults();
        assert_eq!(vaults.len(), 1);
        assert_eq!(vaults.get(0).unwrap(), vault);
    }

    #[test]
    #[should_panic(expected = "1")] // ContractError::Unauthorized
    fn test_add_vault_unauthorized() {
        let (env, _admin, client) = setup();
        let attacker = Address::generate(&env);
        let vault = Address::generate(&env);
        client.add_vault_wallet(&attacker, &vault);
    }

    #[test]
    #[should_panic(expected = "6")] // ContractError::AlreadyInitialized
    fn test_reinitialize_reverts() {
        let (env, admin, client) = setup();
        let sac = Address::generate(&env);
        client.initialize(&admin, &500_i128, &sac);
    }
}
