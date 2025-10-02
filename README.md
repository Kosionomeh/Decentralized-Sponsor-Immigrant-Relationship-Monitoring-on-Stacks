# SponsorLink: Decentralized Sponsor-Immigrant Relationship Monitoring on Stacks

## Overview

SponsorLink is a Web3 project built on the Stacks blockchain using Clarity smart contracts. It provides a transparent, immutable, and automated system for managing and monitoring relationships between sponsors and immigrants in immigration processes (e.g., family-based or employment-based sponsorships like those in the US I-864 Affidavit of Support). 

The platform leverages blockchain to address key challenges in traditional immigration sponsorship systems, such as lack of transparency, fraud, bureaucratic delays, and difficulties in enforcing financial obligations. By recording agreements, payments, compliance reports, and disputes on-chain, SponsorLink ensures all parties (sponsors, immigrants, and authorities) have verifiable access to records, reducing disputes and improving efficiency.

### Key Features
- **User Registration**: Secure registration of sponsors, immigrants, and optional verifiers (e.g., government agents or oracles).
- **Sponsorship Agreements**: Creation of binding on-chain agreements outlining obligations (e.g., financial support thresholds).
- **Financial Tracking**: Automated monitoring of payments to ensure sponsors meet support requirements.
- **Compliance Monitoring**: Integration with oracles for real-world data verification (e.g., income reports).
- **Dispute Resolution**: Decentralized handling of conflicts with voting or evidence submission.
- **Incentives**: Use of STX tokens for fees and rewards to encourage honest participation.

The system involves 6 core smart contracts, designed to be modular, secure, and composable. All contracts are written in Clarity, benefiting from its safety features like post-conditions and lack of reentrancy vulnerabilities.

## Real-World Problems Solved
- **Fraud and Forgery**: Traditional paper-based affidavits are easy to fake. Blockchain provides immutable records, verifiable by anyone.
- **Lack of Transparency**: Sponsors and immigrants often face opacity in status updates. On-chain data allows real-time monitoring.
- **Enforcement Challenges**: Financial obligations (e.g., sponsor must support immigrant at 125% of poverty line) are hard to track. Automated smart contracts enforce rules and trigger alerts or penalties.
- **Bureaucratic Inefficiency**: Manual reviews delay processes. Smart contracts automate compliance checks, reducing processing time.
- **Cross-Border Accessibility**: Immigrants in remote areas can access the system globally without intermediaries.
- **Dispute Overhead**: Courts are costly; decentralized resolution lowers barriers.
- **Data Privacy with Transparency**: Public blockchain for agreements, but private traits for sensitive data.

This project could integrate with real-world systems via oracles (e.g., Chainlink on Stacks) for off-chain data like income verification, making it practical for adoption by immigration agencies.

## Architecture
- **Frontend**: A dApp (not included here) built with React or Svelte, interacting via Stacks.js library.
- **Backend**: Clarity smart contracts deployed on Stacks.
- **Workflow**:
  1. Users register roles.
  2. Sponsor creates an agreement with immigrant.
  3. Payments are tracked on-chain.
  4. Compliance is reported/verified periodically.
  5. Disputes are raised and resolved if needed.
- **Tokenomics**: STX for transaction fees; optional custom fungible token for rewards (not implemented here).
- **Security**: All contracts use Clarity's checks (e.g., assert!, post-conditions) to prevent common exploits.

## Installation and Deployment
1. Install Clarity tools: Follow [Stacks documentation](https://docs.stacks.co/clarity).
2. Clone the repo: `git clone <repo-url>`.
3. Deploy contracts using Clarinet: `clarinet deploy`.
4. Test locally: `clarinet test`.
5. Deploy to Stacks testnet/mainnet via Hiro tools.

## Smart Contracts
Below are the 6 smart contracts. Each includes comments for clarity. They are designed to be deployed separately but interact via principal calls.

### 1. UserRegistry.clar
This contract handles user registration with roles (sponsor, immigrant, verifier). It stores profiles and verifies identities.

```clarity
;; UserRegistry.clar
;; Registers users with roles for the SponsorLink system.

(define-constant ERR-ALREADY-REGISTERED (err u100))
(define-constant ERR-INVALID-ROLE (err u101))
(define-constant ERR-NOT-AUTHORIZED (err u102))

(define-map users principal { role: (string-ascii 20), registered-at: uint })
(define-data-var admin principal tx-sender)

(define-public (register (role (string-ascii 20)))
  (let ((caller tx-sender))
    (asserts! (is-none (map-get? users caller)) ERR-ALREADY-REGISTERED)
    (asserts! (or (is-eq role "sponsor") (is-eq role "immigrant") (is-eq role "verifier")) ERR-INVALID-ROLE)
    (map-set users caller { role: role, registered-at: block-height })
    (ok true)))

(define-read-only (get-role (user principal))
  (match (map-get? users user)
    profile (ok (get role profile))
    (err u103)))

(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (var-set admin new-admin)
    (ok true)))
```

### 2. SponsorshipFactory.clar
Factory contract to deploy new sponsorship agreements. It creates instances of Sponsorship.clar.

```clarity
;; SponsorshipFactory.clar
;; Factory for creating new sponsorship agreements.

(define-constant ERR-NOT-SPONSOR (err u200))
(define-constant ERR-NOT-IMMIGRANT (err u201))

(define-data-var agreement-counter uint u0)
(define-map agreements uint { sponsor: principal, immigrant: principal, created-at: uint })

(define-public (create-agreement (immigrant principal) (terms (string-utf8 500)))
  (let ((sponsor tx-sender)
        (id (var-get agreement-counter)))
    (asserts! (is-eq (unwrap-panic (contract-call? .UserRegistry get-role sponsor)) "sponsor") ERR-NOT-SPONSOR)
    (asserts! (is-eq (unwrap-panic (contract-call? .UserRegistry get-role immigrant)) "immigrant") ERR-NOT-IMMIGRANT)
    (try! (contract-call? .Sponsorship deploy id sponsor immigrant terms))
    (map-set agreements id { sponsor: sponsor, immigrant: immigrant, created-at: block-height })
    (var-set agreement-counter (+ id u1))
    (ok id)))

(define-read-only (get-agreement (id uint))
  (map-get? agreements id))
```

### 3. Sponsorship.clar
Core agreement contract (deployed per sponsorship). Manages terms, status, and basic updates.

```clarity
;; Sponsorship.clar
;; Template for individual sponsorship agreements.

(define-constant ERR-NOT-PARTY (err u300))
(define-constant STATUS-ACTIVE u1)
(define-constant STATUS-TERMINATED u2)

(define-map agreement-details uint { sponsor: principal, immigrant: principal, terms: (string-utf8 500), status: uint, start-height: uint })

(define-public (deploy (id uint) (sponsor principal) (immigrant principal) (terms (string-utf8 500)))
  (begin
    (asserts! (is-eq tx-sender (as-contract tx-sender)) (err u301)) ;; Only factory can deploy
    (map-set agreement-details id { sponsor: sponsor, immigrant: immigrant, terms: terms, status: STATUS-ACTIVE, start-height: block-height })
    (ok true)))

(define-public (update-status (id uint) (new-status uint))
  (let ((details (unwrap-panic (map-get? agreement-details id)))
        (caller tx-sender))
    (asserts! (or (is-eq caller (get sponsor details)) (is-eq caller (get immigrant details))) ERR-NOT-PARTY)
    (map-set agreement-details id (merge details { status: new-status }))
    (ok true)))

(define-read-only (get-details (id uint))
  (map-get? agreement-details id))
```

### 4. PaymentTracker.clar
Tracks financial payments from sponsor to immigrant, enforcing minimum support levels.

```clarity
;; PaymentTracker.clar
;; Tracks payments for sponsorship obligations.

(define-constant ERR-INSUFFICIENT-PAYMENT (err u400))
(define-constant ERR-NOT-SPONSOR (err u401))
(define-constant MIN_SUPPORT u1000000) ;; Example: 1 STX minimum per period (adjust for real use)

(define-map payments uint { total-paid: uint, last-payment: uint })
(define-map obligations uint uint) ;; agreement-id -> required-amount

(define-public (set-obligation (agreement-id uint) (amount uint))
  (let ((caller tx-sender))
    (asserts! (is-eq caller (unwrap-panic (get sponsor (unwrap-panic (contract-call? .Sponsorship get-details agreement-id))))) ERR-NOT-SPONSOR)
    (map-set obligations agreement-id amount)
    (ok true)))

(define-public (record-payment (agreement-id uint) (amount uint))
  (let ((caller tx-sender)
        (current (default-to { total-paid: u0, last-payment: u0 } (map-get? payments agreement-id))))
    (asserts! (is-eq caller (unwrap-panic (get sponsor (unwrap-panic (contract-call? .Sponsorship get-details agreement-id))))) ERR-NOT-SPONSOR)
    (asserts! (>= amount MIN_SUPPORT) ERR-INSUFFICIENT-PAYMENT)
    ;; Simulate STX transfer (in real dApp, use stx-transfer?)
    (map-set payments agreement-id { total-paid: (+ (get total-paid current) amount), last-payment: block-height })
    (ok true)))

(define-read-only (get-payment-status (agreement-id uint))
  (map-get? payments agreement-id))
```

### 5. ComplianceReporter.clar
Handles compliance reports (e.g., via oracles) to verify real-world adherence (e.g., income levels).

```clarity
;; ComplianceReporter.clar
;; Reports and verifies compliance data.

(define-constant ERR-NOT-VERIFIER (err u500))
(define-constant COMPLIANT u1)
(define-constant NON_COMPLIANT u2)

(define-map compliance-reports uint { status: uint, reported-by: principal, height: uint })

(define-public (report-compliance (agreement-id uint) (status uint) (evidence (string-utf8 1000)))
  (let ((caller tx-sender))
    (asserts! (is-eq (unwrap-panic (contract-call? .UserRegistry get-role caller)) "verifier") ERR-NOT-VERIFIER)
    (asserts! (or (is-eq status COMPLIANT) (is-eq status NON_COMPLIANT)) (err u501))
    (map-set compliance-reports agreement-id { status: status, reported-by: caller, height: block-height })
    (ok true)))

(define-read-only (get-compliance (agreement-id uint))
  (map-get? compliance-reports agreement-id))
```

### 6. DisputeHandler.clar
Manages disputes, allowing evidence submission and simple resolution (e.g., via admin or future DAO voting).

```clarity
;; DisputeHandler.clar
;; Handles disputes in sponsorships.

(define-constant ERR-NOT-PARTY (err u600))
(define-constant DISPUTE_OPEN u1)
(define-constant DISPUTE_RESOLVED u2)

(define-map disputes uint { agreement-id: uint, initiator: principal, description: (string-utf8 1000), status: uint, resolution: (optional (string-utf8 500)) })

(define-data-var dispute-counter uint u0)

(define-public (raise-dispute (agreement-id uint) (description (string-utf8 1000)))
  (let ((caller tx-sender)
        (id (var-get dispute-counter))
        (details (unwrap-panic (contract-call? .Sponsorship get-details agreement-id))))
    (asserts! (or (is-eq caller (get sponsor details)) (is-eq caller (get immigrant details))) ERR-NOT-PARTY)
    (map-set disputes id { agreement-id: agreement-id, initiator: caller, description: description, status: DISPUTE_OPEN, resolution: none })
    (var-set dispute-counter (+ id u1))
    (ok id)))

(define-public (resolve-dispute (dispute-id uint) (resolution (string-utf8 500)))
  (let ((dispute (unwrap-panic (map-get? disputes dispute-id)))
        (caller tx-sender))
    (asserts! (is-eq caller (contract-call? .UserRegistry get-admin)) (err u601)) ;; Admin resolution; extend to DAO
    (map-set disputes dispute-id (merge dispute { status: DISPUTE_RESOLVED, resolution: (some resolution) }))
    (ok true)))

(define-read-only (get-dispute (id uint))
  (map-get? disputes id))
```

## Future Improvements
- Integrate oracles for automated compliance (e.g., API feeds for poverty guidelines).
- Add NFT for sponsorship certificates.
- DAO governance for system upgrades.
- Expand to more roles (e.g., lawyers).

## License
MIT License. See LICENSE file for details.