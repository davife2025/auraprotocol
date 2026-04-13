#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, BytesN, Bytes, Env, Map, Symbol, symbol_short,
};

const PERMISSIONS: Symbol = symbol_short!("PERMS");
const ADMIN:       Symbol = symbol_short!("ADMIN");
const WRITERS:     Symbol = symbol_short!("WRITERS");

#[contracttype]
#[derive(Clone, Debug)]
pub struct PermissionRecord {
    pub schema_hash:          BytesN<32>,
    pub encoded_permissions:  Bytes,
    pub version:              u32,
    pub updated_at:           u64,
    pub is_active:            bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum PermError {
    NotAuthorised = 1,
    NotWriter     = 2,
    NotFound      = 3,
}

#[contract]
pub struct AuraPermissionsContract;

#[contractimpl]
impl AuraPermissionsContract {

    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&WRITERS, &Map::<Address, bool>::new(&env));
    }

    pub fn set_permissions(
        env:                 Env,
        caller:              Address,
        wallet:              Address,
        schema_hash:         BytesN<32>,
        encoded_permissions: Bytes,
    ) -> Result<(), PermError> {
        caller.require_auth();
        Self::require_writer(&env, &caller)?;

        let mut perms: Map<Address, PermissionRecord> = env.storage().instance()
            .get(&PERMISSIONS).unwrap_or(Map::new(&env));

        let version = perms.get(wallet.clone()).map(|p| p.version + 1).unwrap_or(1);

        perms.set(wallet.clone(), PermissionRecord {
            schema_hash,
            encoded_permissions,
            version,
            updated_at: env.ledger().timestamp(),
            is_active: true,
        });

        env.storage().instance().set(&PERMISSIONS, &perms);
        env.events().publish((symbol_short!("perm_set"), wallet), version);
        Ok(())
    }

    pub fn revoke_permissions(env: Env, caller: Address, wallet: Address) -> Result<(), PermError> {
        caller.require_auth();
        Self::require_writer(&env, &caller)?;

        let mut perms: Map<Address, PermissionRecord> = env.storage().instance()
            .get(&PERMISSIONS).unwrap_or(Map::new(&env));

        let mut record = perms.get(wallet.clone()).ok_or(PermError::NotFound)?;
        record.is_active = false;
        perms.set(wallet.clone(), record);
        env.storage().instance().set(&PERMISSIONS, &perms);
        Ok(())
    }

    pub fn get_permissions(env: Env, wallet: Address) -> Option<PermissionRecord> {
        let perms: Map<Address, PermissionRecord> = env.storage().instance()
            .get(&PERMISSIONS).unwrap_or(Map::new(&env));
        perms.get(wallet)
    }

    pub fn has_active_permissions(env: Env, wallet: Address) -> bool {
        let perms: Map<Address, PermissionRecord> = env.storage().instance()
            .get(&PERMISSIONS).unwrap_or(Map::new(&env));
        perms.get(wallet).map(|p| p.is_active).unwrap_or(false)
    }

    pub fn authorise_writer(env: Env, caller: Address, writer: Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller != admin { panic!("not admin") }
        let mut writers: Map<Address, bool> = env.storage().instance()
            .get(&WRITERS).unwrap_or(Map::new(&env));
        writers.set(writer, true);
        env.storage().instance().set(&WRITERS, &writers);
    }

    fn require_writer(env: &Env, caller: &Address) -> Result<(), PermError> {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller == &admin { return Ok(()); }
        let writers: Map<Address, bool> = env.storage().instance()
            .get(&WRITERS).unwrap_or(Map::new(env));
        if writers.get(caller.clone()).unwrap_or(false) { Ok(()) }
        else { Err(PermError::NotWriter) }
    }
}
