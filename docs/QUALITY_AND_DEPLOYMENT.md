# Quality and Deployment Notes

## Quality Goals

Clan Treasury Protocol is structured as a Level 4-style MVP with smart contract, frontend, backend, docs, CI validation, and deployment configuration.

Quality coverage:
- custom Soroban contract logic
- contract tests
- frontend dashboard
- frontend Stellar SDK integration
- frontend function mapping
- backend API
- backend tests
- analytics summary
- interaction tracking
- deployment configuration
- CI workflow

## Local Verification

Run:

    .\scripts\verify-level4.ps1

The script checks smart contract, frontend, backend, docs, deployment files, and CI workflow.

## Expected Repository Structure

- contracts/clan_treasury
- frontend
- server
- docs
- scripts
- .github/workflows
- vercel.json
- railway.toml
- Procfile
- README.md
