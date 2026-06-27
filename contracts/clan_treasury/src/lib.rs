#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String};

const SPEND_PENDING: u32 = 1;
const SPEND_EXECUTED: u32 = 2;
const SPEND_CANCELLED: u32 = 3;

#[contracttype]
#[derive(Clone)]
pub struct PlatformConfig {
    pub admin: Address,
    pub protocol_name: String,
    pub initialized_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Clan {
    pub clan_id: u64,
    pub symbol: String,
    pub name: String,
    pub treasury_admin: Address,
    pub min_deposit: i128,
    pub withdrawal_limit: i128,
    pub balance: i128,
    pub active: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct MemberRole {
    pub member: Address,
    pub clan_id: u64,
    pub display_name: String,
    pub active: bool,
    pub joined_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct DepositRecord {
    pub deposit_id: u64,
    pub clan_id: u64,
    pub member: Address,
    pub amount: i128,
    pub memo: String,
    pub recorded_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct SpendRequest {
    pub spend_id: u64,
    pub clan_id: u64,
    pub requester: Address,
    pub recipient: Address,
    pub amount: i128,
    pub purpose: String,
    pub status: u32,
    pub requested_at: u64,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct ClanStats {
    pub clan_id: u64,
    pub total_members: u32,
    pub total_deposits: u32,
    pub total_deposited: i128,
    pub pending_spends: u32,
    pub executed_spends: u32,
    pub cancelled_spends: u32,
    pub total_spent: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct MemberStats {
    pub member: Address,
    pub clan_id: u64,
    pub deposit_count: u32,
    pub total_deposited: i128,
    pub last_deposit_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct GlobalStats {
    pub total_clans: u64,
    pub total_deposits: u64,
    pub total_spends: u64,
    pub total_audit_records: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct AuditRecord {
    pub record_id: u64,
    pub action: String,
    pub actor: Address,
    pub clan_id: u64,
    pub amount: i128,
    pub note: String,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    Clan(u64),
    Member(Address, u64),
    Deposit(u64),
    Spend(u64),
    ClanStats(u64),
    MemberStats(Address, u64),
    GlobalStats,
    Audit(u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ClanTreasuryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    ClanNotFound = 5,
    ClanInactive = 6,
    MemberNotFound = 7,
    AlreadyMember = 8,
    DepositNotFound = 9,
    SpendNotFound = 10,
    InvalidSpendStatus = 11,
    InsufficientTreasuryBalance = 12,
    WithdrawalLimitExceeded = 13,
}

#[contract]
pub struct ClanTreasury;

#[contractimpl]
impl ClanTreasury {
    pub fn initialize(
        env: Env,
        admin: Address,
        protocol_name: String,
    ) -> Result<(), ClanTreasuryError> {
        if env.storage().persistent().has(&DataKey::Config) {
            return Err(ClanTreasuryError::AlreadyInitialized);
        }

        admin.require_auth();

        let config = PlatformConfig {
            admin: admin.clone(),
            protocol_name,
            initialized_at: env.ledger().timestamp(),
        };

        let global = GlobalStats {
            total_clans: 0,
            total_deposits: 0,
            total_spends: 0,
            total_audit_records: 0,
        };

        env.storage().persistent().set(&DataKey::Config, &config);
        env.storage()
            .persistent()
            .set(&DataKey::GlobalStats, &global);

        Self::write_audit(
            &env,
            admin,
            0,
            0,
            Self::text(&env, "initialize"),
            Self::text(&env, "protocol initialized"),
        );

        Ok(())
    }

    pub fn create_clan(
        env: Env,
        admin: Address,
        symbol: String,
        name: String,
        treasury_admin: Address,
        min_deposit: i128,
        withdrawal_limit: i128,
    ) -> Result<u64, ClanTreasuryError> {
        Self::require_admin(&env, &admin)?;

        if min_deposit <= 0 || withdrawal_limit <= 0 {
            return Err(ClanTreasuryError::InvalidAmount);
        }

        let mut global = Self::read_global_stats(&env);
        let clan_id = global.total_clans + 1;
        let now = env.ledger().timestamp();

        let clan = Clan {
            clan_id,
            symbol,
            name,
            treasury_admin: treasury_admin.clone(),
            min_deposit,
            withdrawal_limit,
            balance: 0,
            active: true,
            created_at: now,
            updated_at: now,
        };

        let stats = ClanStats {
            clan_id,
            total_members: 0,
            total_deposits: 0,
            total_deposited: 0,
            pending_spends: 0,
            executed_spends: 0,
            cancelled_spends: 0,
            total_spent: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Clan(clan_id), &clan);
        env.storage()
            .persistent()
            .set(&DataKey::ClanStats(clan_id), &stats);

        global.total_clans = clan_id;
        Self::save_global_stats(&env, &global);

        Self::write_audit(
            &env,
            admin,
            clan_id,
            0,
            Self::text(&env, "create_clan"),
            Self::text(&env, "clan created"),
        );

        Ok(clan_id)
    }

    pub fn set_clan_active(
        env: Env,
        admin: Address,
        clan_id: u64,
        active: bool,
    ) -> Result<Clan, ClanTreasuryError> {
        Self::require_admin(&env, &admin)?;

        let mut clan = Self::read_clan(&env, clan_id)?;
        clan.active = active;
        clan.updated_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Clan(clan_id), &clan);

        Self::write_audit(
            &env,
            admin,
            clan_id,
            0,
            Self::text(&env, "set_clan_active"),
            Self::text(&env, "clan activity updated"),
        );

        Ok(clan)
    }

    pub fn add_member(
        env: Env,
        admin: Address,
        clan_id: u64,
        member: Address,
        display_name: String,
    ) -> Result<MemberRole, ClanTreasuryError> {
        Self::require_clan_admin(&env, &admin, clan_id)?;

        let clan = Self::read_clan(&env, clan_id)?;

        if !clan.active {
            return Err(ClanTreasuryError::ClanInactive);
        }

        let key = DataKey::Member(member.clone(), clan_id);

        if env.storage().persistent().has(&key) {
            return Err(ClanTreasuryError::AlreadyMember);
        }

        let role = MemberRole {
            member: member.clone(),
            clan_id,
            display_name,
            active: true,
            joined_at: env.ledger().timestamp(),
        };

        let member_stats = MemberStats {
            member: member.clone(),
            clan_id,
            deposit_count: 0,
            total_deposited: 0,
            last_deposit_at: 0,
        };

        env.storage().persistent().set(&key, &role);
        env.storage().persistent().set(
            &DataKey::MemberStats(member.clone(), clan_id),
            &member_stats,
        );

        let mut stats = Self::read_clan_stats(&env, clan_id)?;
        stats.total_members += 1;
        Self::save_clan_stats(&env, clan_id, &stats);

        Self::write_audit(
            &env,
            admin,
            clan_id,
            0,
            Self::text(&env, "add_member"),
            Self::text(&env, "member added"),
        );

        Ok(role)
    }

    pub fn record_deposit(
        env: Env,
        member: Address,
        clan_id: u64,
        amount: i128,
        memo: String,
    ) -> Result<u64, ClanTreasuryError> {
        member.require_auth();

        if amount <= 0 {
            return Err(ClanTreasuryError::InvalidAmount);
        }

        let mut clan = Self::read_clan(&env, clan_id)?;

        if !clan.active {
            return Err(ClanTreasuryError::ClanInactive);
        }

        if amount < clan.min_deposit {
            return Err(ClanTreasuryError::InvalidAmount);
        }

        let role = Self::read_member(&env, &member, clan_id)?;

        if !role.active {
            return Err(ClanTreasuryError::MemberNotFound);
        }

        let mut global = Self::read_global_stats(&env);
        let deposit_id = global.total_deposits + 1;

        let record = DepositRecord {
            deposit_id,
            clan_id,
            member: member.clone(),
            amount,
            memo,
            recorded_at: env.ledger().timestamp(),
        };

        clan.balance += amount;
        clan.updated_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Deposit(deposit_id), &record);
        env.storage()
            .persistent()
            .set(&DataKey::Clan(clan_id), &clan);

        global.total_deposits = deposit_id;
        Self::save_global_stats(&env, &global);

        let mut clan_stats = Self::read_clan_stats(&env, clan_id)?;
        clan_stats.total_deposits += 1;
        clan_stats.total_deposited += amount;
        Self::save_clan_stats(&env, clan_id, &clan_stats);

        let mut member_stats = Self::read_member_stats(&env, &member, clan_id);
        member_stats.deposit_count += 1;
        member_stats.total_deposited += amount;
        member_stats.last_deposit_at = env.ledger().timestamp();
        Self::save_member_stats(&env, &member, clan_id, &member_stats);

        Self::write_audit(
            &env,
            member,
            clan_id,
            amount,
            Self::text(&env, "record_deposit"),
            Self::text(&env, "treasury deposit recorded"),
        );

        Ok(deposit_id)
    }

    pub fn request_spend(
        env: Env,
        requester: Address,
        clan_id: u64,
        recipient: Address,
        amount: i128,
        purpose: String,
    ) -> Result<u64, ClanTreasuryError> {
        Self::require_clan_admin(&env, &requester, clan_id)?;

        if amount <= 0 {
            return Err(ClanTreasuryError::InvalidAmount);
        }

        let clan = Self::read_clan(&env, clan_id)?;

        if !clan.active {
            return Err(ClanTreasuryError::ClanInactive);
        }

        if amount > clan.withdrawal_limit {
            return Err(ClanTreasuryError::WithdrawalLimitExceeded);
        }

        if amount > clan.balance {
            return Err(ClanTreasuryError::InsufficientTreasuryBalance);
        }

        let mut global = Self::read_global_stats(&env);
        let spend_id = global.total_spends + 1;
        let now = env.ledger().timestamp();

        let spend = SpendRequest {
            spend_id,
            clan_id,
            requester: requester.clone(),
            recipient,
            amount,
            purpose,
            status: SPEND_PENDING,
            requested_at: now,
            updated_at: now,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Spend(spend_id), &spend);

        global.total_spends = spend_id;
        Self::save_global_stats(&env, &global);

        let mut stats = Self::read_clan_stats(&env, clan_id)?;
        stats.pending_spends += 1;
        Self::save_clan_stats(&env, clan_id, &stats);

        Self::write_audit(
            &env,
            requester,
            clan_id,
            amount,
            Self::text(&env, "request_spend"),
            Self::text(&env, "spend requested"),
        );

        Ok(spend_id)
    }

    pub fn execute_spend(
        env: Env,
        admin: Address,
        spend_id: u64,
    ) -> Result<SpendRequest, ClanTreasuryError> {
        let mut spend = Self::read_spend(&env, spend_id)?;
        Self::require_clan_admin(&env, &admin, spend.clan_id)?;

        if spend.status != SPEND_PENDING {
            return Err(ClanTreasuryError::InvalidSpendStatus);
        }

        let mut clan = Self::read_clan(&env, spend.clan_id)?;

        if spend.amount > clan.balance {
            return Err(ClanTreasuryError::InsufficientTreasuryBalance);
        }

        clan.balance -= spend.amount;
        clan.updated_at = env.ledger().timestamp();

        spend.status = SPEND_EXECUTED;
        spend.updated_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Spend(spend_id), &spend);
        env.storage()
            .persistent()
            .set(&DataKey::Clan(spend.clan_id), &clan);

        let mut stats = Self::read_clan_stats(&env, spend.clan_id)?;
        stats.pending_spends = stats.pending_spends.saturating_sub(1);
        stats.executed_spends += 1;
        stats.total_spent += spend.amount;
        Self::save_clan_stats(&env, spend.clan_id, &stats);

        Self::write_audit(
            &env,
            admin,
            spend.clan_id,
            spend.amount,
            Self::text(&env, "execute_spend"),
            Self::text(&env, "spend executed"),
        );

        Ok(spend)
    }

    pub fn cancel_spend(
        env: Env,
        admin: Address,
        spend_id: u64,
        note: String,
    ) -> Result<SpendRequest, ClanTreasuryError> {
        let mut spend = Self::read_spend(&env, spend_id)?;
        Self::require_clan_admin(&env, &admin, spend.clan_id)?;

        if spend.status != SPEND_PENDING {
            return Err(ClanTreasuryError::InvalidSpendStatus);
        }

        spend.status = SPEND_CANCELLED;
        spend.purpose = note;
        spend.updated_at = env.ledger().timestamp();

        env.storage()
            .persistent()
            .set(&DataKey::Spend(spend_id), &spend);

        let mut stats = Self::read_clan_stats(&env, spend.clan_id)?;
        stats.pending_spends = stats.pending_spends.saturating_sub(1);
        stats.cancelled_spends += 1;
        Self::save_clan_stats(&env, spend.clan_id, &stats);

        Self::write_audit(
            &env,
            admin,
            spend.clan_id,
            spend.amount,
            Self::text(&env, "cancel_spend"),
            Self::text(&env, "spend cancelled"),
        );

        Ok(spend)
    }

    pub fn get_config(env: Env) -> Result<PlatformConfig, ClanTreasuryError> {
        Self::read_config(&env)
    }

    pub fn get_clan(env: Env, clan_id: u64) -> Result<Clan, ClanTreasuryError> {
        Self::read_clan(&env, clan_id)
    }

    pub fn get_member(
        env: Env,
        member: Address,
        clan_id: u64,
    ) -> Result<MemberRole, ClanTreasuryError> {
        Self::read_member(&env, &member, clan_id)
    }

    pub fn get_deposit(env: Env, deposit_id: u64) -> Result<DepositRecord, ClanTreasuryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Deposit(deposit_id))
            .ok_or(ClanTreasuryError::DepositNotFound)
    }

    pub fn get_spend(env: Env, spend_id: u64) -> Result<SpendRequest, ClanTreasuryError> {
        Self::read_spend(&env, spend_id)
    }

    pub fn get_clan_stats(env: Env, clan_id: u64) -> Result<ClanStats, ClanTreasuryError> {
        Self::read_clan_stats(&env, clan_id)
    }

    pub fn get_member_stats(env: Env, member: Address, clan_id: u64) -> MemberStats {
        Self::read_member_stats(&env, &member, clan_id)
    }

    pub fn get_audit_count(env: Env) -> u64 {
        Self::read_global_stats(&env).total_audit_records
    }

    pub fn get_audit_record(env: Env, record_id: u64) -> Result<AuditRecord, ClanTreasuryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Audit(record_id))
            .ok_or(ClanTreasuryError::DepositNotFound)
    }

    fn read_config(env: &Env) -> Result<PlatformConfig, ClanTreasuryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(ClanTreasuryError::NotInitialized)
    }

    fn read_global_stats(env: &Env) -> GlobalStats {
        env.storage()
            .persistent()
            .get(&DataKey::GlobalStats)
            .unwrap_or(GlobalStats {
                total_clans: 0,
                total_deposits: 0,
                total_spends: 0,
                total_audit_records: 0,
            })
    }

    fn save_global_stats(env: &Env, stats: &GlobalStats) {
        env.storage().persistent().set(&DataKey::GlobalStats, stats);
    }

    fn read_clan(env: &Env, clan_id: u64) -> Result<Clan, ClanTreasuryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Clan(clan_id))
            .ok_or(ClanTreasuryError::ClanNotFound)
    }

    fn read_member(
        env: &Env,
        member: &Address,
        clan_id: u64,
    ) -> Result<MemberRole, ClanTreasuryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Member(member.clone(), clan_id))
            .ok_or(ClanTreasuryError::MemberNotFound)
    }

    fn read_spend(env: &Env, spend_id: u64) -> Result<SpendRequest, ClanTreasuryError> {
        env.storage()
            .persistent()
            .get(&DataKey::Spend(spend_id))
            .ok_or(ClanTreasuryError::SpendNotFound)
    }

    fn read_clan_stats(env: &Env, clan_id: u64) -> Result<ClanStats, ClanTreasuryError> {
        env.storage()
            .persistent()
            .get(&DataKey::ClanStats(clan_id))
            .ok_or(ClanTreasuryError::ClanNotFound)
    }

    fn save_clan_stats(env: &Env, clan_id: u64, stats: &ClanStats) {
        env.storage()
            .persistent()
            .set(&DataKey::ClanStats(clan_id), stats);
    }

    fn read_member_stats(env: &Env, member: &Address, clan_id: u64) -> MemberStats {
        env.storage()
            .persistent()
            .get(&DataKey::MemberStats(member.clone(), clan_id))
            .unwrap_or(MemberStats {
                member: member.clone(),
                clan_id,
                deposit_count: 0,
                total_deposited: 0,
                last_deposit_at: 0,
            })
    }

    fn save_member_stats(env: &Env, member: &Address, clan_id: u64, stats: &MemberStats) {
        env.storage()
            .persistent()
            .set(&DataKey::MemberStats(member.clone(), clan_id), stats);
    }

    fn require_admin(env: &Env, admin: &Address) -> Result<PlatformConfig, ClanTreasuryError> {
        let config = Self::read_config(env)?;

        if config.admin != *admin {
            return Err(ClanTreasuryError::Unauthorized);
        }

        admin.require_auth();

        Ok(config)
    }

    fn require_clan_admin(
        env: &Env,
        admin: &Address,
        clan_id: u64,
    ) -> Result<Clan, ClanTreasuryError> {
        let clan = Self::read_clan(env, clan_id)?;

        if clan.treasury_admin != *admin {
            let config = Self::read_config(env)?;

            if config.admin != *admin {
                return Err(ClanTreasuryError::Unauthorized);
            }
        }

        admin.require_auth();

        Ok(clan)
    }

    fn write_audit(
        env: &Env,
        actor: Address,
        clan_id: u64,
        amount: i128,
        action: String,
        note: String,
    ) {
        let mut global = Self::read_global_stats(env);
        let record_id = global.total_audit_records + 1;

        let record = AuditRecord {
            record_id,
            action,
            actor,
            clan_id,
            amount,
            note,
            timestamp: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Audit(record_id), &record);

        global.total_audit_records = record_id;
        Self::save_global_stats(env, &global);
    }

    fn text(env: &Env, value: &str) -> String {
        String::from_str(env, value)
    }
}

#[cfg(test)]
mod test;
