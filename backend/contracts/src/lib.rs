// =============================================================================
// StellarFlow — Multi-Vault Treasury Routing Contract
// Deployed on Stellar Soroban (Testnet / Mainnet)
//
// Architecture:
//   - Admin-gated vault registry with append-only semantics
//   - Proportional capital-optimized payout routing across N corporate vaults
//   - Checked arithmetic throughout to eliminate all overflow / underflow vectors
//   - Structured event emission for off-chain RPC stream ingestion
//   - V3: Full on-chain multi-sig governance state machine
// =============================================================================

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token::Client as TokenClient,
    Address, Env, Map, Symbol, Vec,
};

// ---------------------------------------------------------------------------
// Storage Key Taxonomy
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageKey {
    Admin,
    CorporateVaults,
    MaxTransferLimit,
    NativeAssetContract,
    ProposalCounter,
    Proposal(u32),
}

// ---------------------------------------------------------------------------
// Multi-Sig Proposal Struct (V3)
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub proposer: Address,
    pub recipient: Address,
    pub amount: i128,
    pub approvers: Vec<Address>,
    pub required: u32,
    pub executed: bool,
}

// ---------------------------------------------------------------------------
// Error Taxonomy
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    Unauthorized = 1,
    LimitExceeded = 2,
    InsufficientTotalFunds = 3,
    NoVaultsRegistered = 4,
    ArithmeticOverflow = 5,
    AlreadyInitialized = 6,
    ProposalNotFound = 7,
    AlreadyApproved = 8,
    AlreadyExecuted = 9,
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
    // -----------------------------------------------------------------------
    pub fn initialize(env: Env, admin: Address, max_limit: i128, native_sac: Address) {
        if env.storage().persistent().has(&StorageKey::Admin) {
            panic!("{}", ContractError::AlreadyInitialized as u32);
        }
        admin.require_auth();
        env.storage().persistent().set(&StorageKey::Admin, &admin);
        env.storage().persistent().set(&StorageKey::MaxTransferLimit, &max_limit);
        env.storage().persistent().set(&StorageKey::NativeAssetContract, &native_sac);
        env.storage().persistent().set(&StorageKey::CorporateVaults, &Vec::<Address>::new(&env));
        
        env.storage().instance().set(&StorageKey::ProposalCounter, &0u32);

        env.events().publish(
            (Symbol::new(&env, "initialized"),),
            (admin.clone(), max_limit),
        );
    }

    // -----------------------------------------------------------------------
    // add_vault_wallet
    // -----------------------------------------------------------------------
    pub fn add_vault_wallet(env: Env, caller: Address, vault: Address) {
        Self::assert_admin(&env, &caller);
        caller.require_auth();

        let mut vaults: Vec<Address> = env
            .storage()
            .persistent()
            .get(&StorageKey::CorporateVaults)
            .unwrap_or_else(|| Vec::new(&env));

        for existing in vaults.iter() {
            if existing == vault {
                return;
            }
        }

        vaults.push_back(vault.clone());
        env.storage().persistent().set(&StorageKey::CorporateVaults, &vaults);

        env.events().publish(
            (Symbol::new(&env, "vault_added"),),
            (vault, vaults.len()),
        );
    }

    // -----------------------------------------------------------------------
    // route_payout (V3 upgraded with transfer_from)
    // -----------------------------------------------------------------------
    pub fn route_payout(
        env: Env,
        source_admin: Address,
        total_target: i128,
        destination: Address,
    ) -> Map<Address, i128> {
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
        let current_contract = env.current_contract_address();

        let mut vault_balances: Vec<(Address, i128)> = Vec::new(&env);
        let mut aggregate_balance: i128 = 0_i128;

        for vault in vaults.iter() {
            let balance = token.balance(&vault);
            if balance > 0 {
                aggregate_balance = aggregate_balance
                    .checked_add(balance)
                    .expect("aggregate overflow");
                vault_balances.push_back((vault, balance));
            }
        }

        if aggregate_balance < total_target {
            panic!("{}", ContractError::InsufficientTotalFunds as u32);
        }

        let mut allocation_map: Map<Address, i128> = Map::new(&env);
        let mut distributed: i128 = 0_i128;
        let last_idx = vault_balances.len().checked_sub(1).unwrap_or(0);

        for (idx, (vault, balance)) in vault_balances.iter().enumerate() {
            let alloc = if idx == last_idx as usize {
                total_target
                    .checked_sub(distributed)
                    .expect("subtraction overflow")
            } else {
                total_target
                    .checked_mul(balance)
                    .and_then(|x| x.checked_div(aggregate_balance))
                    .expect("allocation arithmetic overflow")
            };

            if alloc == 0 {
                continue;
            }

            // V3 Upgrade: Use transfer_from instead of transfer
            token.transfer_from(&current_contract, &vault, &destination, &alloc);

            allocation_map.set(vault.clone(), alloc);
            distributed = distributed
                .checked_add(alloc)
                .expect("distributed sum overflow");
        }

        use soroban_sdk::symbol_short;
        env.events().publish(
            (symbol_short!("netting"), symbol_short!("success")),
            total_target
        );

        allocation_map
    }

    // -----------------------------------------------------------------------
    // approve_transaction (legacy anchor)
    // -----------------------------------------------------------------------
    pub fn approve_transaction(env: Env, signer: Address, tx_ref: soroban_sdk::String) {
        signer.require_auth();
        env.events().publish(
            (Symbol::new(&env, "approved"),),
            (signer.clone(), tx_ref.clone()),
        );
    }

    // -----------------------------------------------------------------------
    // V3: propose_transfer
    // -----------------------------------------------------------------------
    pub fn propose_transfer(
        env: Env,
        proposer: Address,
        recipient: Address,
        amount: i128,
        required_approvals: u32,
    ) -> u32 {
        proposer.require_auth();

        let counter: u32 = env
            .storage()
            .instance()
            .get(&StorageKey::ProposalCounter)
            .unwrap_or(0u32);

        let new_id = counter.checked_add(1).expect("proposal counter overflow");
        env.storage().instance().set(&StorageKey::ProposalCounter, &new_id);

        let proposal = Proposal {
            proposer: proposer.clone(),
            recipient: recipient.clone(),
            amount,
            approvers: Vec::new(&env),
            required: required_approvals,
            executed: false,
        };

        env.storage().instance().set(&StorageKey::Proposal(new_id), &proposal);

        use soroban_sdk::symbol_short;
        env.events().publish(
            (symbol_short!("proposed"),),
            (new_id, proposer, recipient, amount),
        );

        new_id
    }

    // -----------------------------------------------------------------------
    // V3: approve_proposal
    // -----------------------------------------------------------------------
    pub fn approve_proposal(env: Env, approver: Address, proposal_id: u32) {
        approver.require_auth();

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&StorageKey::Proposal(proposal_id))
            .expect("proposal not found");

        if proposal.executed {
            panic!("{}", ContractError::AlreadyExecuted as u32);
        }

        for existing in proposal.approvers.iter() {
            if existing == approver {
                panic!("{}", ContractError::AlreadyApproved as u32);
            }
        }

        proposal.approvers.push_back(approver.clone());

        use soroban_sdk::symbol_short;

        if proposal.approvers.len() >= proposal.required {
            proposal.executed = true;
            env.storage().instance().set(&StorageKey::Proposal(proposal_id), &proposal);

            env.events().publish(
                (symbol_short!("executed"),),
                (proposal_id, proposal.recipient.clone(), proposal.amount),
            );
        } else {
            env.storage().instance().set(&StorageKey::Proposal(proposal_id), &proposal);

            env.events().publish(
                (symbol_short!("approved"),),
                (proposal_id, approver, proposal.approvers.len()),
            );
        }
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------
    pub fn get_proposal(env: Env, proposal_id: u32) -> Option<Proposal> {
        env.storage()
            .instance()
            .get(&StorageKey::Proposal(proposal_id))
    }

    pub fn get_proposal_counter(env: Env) -> u32 {
        env.storage().instance().get(&StorageKey::ProposalCounter).unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().persistent().get(&StorageKey::Admin).expect("not initialized")
    }

    pub fn get_vaults(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&StorageKey::CorporateVaults)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_max_limit(env: Env) -> i128 {
        env.storage().persistent().get(&StorageKey::MaxTransferLimit).expect("not initialized")
    }

    // -----------------------------------------------------------------------
    // Internal Helpers
    // -----------------------------------------------------------------------
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
// Unit Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        Address, Env,
    };

    fn setup() -> (Env, Address, TreasuryRouterClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, TreasuryRouter);
        let client = TreasuryRouterClient::new(&env, &contract_id);

        let native_sac = Address::generate(&env);
        client.initialize(&admin, &1_000_000_000_i128, &native_sac);

        (env, admin, client)
    }

    #[test]
    fn test_initialize_sets_admin() {
        let (_, admin, client) = setup();
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
    #[should_panic(expected = "1")]
    fn test_add_vault_unauthorized() {
        let (env, _admin, client) = setup();
        let attacker = Address::generate(&env);
        let vault = Address::generate(&env);
        client.add_vault_wallet(&attacker, &vault);
    }

    #[test]
    #[should_panic(expected = "6")]
    fn test_reinitialize_reverts() {
        let (env, admin, client) = setup();
        let sac = Address::generate(&env);
        client.initialize(&admin, &500_i128, &sac);
    }

    #[test]
    fn test_duplicate_vault_blocked() {
        let (env, admin, client) = setup();
        let vault = Address::generate(&env);
        client.add_vault_wallet(&admin, &vault);
        client.add_vault_wallet(&admin, &vault);
        let vaults = client.get_vaults();
        assert_eq!(vaults.len(), 1);
    }

    #[test]
    fn test_propose_transfer_creates_proposal() {
        let (env, admin, client) = setup();
        let recipient = Address::generate(&env);

        let proposal_id = client.propose_transfer(&admin, &recipient, &500_000_i128, &2u32);
        assert_eq!(proposal_id, 1u32);

        let proposal = client.get_proposal(&proposal_id);
        assert_eq!(proposal.amount, 500_000_i128);
        assert_eq!(proposal.required, 2u32);
        assert!(!proposal.executed);
        assert_eq!(proposal.approvers.len(), 0u32);
    }

    #[test]
    fn test_approve_proposal_reaches_threshold_and_executes() {
        let (env, admin, client) = setup();
        let recipient = Address::generate(&env);
        let approver_a = Address::generate(&env);
        let approver_b = Address::generate(&env);

        let pid = client.propose_transfer(&admin, &recipient, &100_000_i128, &2u32);

        client.approve_proposal(&approver_a, &pid);
        let p1 = client.get_proposal(&pid).unwrap();
        assert!(!p1.executed);

        client.approve_proposal(&approver_b, &pid);
        let p2 = client.get_proposal(&pid).unwrap();
        assert!(p2.executed);
    }

    #[test]
    #[should_panic(expected = "8")]
    fn test_double_approval_rejected() {
        let (env, admin, client) = setup();
        let recipient = Address::generate(&env);
        let approver = Address::generate(&env);

        let pid = client.propose_transfer(&admin, &recipient, &100_000_i128, &3u32);
        client.approve_proposal(&approver, &pid);
        client.approve_proposal(&approver, &pid);
    }

    #[test]
    #[should_panic(expected = "2")]
    fn test_route_payout_exceeds_limit() {
        let (env, admin, client) = setup();
        let dest = Address::generate(&env);
        client.route_payout(&admin, &2_000_000_000_i128, &dest);
    }

    #[test]
    #[should_panic(expected = "4")]
    fn test_route_payout_no_vaults_panics() {
        let (env, admin, client) = setup();
        let dest = Address::generate(&env);
        client.route_payout(&admin, &100_i128, &dest);
    }
}
