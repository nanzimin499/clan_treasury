# Clan Treasury Protocol Architecture

## Overview

Clan Treasury Protocol is a Stellar Soroban MVP for transparent gaming clan treasury operations.

The product allows gaming clans, esports clubs, sponsors, and tournament groups to manage treasury deposits, member contributions, spend requests, spend execution, and audit records through a Soroban smart contract.

## Problem

Gaming clans often manage shared funds through private chats, spreadsheets, or one leader's personal wallet.

This creates weak transparency for members, sponsors, and tournament organizers.

## Solution

Clan Treasury Protocol records clan treasury actions through a Soroban smart contract on Stellar Testnet.

The system supports clan creation, treasury admin roles, member registration, deposit recording, spend requests, spend execution, spend cancellation, stats, and audit history.

## Smart Contract Layer

Location: contracts/clan_treasury

Main write functions:
- initialize
- create_clan
- set_clan_active
- add_member
- record_deposit
- request_spend
- execute_spend
- cancel_spend

Main read functions:
- get_config
- get_clan
- get_member
- get_deposit
- get_spend
- get_clan_stats
- get_member_stats
- get_audit_count
- get_audit_record

Main structs:
- PlatformConfig
- Clan
- MemberRole
- DepositRecord
- SpendRequest
- ClanStats
- MemberStats
- GlobalStats
- AuditRecord
- DataKey
- ClanTreasuryError

## Frontend Layer

Location: frontend

The frontend is a React and Vite dashboard. It includes wallet connection, contract runtime display, Stellar SDK integration, function mapping, clan metrics, deposit cards, spend request cards, interaction proof, analytics, and mobile responsive layout.

Important files:
- frontend/src/contractConfig.ts
- frontend/src/services/stellarContractClient.ts
- frontend/src/services/contract.ts
- frontend/src/services/api.ts
- frontend/src/services/analytics.ts
- frontend/src/App.tsx

## Frontend Contract Integration

The frontend uses @stellar/stellar-sdk.

The contract integration file prepares calls with:

    new Stellar.Contract(CONTRACT_CONFIG.contractId)
    contract.call(functionName, ...args)

The frontend also includes FRONTEND_CONTRACT_FUNCTION_MATCH, which maps every frontend action to the matching Soroban contract function.

## Backend Layer

Location: server

The backend is an Express API for product validation, config, function coverage, treasury display data, interactions, feedback, analytics, and readiness status.

Endpoints:
- GET /health
- GET /api/config
- GET /api/functions
- GET /api/clan
- GET /api/stats
- GET /api/deposits
- GET /api/spends
- GET /api/interactions
- POST /api/interactions
- GET /api/feedback
- POST /api/feedback
- GET /api/analytics
- GET /api/product-readiness

## Data Flow

1. Admin initializes the protocol.
2. Admin creates a clan treasury.
3. Treasury admin adds members.
4. Members record deposits.
5. Treasury admin requests spending.
6. Treasury admin executes or cancels pending spend requests.
7. Frontend displays clan stats, deposits, spend requests, and interaction history.
8. Backend stores product validation records and analytics summary.

## Deployment Targets

- Smart contract: Stellar Testnet
- Frontend: Vercel or similar static hosting
- Backend: Railway, Render, or similar Node.js hosting
