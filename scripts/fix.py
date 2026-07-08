import re

with open('backend/contracts/src/lib.rs', 'r') as f:
    content = f.read()

# Fix execute_routing
old_routing = """        let mut vault_balances: Vec<(Address, i128)> = Vec::new(&env);
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
                    .expect("multiplication overflow")
                    .checked_div(aggregate_balance)
                    .expect("division by zero")
            };

            if alloc == 0 {
                continue;
            }"""

new_routing = """        let mut vault_balances: Vec<(Address, i128)> = Vec::new(&env);
        let mut aggregate_balance: i128 = 0_i128;
        let reserve_buffer: i128 = 15_000_000_i128; // 1.5 XLM safety buffer

        for vault in vaults.iter() {
            let balance = token.balance(&vault);
            let spendable = balance.checked_sub(reserve_buffer).unwrap_or(0);
            if spendable > 0 {
                aggregate_balance = aggregate_balance
                    .checked_add(spendable)
                    .expect("aggregate overflow");
                vault_balances.push_back((vault, spendable));
            }
        }

        if aggregate_balance < total_target {
            panic!("{}", ContractError::InsufficientTotalFunds as u32);
        }

        let mut allocation_map: Map<Address, i128> = Map::new(&env);
        let mut distributed: i128 = 0_i128;
        let last_idx = vault_balances.len().checked_sub(1).unwrap_or(0);

        for (idx, (vault, spendable)) in vault_balances.iter().enumerate() {
            let mut alloc = if idx == last_idx as usize {
                total_target
                    .checked_sub(distributed)
                    .expect("subtraction overflow")
            } else {
                total_target
                    .checked_mul(spendable)
                    .expect("multiplication overflow")
                    .checked_div(aggregate_balance)
                    .expect("division by zero")
            };

            // Safety cap: never allocate more than the vault's spendable amount.
            if alloc > spendable {
                alloc = spendable;
            }

            if alloc == 0 {
                continue;
            }"""

content = content.replace(old_routing, new_routing)

# Fix tests
content = content.replace("let mint_amount = 100_000_i128;", "let mint_amount = 50_000_000_i128;")
content = content.replace("let allowance_amount = 100_000_i128;", "let allowance_amount = 100_000_000_i128;")

with open('backend/contracts/src/lib.rs', 'w') as f:
    f.write(content)
