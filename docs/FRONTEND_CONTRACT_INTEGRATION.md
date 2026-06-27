# Frontend Contract Integration

This document shows how the frontend maps to the ClanTreasury Soroban contract.

## Integration Files

- frontend/src/contractConfig.ts
- frontend/src/services/stellarContractClient.ts
- frontend/src/services/contract.ts
- frontend/src/services/clanTreasury.test.ts

## Stellar SDK Usage

The frontend uses @stellar/stellar-sdk to prepare contract operations.

Code pattern:

    const contract = new Stellar.Contract(CONTRACT_CONFIG.contractId)
    const operation = contract.call(functionName, ...args)

## Function Match

| Frontend action | Soroban contract function |
| --- | --- |
| initialize | initialize |
| create_clan | create_clan |
| set_clan_active | set_clan_active |
| add_member | add_member |
| record_deposit | record_deposit |
| request_spend | request_spend |
| execute_spend | execute_spend |
| cancel_spend | cancel_spend |
| get_config | get_config |
| get_clan | get_clan |
| get_member | get_member |
| get_deposit | get_deposit |
| get_spend | get_spend |
| get_clan_stats | get_clan_stats |
| get_member_stats | get_member_stats |
| get_audit_count | get_audit_count |
| get_audit_record | get_audit_record |

## Validation

Frontend tests confirm that every frontend action maps to a matching Soroban contract function.
