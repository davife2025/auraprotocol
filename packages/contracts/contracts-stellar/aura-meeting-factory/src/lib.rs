#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Bytes, BytesN, Env, Map, String, Symbol, Vec, symbol_short,
};

const MEETINGS: Symbol = symbol_short!("MEETINGS");
const ADMIN:    Symbol = symbol_short!("ADMIN");
const REP_ADDR: Symbol = symbol_short!("REP");
const COUNTER:  Symbol = symbol_short!("COUNTER");

#[contracttype]
#[derive(Clone, Copy, Debug)]
pub enum MeetingStatus {
    Pending  = 0,
    Active   = 1,
    Ended    = 2,
    Settled  = 3,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MeetingRecord {
    pub meeting_id:   String,
    pub creator:      Address,
    pub participants: Vec<Address>,
    pub status:       MeetingStatus,
    pub outcome_hash: Option<BytesN<32>>,
    pub created_at:   u64,
    pub settled_at:   Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct CommitmentRecord {
    pub agent_wallet:     Address,
    pub commitment:       String,
    pub commitment_type:  String,
    pub timestamp:        u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum MeetingError {
    AlreadyExists    = 1,
    NotFound         = 2,
    WrongStatus      = 3,
    NotAuthorised    = 4,
    TooFewParticipants = 5,
}

#[contract]
pub struct AuraMeetingFactoryContract;

#[contractimpl]
impl AuraMeetingFactoryContract {

    pub fn init(env: Env, admin: Address, reputation_contract: Address) {
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&REP_ADDR, &reputation_contract);
        env.storage().instance().set(&COUNTER, &0u64);
    }

    /// Create a new meeting record
    pub fn create_meeting(
        env:          Env,
        caller:       Address,
        meeting_id:   String,
        participants: Vec<Address>,
    ) -> Result<(), MeetingError> {
        caller.require_auth();

        if participants.len() < 2 {
            return Err(MeetingError::TooFewParticipants);
        }

        let mut meetings: Map<String, MeetingRecord> = env.storage().instance()
            .get(&MEETINGS).unwrap_or(Map::new(&env));

        if meetings.contains_key(meeting_id.clone()) {
            return Err(MeetingError::AlreadyExists);
        }

        let mut counter: u64 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        counter += 1;
        env.storage().instance().set(&COUNTER, &counter);

        meetings.set(meeting_id.clone(), MeetingRecord {
            meeting_id:   meeting_id.clone(),
            creator:      caller,
            participants,
            status:       MeetingStatus::Pending,
            outcome_hash: None,
            created_at:   env.ledger().timestamp(),
            settled_at:   None,
        });

        env.storage().instance().set(&MEETINGS, &meetings);
        env.events().publish((symbol_short!("mtg_crt"), meeting_id), counter);
        Ok(())
    }

    /// Settle meeting — records outcome hash and updates reputation
    pub fn settle_meeting(
        env:          Env,
        caller:       Address,
        meeting_id:   String,
        outcome_hash: BytesN<32>,
        scores:       Vec<u32>,  // 0-100 per participant, same order
    ) -> Result<(), MeetingError> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller != admin { return Err(MeetingError::NotAuthorised); }

        let mut meetings: Map<String, MeetingRecord> = env.storage().instance()
            .get(&MEETINGS).unwrap_or(Map::new(&env));

        let mut record = meetings.get(meeting_id.clone())
            .ok_or(MeetingError::NotFound)?;

        record.status      = MeetingStatus::Settled;
        record.outcome_hash = Some(outcome_hash.clone());
        record.settled_at   = Some(env.ledger().timestamp());
        meetings.set(meeting_id.clone(), record.clone());
        env.storage().instance().set(&MEETINGS, &meetings);

        // Update reputation for each participant via cross-contract call
        let rep_addr: Address = env.storage().instance().get(&REP_ADDR).unwrap();
        // Note: cross-contract calls done via invoke_contract in production
        // Simplified here — reputation update queued off-chain via events
        for (i, wallet) in record.participants.iter().enumerate() {
            let score = scores.get(i as u32).unwrap_or(50);
            env.events().publish(
                (symbol_short!("rep_upd"), wallet.clone()),
                score,
            );
        }

        env.events().publish((symbol_short!("settled"), meeting_id), outcome_hash);
        Ok(())
    }

    /// Record a fulfilled commitment (emits event for off-chain processing)
    pub fn record_commitment_fulfilled(env: Env, caller: Address, agent_wallet: Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller != admin { panic!("not admin") }
        env.events().publish((symbol_short!("com_ok"), agent_wallet), true);
    }

    /// Record a broken commitment
    pub fn record_commitment_broken(env: Env, caller: Address, agent_wallet: Address) {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller != admin { panic!("not admin") }
        env.events().publish((symbol_short!("com_brk"), agent_wallet), true);
    }

    pub fn get_meeting(env: Env, meeting_id: String) -> Option<MeetingRecord> {
        let meetings: Map<String, MeetingRecord> = env.storage().instance()
            .get(&MEETINGS).unwrap_or(Map::new(&env));
        meetings.get(meeting_id)
    }

    pub fn total_meetings(env: Env) -> u64 {
        env.storage().instance().get(&COUNTER).unwrap_or(0)
    }
}
