# Clan Treasury Protocol

Production-ready Stellar Soroban MVP for transparent gaming clan treasury deposits, spend requests, and audit history.

## Overview

Clan Treasury Protocol helps gaming clans and esports clubs manage shared funds with transparent on-chain records.

Members can record treasury deposits. Treasury admins can create spend requests, execute approved spending, cancel pending requests, and track clan treasury stats.

The project upgrades a basic Stellar Testnet treasury deposit app into a Soroban-powered clan treasury workflow.

## Problem

Gaming clans often manage shared funds through private chats, spreadsheets, or a single leader's personal wallet.

This creates several problems:

- members cannot easily verify total contributions
- sponsors cannot clearly track fund usage
- spending decisions are hard to audit
- tournament organizers cannot verify treasury activity
- clan leaders must manage manual records

## Solution

Clan Treasury Protocol records treasury actions through a Soroban smart contract on Stellar Testnet.

The MVP supports:

- protocol initialization
- clan treasury creation
- treasury admin setup
- member registration
- deposit recording
- spend request creation
- spend execution
- spend cancellation
- clan stats
- member stats
- audit history
- frontend Stellar SDK integration
- backend product validation API

## Smart Contract

Location:

    contracts/clan_treasury

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

## Frontend

Location:

    frontend

The frontend is a React and Vite dashboard with Freighter wallet connection, contract runtime display, Stellar SDK integration, frontend-to-contract function mapping, clan treasury metrics, deposit records, spend request records, wallet interaction proof, analytics summary, and mobile responsive UI.

Important integration files:

- frontend/src/contractConfig.ts
- frontend/src/services/stellarContractClient.ts
- frontend/src/services/contract.ts
- frontend/src/services/clanTreasury.test.ts

## Stellar SDK Integration

The frontend uses @stellar/stellar-sdk and prepares contract operations with:

    new Stellar.Contract(CONTRACT_CONFIG.contractId)
    contract.call(functionName, ...args)

Every frontend contract action is mapped to a matching Soroban contract function.

## Backend

Location:

    server

Backend endpoints:

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

## Repository Structure

    clan_treasury
    ├── contracts
    │   └── clan_treasury
    ├── frontend
    ├── server
    ├── docs
    ├── scripts
    ├── .github
    │   └── workflows
    ├── vercel.json
    ├── railway.toml
    ├── Procfile
    ├── Cargo.toml
    ├── Cargo.lock
    └── README.md

## Local Requirements

- Node.js 24.x
- npm 11.x
- Rust 1.96.x
- Cargo 1.96.x
- Stellar CLI 27.x
- Rust target wasm32v1-none

Install Rust target if needed:

    rustup target add wasm32v1-none

## Run Smart Contract

    cargo fmt
    cargo test --workspace
    cargo build --workspace --target wasm32v1-none --release
    stellar contract build

## Run Frontend

    cd frontend
    npm ci --audit=false --fund=false
    npm run dev

Build and test frontend:

    npm run type-check
    npm run build
    npm test

## Run Backend

    cd server
    npm ci --audit=false --fund=false
    npm run dev

Build and test backend:

    npm run type-check
    npm run build
    npm test

## Full Local Verification

From the project root:

    .\scripts\verify-level4.ps1

## Deployment Configuration

Frontend:

    vercel.json

Backend:

    railway.toml
    Procfile

Smart contract deployment helper:

    scripts/deploy-and-save.ps1

## Documentation

- docs/ARCHITECTURE.md
- docs/FRONTEND_CONTRACT_INTEGRATION.md
- docs/QUALITY_AND_DEPLOYMENT.md

## Current Status

This repository contains a complete Level 4-style structure with smart contract, frontend, backend, documentation, CI workflow, and deployment configuration.
