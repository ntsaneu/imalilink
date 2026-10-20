cat > README.md << 'EOF'
# eMali_link

> **One phone number. Any wallet. Instant.**

eMali_link is a neutral, phone-number-based proxy registry and message router that enables wallet-to-wallet interoperability between non-bank remittance providers, mobile money operators, and bank eWallets across South Africa and the SADC region.

[![Status](https://img.shields.io/badge/status-prototype-yellow)]()
[![Tests](https://img.shields.io/badge/tests-15%20passing-brightgreen)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)]()
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## The Problem

South Africa is the **most expensive G20 country for remittances**. Sending money *from* South Africa averages **15.65%** in fees — roughly two and a half times the global average.

The deeper problem is **interoperability**. The remittance ecosystem is fragmented into closed-loop silos:

- Non-bank remittance providers (Mukuru, Mama Money, Hello Paisa) cannot send directly to each other
- Mobile money wallets (MTN MoMo, M-Pesa) operate in closed loops
- Bank eWallets (FNB eWallet, ABSA Cash Send) cannot receive from non-banks

To send R500 from Mukuru to someone on MTN MoMo today, a user must:

1. Generate a voucher code
2. SMS it to the recipient
3. Recipient travels to a Shoprite or PEP store
4. Queues to receive cash
5. Walks to an MTN MoMo agent
6. Loads the cash manually

**Time:** 2-24 hours. **Cost:** ~15% + transport. **Friction:** Massive.

---

## The Solution

**eMali_link is the neutral bridge between the walled gardens.**

It is not a bank. Not a wallet. It is a **proxy registry and message router** that:

- Resolves any phone number to the wallets linked to it
- Routes payment instructions between providers in ~500ms
- Settles money via deferred net settlement (one EFT per provider pair per day)
- Keeps banks as **receive-only endpoints** - they gain deposits without losing control

### The Two Golden Rules

| Rule | Explanation |
| :--- | :--- |
| **We move messages at 2 PM.** | Payment instructions are routed instantly, 24/7. No cut-off times. |
| **We move money at midnight.** | Settlement happens via a single net EFT at the end of the day. |

---

## Current Status

**Prototype — Phase 1 complete.**

| Component | Status |
| :--- | :--- |
| Proxy Registry | Working |
| Transaction Routing | Working |
| Double-Entry Ledger | Working |
| Provider Management | Working |
| Netting Engine | Working |
| Settlement Service | Working |
| API Key + JWT Authentication | Working |
| Idempotency Protection | Working |
| Rate Limiting | Working |
| Provider Adapters (Mukuru, MTN MoMo, FNB eWallet) | Mocked |
| Test Suite | 15/15 passing |
| OTP Verification | Not built |
| KYC/AML Integration | Not built |
| Real Provider Sandbox Integrations | Not built |
| Field-Level Encryption | Not wired |
| Webhooks | Not built |
| Settlement Scheduler | Not built |
| Admin Dashboard | Not built |

---

## How It Works

### 1. User Experience

- **Sipho** (SA, using **Mukuru**) opens his app
- Taps **"Send via eMali_link"**
- Enters **Thandi's phone number** and R500
- eMali_link resolves the number and shows **which wallets Thandi has linked**: MTN MoMo, FNB eWallet, Mukuru
- Sipho selects **MTN MoMo**
- Taps **Send**
- **Thandi receives R500 in ~500ms**

### 2. Technical Flow

1. Mukuru calls eMali_link: "Which wallets are linked to this phone number?"
2. eMali_link queries its **Proxy Registry** and returns the list
3. Sipho selects FNB eWallet
4. eMali_link fires an instruction to FNB eWallet: "Credit this wallet with R500."
5. FNB credits Thandi's wallet instantly
6. eMali_link logs the transaction for net settlement

### 3. Settlement (Midnight)

- Throughout the day, eMali_link logs every transaction
- At **23:59**, the **Netting Engine** calculates: *Mukuru owes FNB eWallet R3,600 (net)*
- Next morning, **Mukuru sends one EFT of R3,600** to FNB eWallet's corporate account
- **Thousands of user transactions settle with one bank transfer**

**Example:** 6 transactions of R100-R1000 = R3,600 sent to one recipient.
Instead of 6 individual EFTs (R60 in bank fees), eMali_link needs just **1 EFT (R10)**.

---

## Architecture

╔═══════════════════════════════════════════════════════════════════════════╗
║                          PROVIDER ECOSYSTEM                               ║
║                                                                           ║
║   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           ║
║   │ Mukuru  │ │   MTN   │ │   FNB   │ │  ABSA   │ │ Hello   │           ║
║   │         │ │  MoMo   │ │ eWallet │ │ CashSend│ │ Paisa   │           ║
║   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           ║
║        │           │           │           │           │                 ║
╚════════╪═══════════╪═══════════╪═══════════╪═══════════╪═════════════════╝
         │           │           │           │           │
         └───────────┴───────────┼───────────┴───────────┘
                                 │
                    (REST API + mTLS + OAuth 2.0)
                                 │
                                 ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║                       eMali_link API GATEWAY                              ║
║                                                                           ║
║   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   ║
║   │   OAuth 2.0  │ │ Rate Limiting│ │ Idempotency  │ │  Validation  │   ║
║   │   + API Keys │ │ (100 req/min)│ │    Keys      │ │  (JSON Schema)│   ║
║   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   ║
╚═══════════════════════════════════════════════════════════════════════════╝
                                 │
                                 ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║                       eMali_link CORE SERVICES                            ║
║                                                                           ║
║   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         ║
║   │ PROXY REGISTRY  │  │ ROUTING ENGINE  │  │ LEDGER SERVICE  │         ║
║   │                 │  │                 │  │                 │         ║
║   │ • Register      │  │ • Validate      │  │ • Double-entry  │         ║
║   │ • Resolve       │  │ • Route         │  │ • Immutable log │         ║
║   │ • Deactivate    │  │ • Retry         │  │ • Audit trail   │         ║
║   └─────────────────┘  └─────────────────┘  └─────────────────┘         ║
║                                                                           ║
║   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         ║
║   │ NETTING ENGINE  │  │   SETTLEMENT    │  │    PROVIDER     │         ║
║   │                 │  │     SERVICE     │  │     MANAGER     │         ║
║   │ • Daily netting │  │ • Instructions  │  │ • Health check  │         ║
║   │ • Pair matching │  │ • Status track  │  │ • Stats         │         ║
║   │ • Reports       │  │ • Confirmation  │  │ • Configuration │         ║
║   └─────────────────┘  └─────────────────┘  └─────────────────┘         ║
╚═══════════════════════════════════════════════════════════════════════════╝
                                 │
                                 ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║                              DATA LAYER                                   ║
║                                                                           ║
║   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  ║
║   │    SQLite    │  │    Redis     │  │    Kafka     │                  ║
║   │  (prototype) │  │  (planned)   │  │  (planned)   │                  ║
║   │              │  │              │  │              │                  ║
║   │  → PostgreSQL│  │  → Cache     │  │  → Events    │                  ║
║   └──────────────┘  └──────────────┘  └──────────────┘                  ║
╚═══════════════════════════════════════════════════════════════════════════╝
                                 │
                                 ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║                     SETTLEMENT INFRASTRUCTURE                             ║
║                                                                           ║
║   ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐          ║
║   │  TRUST ACCOUNT   │  │     SARB     │  │    CORPORATE     │          ║
║   │   (Segregated)   │  │    SAMOS     │  │      BANKS       │          ║
║   │                  │  │   (RTGS)     │  │                  │          ║
║   └──────────────────┘  └──────────────┘  └──────────────────┘          ║
╚═══════════════════════════════════════════════════════════════════════════╝




### Core Services

| Service | Responsibility |
| :--- | :--- |
| **Proxy Registry** | Maps phone numbers to wallets. Register, resolve, verify. |
| **Routing Engine** | Validates and routes payment instructions to destination providers. |
| **Ledger Service** | Immutable, double-entry record of all transactions. |
| **Netting Engine** | Calculates daily net positions between provider pairs. |
| **Settlement Service** | Generates and tracks settlement instructions. |
| **Provider Manager** | Onboarding, credentials, health checks, statistics. |

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Runtime | Node.js 18+ |
| Language | TypeScript 5.3 |
| Framework | Express 4 |
| Database | SQLite (prototype) |
| Authentication | JWT + API Keys |
| Testing | Jest + Supertest |
| Logging | Winston |
| Security | Helmet, CORS, express-rate-limit |

---

## Quick Start

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher

### Installation

```bash
# Clone the repository
git https://github.com/ntsaneu/imalilink.git
cd emalilink

# Install dependencies
npm install

# Approve native packages (bcrypt, sqlite3)
npm install-scripts approve bcrypt sqlite3
npm rebuild bcrypt sqlite3

# Copy environment file
cp .env.example .env

# Seed the database (creates providers + test data + API keys)
npm run seed

# Start development server
npm run dev

eMali_link API Server running on http://localhost:3000

[def]: https://img.sheilds.io/badge/license-Proprietary-red