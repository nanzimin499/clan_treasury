use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn text(env: &Env, value: &str) -> String {
    String::from_str(env, value)
}

fn setup() -> (Env, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ClanTreasury, ());
    let admin = Address::generate(&env);
    let treasury_admin = Address::generate(&env);
    let member = Address::generate(&env);
    let recipient = Address::generate(&env);

    (env, contract_id, admin, treasury_admin, member, recipient)
}

fn bootstrap(
    client: &ClanTreasuryClient<'_>,
    env: &Env,
    admin: &Address,
    treasury_admin: &Address,
    member: &Address,
) -> u64 {
    client.initialize(admin, &text(env, "Clan Treasury Protocol"));

    let clan_id = client.create_clan(
        admin,
        &text(env, "DRGN"),
        &text(env, "Dragon Clan Treasury"),
        treasury_admin,
        &10,
        &500,
    );

    client.add_member(
        treasury_admin,
        &clan_id,
        member,
        &text(env, "Dragon Player"),
    );

    clan_id
}

#[test]
fn initializes_protocol_config() {
    let (env, contract_id, admin, _, _, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    client.initialize(&admin, &text(&env, "Clan Treasury Protocol"));

    let config = client.get_config();
    let audit_count = client.get_audit_count();

    assert_eq!(config.admin, admin);
    assert_eq!(audit_count, 1);
}

#[test]
fn cannot_initialize_twice() {
    let (env, contract_id, admin, _, _, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    client.initialize(&admin, &text(&env, "Clan Treasury Protocol"));

    assert!(client.try_initialize(&admin, &text(&env, "Again")).is_err());
}

#[test]
fn creates_clan_with_stats() {
    let (env, contract_id, admin, treasury_admin, _, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    client.initialize(&admin, &text(&env, "Clan Treasury Protocol"));

    let clan_id = client.create_clan(
        &admin,
        &text(&env, "DRGN"),
        &text(&env, "Dragon Clan Treasury"),
        &treasury_admin,
        &10,
        &500,
    );

    let clan = client.get_clan(&clan_id);
    let stats = client.get_clan_stats(&clan_id);

    assert_eq!(clan.clan_id, clan_id);
    assert_eq!(clan.treasury_admin, treasury_admin);
    assert_eq!(clan.balance, 0);
    assert_eq!(stats.total_members, 0);
}

#[test]
fn clan_admin_adds_member() {
    let (env, contract_id, admin, treasury_admin, member, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);

    let role = client.get_member(&member, &clan_id);
    let stats = client.get_clan_stats(&clan_id);

    assert_eq!(role.member, member);
    assert_eq!(role.clan_id, clan_id);
    assert_eq!(stats.total_members, 1);
}

#[test]
fn member_records_deposit() {
    let (env, contract_id, admin, treasury_admin, member, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);

    let deposit_id = client.record_deposit(
        &member,
        &clan_id,
        &120,
        &text(&env, "Tournament pool deposit"),
    );

    let deposit = client.get_deposit(&deposit_id);
    let clan = client.get_clan(&clan_id);
    let stats = client.get_clan_stats(&clan_id);
    let member_stats = client.get_member_stats(&member, &clan_id);

    assert_eq!(deposit.amount, 120);
    assert_eq!(clan.balance, 120);
    assert_eq!(stats.total_deposited, 120);
    assert_eq!(member_stats.total_deposited, 120);
}

#[test]
fn rejects_deposit_below_minimum() {
    let (env, contract_id, admin, treasury_admin, member, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);

    assert!(client
        .try_record_deposit(&member, &clan_id, &5, &text(&env, "too small"))
        .is_err());
}

#[test]
fn rejects_deposit_from_non_member() {
    let (env, contract_id, admin, treasury_admin, member, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);
    let stranger = Address::generate(&env);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);

    assert!(client
        .try_record_deposit(&stranger, &clan_id, &120, &text(&env, "not a member"))
        .is_err());
}

#[test]
fn clan_admin_requests_spend() {
    let (env, contract_id, admin, treasury_admin, member, recipient) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);
    client.record_deposit(&member, &clan_id, &300, &text(&env, "sponsor deposit"));

    let spend_id = client.request_spend(
        &treasury_admin,
        &clan_id,
        &recipient,
        &150,
        &text(&env, "Buy tournament entry"),
    );

    let spend = client.get_spend(&spend_id);
    let stats = client.get_clan_stats(&clan_id);

    assert_eq!(spend.status, SPEND_PENDING);
    assert_eq!(spend.amount, 150);
    assert_eq!(stats.pending_spends, 1);
}

#[test]
fn rejects_spend_above_withdrawal_limit() {
    let (env, contract_id, admin, treasury_admin, member, recipient) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);
    client.record_deposit(
        &member,
        &clan_id,
        &800,
        &text(&env, "large sponsor deposit"),
    );

    assert!(client
        .try_request_spend(
            &treasury_admin,
            &clan_id,
            &recipient,
            &700,
            &text(&env, "too high")
        )
        .is_err());
}

#[test]
fn executes_pending_spend() {
    let (env, contract_id, admin, treasury_admin, member, recipient) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);
    client.record_deposit(&member, &clan_id, &400, &text(&env, "deposit"));

    let spend_id = client.request_spend(
        &treasury_admin,
        &clan_id,
        &recipient,
        &160,
        &text(&env, "Jersey purchase"),
    );

    let spend = client.execute_spend(&treasury_admin, &spend_id);
    let clan = client.get_clan(&clan_id);
    let stats = client.get_clan_stats(&clan_id);

    assert_eq!(spend.status, SPEND_EXECUTED);
    assert_eq!(clan.balance, 240);
    assert_eq!(stats.executed_spends, 1);
    assert_eq!(stats.total_spent, 160);
}

#[test]
fn cancels_pending_spend() {
    let (env, contract_id, admin, treasury_admin, member, recipient) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);
    client.record_deposit(&member, &clan_id, &400, &text(&env, "deposit"));

    let spend_id = client.request_spend(
        &treasury_admin,
        &clan_id,
        &recipient,
        &160,
        &text(&env, "Travel budget"),
    );

    let spend = client.cancel_spend(&treasury_admin, &spend_id, &text(&env, "cancelled"));
    let stats = client.get_clan_stats(&clan_id);

    assert_eq!(spend.status, SPEND_CANCELLED);
    assert_eq!(stats.cancelled_spends, 1);
    assert_eq!(stats.pending_spends, 0);
}

#[test]
fn platform_admin_can_pause_clan() {
    let (env, contract_id, admin, treasury_admin, member, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);

    let clan = client.set_clan_active(&admin, &clan_id, &false);

    assert_eq!(clan.active, false);
}

#[test]
fn reads_audit_records() {
    let (env, contract_id, admin, treasury_admin, member, _) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);
    client.record_deposit(&member, &clan_id, &120, &text(&env, "audit deposit"));

    let audit_count = client.get_audit_count();
    let audit = client.get_audit_record(&audit_count);

    assert!(audit_count >= 4);
    assert_eq!(audit.clan_id, clan_id);
}

#[test]
fn cannot_execute_cancelled_spend() {
    let (env, contract_id, admin, treasury_admin, member, recipient) = setup();
    let client = ClanTreasuryClient::new(&env, &contract_id);

    let clan_id = bootstrap(&client, &env, &admin, &treasury_admin, &member);
    client.record_deposit(&member, &clan_id, &400, &text(&env, "deposit"));

    let spend_id = client.request_spend(
        &treasury_admin,
        &clan_id,
        &recipient,
        &160,
        &text(&env, "Travel budget"),
    );

    client.cancel_spend(&treasury_admin, &spend_id, &text(&env, "cancelled"));

    assert!(client
        .try_execute_spend(&treasury_admin, &spend_id)
        .is_err());
}
