#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, Map, Symbol, symbol_short,
};

const REPUTATION: Symbol = symbol_short!("REP");
const WRITERS:    Symbol = symbol_short!("WRITERS");
const ADMIN:      Symbol = symbol_short!("ADMIN");

#[contracttype]
#[derive(Clone, Debug)]
pub struct ReputationRecord {
    pub overall_score:      u32,  // 0-100
    pub commitment_rate:    u32,  // 0-100
    pub meeting_quality:    u32,  // 0-100
    pub networking_score:   u32,  // 0-100
    pub total_interactions: u64,
    pub last_updated:       u64,
}

#[contracttype]
#[derive(Clone, Copy, Debug)]
pub enum InteractionType {
    MeetingCompleted    = 0,
    CommitmentFulfilled = 1,
    CommitmentBroken    = 2,
    ConnectionMade      = 3,
    MeetingNoShow       = 4,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum RepError {
    NotAuthorised = 1,
    NotWriter     = 2,
}

#[contract]
pub struct AuraReputationContract;

#[contractimpl]
impl AuraReputationContract {

    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&WRITERS, &Map::<Address, bool>::new(&env));
    }

    pub fn record_interaction(
        env:    Env,
        caller: Address,
        wallet: Address,
        itype:  InteractionType,
        score:  u32,
    ) -> Result<(), RepError> {
        caller.require_auth();
        Self::require_writer(&env, &caller)?;

        let mut reps: Map<Address, ReputationRecord> = env.storage().instance()
            .get(&REPUTATION).unwrap_or(Map::new(&env));

        let mut rep = reps.get(wallet.clone()).unwrap_or(ReputationRecord {
            overall_score:      0,
            commitment_rate:    0,
            meeting_quality:    0,
            networking_score:   0,
            total_interactions: 0,
            last_updated:       0,
        });

        rep.total_interactions += 1;
        rep.last_updated = env.ledger().timestamp();
        let n = rep.total_interactions;

        match itype {
            InteractionType::MeetingCompleted => {
                rep.meeting_quality = Self::weighted_avg(rep.meeting_quality, score, n);
            }
            InteractionType::CommitmentFulfilled => {
                rep.commitment_rate = Self::weighted_avg(rep.commitment_rate, 100, n);
            }
            InteractionType::CommitmentBroken => {
                rep.commitment_rate = Self::weighted_avg(rep.commitment_rate, 0, n);
            }
            InteractionType::ConnectionMade => {
                rep.networking_score = (rep.networking_score + 1).min(100);
            }
            InteractionType::MeetingNoShow => {
                rep.meeting_quality = Self::weighted_avg(rep.meeting_quality, 0, n);
            }
        }

        // Overall = 40% commitment + 40% meeting + 20% networking
        rep.overall_score = (rep.commitment_rate * 40
            + rep.meeting_quality  * 40
            + rep.networking_score * 20) / 100;

        reps.set(wallet.clone(), rep.clone());
        env.storage().instance().set(&REPUTATION, &reps);

        env.events().publish((symbol_short!("rep_upd"), wallet), rep.overall_score);
        Ok(())
    }

    pub fn get_reputation(env: Env, wallet: Address) -> Option<ReputationRecord> {
        let reps: Map<Address, ReputationRecord> = env.storage().instance()
            .get(&REPUTATION).unwrap_or(Map::new(&env));
        reps.get(wallet)
    }

    pub fn get_overall_score(env: Env, wallet: Address) -> u32 {
        let reps: Map<Address, ReputationRecord> = env.storage().instance()
            .get(&REPUTATION).unwrap_or(Map::new(&env));
        reps.get(wallet).map(|r| r.overall_score).unwrap_or(0)
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

    fn weighted_avg(current: u32, new_val: u32, n: u64) -> u32 {
        if n <= 1 { return new_val; }
        ((current as u64 * (n - 1) + new_val as u64) / n) as u32
    }

    fn require_writer(env: &Env, caller: &Address) -> Result<(), RepError> {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if caller == &admin { return Ok(()); }
        let writers: Map<Address, bool> = env.storage().instance()
            .get(&WRITERS).unwrap_or(Map::new(env));
        if writers.get(caller.clone()).unwrap_or(false) { Ok(()) }
        else { Err(RepError::NotWriter) }
    }
}
