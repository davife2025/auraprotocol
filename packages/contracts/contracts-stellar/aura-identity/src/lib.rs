#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Bytes, BytesN, Env, Map, String, Symbol, symbol_short,
};

/// Storage keys
const IDENTITIES: Symbol = symbol_short!("IDENTS");
const ADMIN:      Symbol = symbol_short!("ADMIN");
const MINTERS:    Symbol = symbol_short!("MINTERS");
const COUNTER:    Symbol = symbol_short!("COUNTER");

#[contracttype]
#[derive(Clone, Debug)]
pub struct Identity {
    pub token_id:         u64,
    pub aura_id:          String,
    pub metadata_uri:     String,
    pub permissions_hash: BytesN<32>,
    pub minted_at:        u64,
    pub is_revoked:       bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum IdentityError {
    AlreadyExists      = 1,
    NotFound           = 2,
    Revoked            = 3,
    NotAuthorised      = 4,
    NotMinter          = 5,
}

#[contract]
pub struct AuraIdentityContract;

#[contractimpl]
impl AuraIdentityContract {

    /// Initialise — sets admin
    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&COUNTER, &0u64);
        env.storage().instance()
            .set(&MINTERS, &Map::<Address, bool>::new(&env));
    }

    /// Mint a soulbound identity for a wallet
    pub fn mint(
        env:              Env,
        caller:           Address,
        to:               Address,
        aura_id:          String,
        metadata_uri:     String,
        permissions_hash: BytesN<32>,
    ) -> Result<u64, IdentityError> {
        caller.require_auth();
        Self::require_minter(&env, &caller)?;

        let mut identities = Self::get_identities(&env);
        if identities.contains_key(to.clone()) {
            return Err(IdentityError::AlreadyExists);
        }

        let mut counter: u64 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        counter += 1;
        env.storage().instance().set(&COUNTER, &counter);

        let identity = Identity {
            token_id:         counter,
            aura_id,
            metadata_uri,
            permissions_hash,
            minted_at:        env.ledger().timestamp(),
            is_revoked:       false,
        };

        identities.set(to.clone(), identity);
        env.storage().instance().set(&IDENTITIES, &identities);

        env.events().publish(
            (symbol_short!("minted"), to.clone()),
            counter,
        );

        Ok(counter)
    }

    /// Revoke an identity (owner or admin)
    pub fn revoke(env: Env, caller: Address, wallet: Address) -> Result<(), IdentityError> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller != wallet && caller != admin {
            return Err(IdentityError::NotAuthorised);
        }

        let mut identities = Self::get_identities(&env);
        let mut identity = identities.get(wallet.clone())
            .ok_or(IdentityError::NotFound)?;

        identity.is_revoked = true;
        identities.set(wallet.clone(), identity);
        env.storage().instance().set(&IDENTITIES, &identities);

        env.events().publish((symbol_short!("revoked"), wallet), ());
        Ok(())
    }

    /// Update metadata URI
    pub fn update_metadata(
        env: Env, caller: Address, wallet: Address, new_uri: String,
    ) -> Result<(), IdentityError> {
        caller.require_auth();
        Self::require_minter(&env, &caller)?;
        let mut identities = Self::get_identities(&env);
        let mut identity = identities.get(wallet.clone())
            .ok_or(IdentityError::NotFound)?;
        if identity.is_revoked { return Err(IdentityError::Revoked); }
        identity.metadata_uri = new_uri;
        identities.set(wallet.clone(), identity);
        env.storage().instance().set(&IDENTITIES, &identities);
        Ok(())
    }

    /// Update permissions hash
    pub fn update_permissions(
        env: Env, caller: Address, wallet: Address, new_hash: BytesN<32>,
    ) -> Result<(), IdentityError> {
        caller.require_auth();
        Self::require_minter(&env, &caller)?;
        let mut identities = Self::get_identities(&env);
        let mut identity = identities.get(wallet.clone())
            .ok_or(IdentityError::NotFound)?;
        if identity.is_revoked { return Err(IdentityError::Revoked); }
        identity.permissions_hash = new_hash;
        identities.set(wallet.clone(), identity);
        env.storage().instance().set(&IDENTITIES, &identities);
        Ok(())
    }

    /// Read identity for a wallet
    pub fn get_identity(env: Env, wallet: Address) -> Option<Identity> {
        Self::get_identities(&env).get(wallet)
    }

    /// Check if wallet has a valid, non-revoked identity
    pub fn has_valid_identity(env: Env, wallet: Address) -> bool {
        match Self::get_identities(&env).get(wallet) {
            Some(id) => !id.is_revoked,
            None => false,
        }
    }

    /// Total minted identities
    pub fn total_supply(env: Env) -> u64 {
        env.storage().instance().get(&COUNTER).unwrap_or(0)
    }

    /// Authorise a minter address (admin only)
    pub fn authorise_minter(env: Env, caller: Address, minter: Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller != admin { panic!("not admin") }
        let mut minters: Map<Address, bool> = env.storage().instance()
            .get(&MINTERS).unwrap_or(Map::new(&env));
        minters.set(minter, true);
        env.storage().instance().set(&MINTERS, &minters);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn get_identities(env: &Env) -> Map<Address, Identity> {
        env.storage().instance()
            .get(&IDENTITIES)
            .unwrap_or(Map::new(env))
    }

    fn require_minter(env: &Env, caller: &Address) -> Result<(), IdentityError> {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller == &admin { return Ok(()); }
        let minters: Map<Address, bool> = env.storage().instance()
            .get(&MINTERS).unwrap_or(Map::new(env));
        if minters.get(caller.clone()).unwrap_or(false) {
            Ok(())
        } else {
            Err(IdentityError::NotMinter)
        }
    }
}
