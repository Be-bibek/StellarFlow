# Railway Deployment Guide (Backend)

## 1. Project Configuration

A `railway.json` and `Dockerfile` have been provided in the `backend/` directory. Railway will automatically detect the Dockerfile and build the Rust application natively, utilizing the Railway infrastructure caching mechanisms.

- **Start Command**: `./stellarflow-backend` (configured in `railway.json` and `Dockerfile`)
- **Health Check**: Configured to poll `/health` with a 100s startup timeout.

## 2. Infrastructure Requirements

In your Railway project, you must provision two plugins before deploying the backend:
1. **PostgreSQL**: The backend uses SQLx. Migrations are completely idempotent and execute on startup.
2. **Redis**: Required for state management and rate-limiting.

## 3. Environment Variables

The backend dynamically reads the `$PORT` environment variable provided by Railway and binds to `0.0.0.0:$PORT`. Do **NOT** set `BIND_ADDR` in Railway.

The following variables must be configured in your Railway environment variables panel:

### Critical Infrastructure
| Variable | Value Description |
|---|---|
| `DATABASE_URL` | Connect to your Railway PostgreSQL instance (e.g. `\${{Postgres.DATABASE_URL}}`) |
| `REDIS_URL` | Connect to your Railway Redis instance (e.g. `\${{Redis.REDIS_URL}}`) |

### Stellar Network
| Variable | Value Description |
|---|---|
| `STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `STELLAR_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `TREASURY_CONTRACT_ID` | Your deployed Soroban smart contract ID |

### Master & Child Keys (Testnet)
*These must match the database wallet assignments.*
| Variable | Value Description |
|---|---|
| `STELLAR_ADMIN_PUBLIC_KEY` | Your master admin public key |
| `STELLAR_SIGNER_SECRET` | Your master admin secret |
| `MASTER_SECRET` | Primary vault secret |
| `PAYROLL_SECRET` | Payroll vault secret |
| `OPERATIONS_SECRET` | Operations vault secret |
| `RESERVE_SECRET` | Reserve vault secret |
| `MARKETING_SECRET` | Marketing vault secret |

### Cryptography & JWT
| Variable | Value Description |
|---|---|
| `AES_ENCRYPTION_KEY` | 32-byte Base64-encoded string (`openssl rand -base64 32`) |
| `FIREBASE_PROJECT_ID` | Your Firebase project identifier |
| `JWT_AUDIENCE` | Same as `FIREBASE_PROJECT_ID` |

## 4. Deployment Steps

1. Connect your GitHub repository to Railway.
2. Change the **Root Directory** for the service to `/backend`.
3. Provision PostgreSQL and Redis inside the Railway Project.
4. Input all the Environment Variables above into the backend service.
5. Railway will automatically begin building using the `Dockerfile`.
6. Once deployed, verify functionality by navigating to `https://[your-railway-domain].up.railway.app/health`.
