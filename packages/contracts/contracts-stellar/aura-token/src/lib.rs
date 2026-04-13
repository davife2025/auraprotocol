#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, Map, Symbol, symbol_short, token,
};

// $AURA uses the Stellar Token Interface (SEP-41 / Stellar Asset Contract)
// This contract wraps a Stellar Asset Contract and adds staking + tier gating.

const STAKES:   Symbol = symbol_short!("STAKES");
const STAKE_TS: Symbol = symbol_short!("STAKE_TS");
const ADMIN:    Symbol = symbol_short!("ADMIN");
const TOKEN:    Symbol = symbol_short!("TOKEN");

const STAKE_LOCK_LEDGERS: u32 = 7 * 24 * 60 * 12; // ~7 days at 5s ledger time
const PRO_THRESHOLD:      i128 = 1_000_000_000;    // 1,000 AURA (7 decimals)
const BUSINESS_THRESHOLD: i128 = 10_000_000_000;   // 10,000 AURA

#[contracttype]
#[derive(Clone, Debug)]
pub struct StakeRecord {
    pub amount:     i128,
    pub locked_at:  u32,  // ledger sequence
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum TokenError {
    InsufficientBalance = 1,
    StillLocked         = 2,
    NotStaked           = 3,
}

#[contract]
pub struct AuraTokenContract;

#[contractimpl]
impl AuraTokenContract {

    pub fn init(env: Env, admin: Address, token_contract: Address) {
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&TOKEN, &token_contract);
    }

    /// Stake $AURA — transfers from caller to this contract
    pub fn stake(env: Env, caller: Address, amount: i128) -> Result<(), TokenError> {
        caller.require_auth();
        if amount <= 0 { return Err(TokenError::InsufficientBalance); }

        let token_addr: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token = token::Client::new(&env, &token_addr);

        // Transfer from caller to this contract
        token.transfer(&caller, &env.current_contract_address(), &amount);

        // Record stake
        let mut stakes: Map<Address, StakeRecord> = env.storage().instance()
            .get(&STAKES).unwrap_or(Map::new(&env));
        let existing = stakes.get(caller.clone())
            .map(|s| s.amount).unwrap_or(0);

        stakes.set(caller.clone(), StakeRecord {
            amount:    existing + amount,
            locked_at: env.ledger().sequence(),
        });
        env.storage().instance().set(&STAKES, &stakes);

        env.events().publish((symbol_short!("staked"), caller), amount);
        Ok(())
    }

    /// Unstake $AURA — 7-day ledger lock enforced
    pub fn unstake(env: Env, caller: Address, amount: i128) -> Result<(), TokenError> {
        caller.require_auth();

        let mut stakes: Map<Address, StakeRecord> = env.storage().instance()
            .get(&STAKES).unwrap_or(Map::new(&env));

        let record = stakes.get(caller.clone()).ok_or(TokenError::NotStaked)?;
        if record.amount < amount { return Err(TokenError::InsufficientBalance); }

        let current_ledger = env.ledger().sequence();
        if current_ledger < record.locked_at + STAKE_LOCK_LEDGERS {
            return Err(TokenError::StillLocked);
        }

        let new_amount = record.amount - amount;
        if new_amount == 0 {
            stakes.remove(caller.clone());
        } else {
            stakes.set(caller.clone(), StakeRecord { amount: new_amount, locked_at: record.locked_at });
        }
        env.storage().instance().set(&STAKES, &stakes);

        let token_addr: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token = token::Client::new(&env, &token_addr);
        token.transfer(&env.current_contract_address(), &caller, &amount);

        env.events().publish((symbol_short!("unstaked"), caller), amount);
        Ok(())
    }

    /// Get staked balance for a wallet
    pub fn staked_balance(env: Env, wallet: Address) -> i128 {
        let stakes: Map<Address, StakeRecord> = env.storage().instance()
            .get(&STAKES).unwrap_or(Map::new(&env));
        stakes.get(wallet).map(|s| s.amount).unwrap_or(0)
    }

    pub fn has_pro_access(env: Env, wallet: Address) -> bool {
        Self::staked_balance(env, wallet) >= PRO_THRESHOLD
    }

    pub fn has_business_access(env: Env, wallet: Address) -> bool {
        Self::staked_balance(env, wallet) >= BUSINESS_THRESHOLD
    }

    pub fn has_premium_room_access(env: Env, wallet: Address, required_stake: i128) -> bool {
        Self::staked_balance(env, wallet) >= required_stake
    }
}
