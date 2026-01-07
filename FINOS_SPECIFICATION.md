# FinOS: Premium Financial Operating System - Technical Specification

## 1. Project Overview
FinOS (Financial Operating System) is a high-fidelity Android application built with React, Capacitor, and Supabase. It is designed for users who require more than just expense tracking—it provides a professional-grade ledger system for managing capital across multiple environments (Cash, Bank, Digital Wallets).

**Target User:** Financially conscious individuals, small business owners, and power users who manage diverse asset pools.
**Core Philosophy:** 
- **Accuracy-First Accounting:** Every cent must be accounted for across specific settlement channels.
- **Wallet-Centricity:** Funds are organized into logical "Wallets" (e.g., Personal, Business) that mirror real-world accounts.
- **Frictionless Intelligence:** Using AI and smart math units to reduce the cognitive load of data entry.

---

## 2. Core Features (Current Implementation)

### Wallet & Account Management
Allows users to create and manage multiple financial containers.
- **Why it exists:** To separate different pools of money (e.g., Savings vs. Spending).
- **User Flow:** Dashboard > Accounts > Add Wallet. Users define a name, currency, and initial balance.
- **Data Detail:** Wallets hold a name, currency, color, and a set of active channels.

### Multi-Channel Settlement
A unique feature where one wallet can have multiple "Channels" (CASH, BANK, CARD, MOBILE).
- **Why it exists:** Real-world wallets are often distributed (e.g., your "Business" funds might be partially in the bank and partially in petty cash).
- **User Flow:** In the Wallet Form, users toggle channels and allocate balances to each.
- **Rule:** A wallet must have at least one channel. Income/Expenses must be assigned to a specific channel.

### Smart Transaction Engine
A high-performance entry system with an embedded math evaluator.
- **Why it exists:** To eliminate the need for external calculators.
- **How to use:** Enter math expressions (e.g., `1200 * 1.15`) directly into the amount field. The value is calculated on-the-fly.
- **AI Suggestion:** If a note is provided, the user can tap the "Brain" icon to have Gemini suggest the most appropriate category based on the narrative.

### Professional Taxonomy (Category) System
A hierarchical classification system for transactions.
- **Features:** Supports parent categories and sub-categories. 
- **Global vs. User:** The system comes with "Global" segments (e.g., Food, Transport) and allows users to create "Custom" segments.
- **Reporting:** Categories are linked to transaction types (Income, Expense, Saving, Investment, Transfer).

### Internal Asset Transfers
Moves funds between positions without changing net worth.
- **How it works:** Users select a source (Wallet + Channel) and a destination (Wallet + Channel).
- **Practicality:** Useful for documenting bank withdrawals (Bank -> Cash) or paying off a card (Bank -> Card).

### Executive Dashboard & AI Insights
The mission control for the user's finances.
- **Total Net Worth:** A real-time roll-up of all primary and independent wallet balances.
- **Revenue vs. Burn:** Monthly cash-flow visualization.
- **Cognitive Insights:** AI-generated cards that analyze transaction history to provide priorities (High/Medium/Low).

---

## 3. Wallet System – Detailed Behavior

### Wallet Creation & Types
When a user creates a wallet, they define its behavior:
1.  **Primary Wallet:** Only one wallet can be primary. It serves as the default selection for new transactions and the anchor for the global total balance.
2.  **Independent Wallet:** A standard wallet that tracks its own balance and is included in the total net worth.
3.  **Sub-Ledger (Uses Primary Income):** A specialized wallet type that visually isolates funds but can be linked to the primary wallet's income stream for unified tracking.

### Balance Calculation Logic
Wallet balances are not just static numbers; they are computed dynamically:
- `Current Balance = Initial Balance + Sum(Incomes) + Sum(Transfer Entry) - Sum(Expenses) - Sum(Transfer Exit)`.
- **Channel Balances:** Calculated similarly, ensuring that the sum of channels always equals the total wallet balance.

---

## 4. Category System – Current State

### Classification Hierarchy
Categories are structured as a tree:
- **Master Category:** The high-level type (Income, Expense, etc.).
- **Parent Category:** A group header (e.g., "Housing").
- **Sub-Category:** A specific segment (e.g., "Rent", "Utilities").

### Selection Logic
During transaction entry, the "Taxonomy Index" (Picker) filters categories based on the transaction type select (Income vs Expense). Users can search for segments or browse the hierarchy.

---

## 5. Transaction Flow

### Field Requirements
- **Amount:** Numerical or math expression (Required).
- **Type:** Expense, Income, or Transfer (Required).
- **Source:** Wallet + Channel (Required).
- **Taxonomy:** Category (Required for Income/Expense).
- **Note:** Narrative description (Optional, but used for AI suggestions).

### Post-Transaction Behavior
1.  **Balance Update:** The associated Wallet and Channel balances are adjusted immediately.
2.  **Dashboard Sync:** The "Total Balance" and "Monthly Burn Rate" update in real-time.
3.  **Cloud Sync:** Data is persisted to Supabase and synced across sessions.

---

## 6. Dashboard Logic

### Global Net Worth Calculation
The Total Balance displayed on the dashboard is calculated as:
`Sum(Wallets where isPrimary == true OR usesPrimaryIncome == false)`

> [!NOTE]
> This ensures that "Sub-Ledger" wallets don't double-count funds if they are technically part of the primary income stream.

### Insights Engine
The dashboard periodically triggers a background analysis of the last 30 days of transactions, generating AI insights regarding spending patterns or budget priorities.

---

## 7. User Experience Flow

### Typical Journeys
- **Adding a Wallet:** `Accounts > [+] > Define Metadata > Allocate Channel Balances > Save`.
- **Recording an Expense:** `[+] > Enter Amount (utilizing math if needed) > Select Taxonomy > Add Note > [Commit]`.
- **Executing a Transfer:** `[+] > Select Transfer Tab > Select Exit (Wallet/Channel) > Select Entry (Wallet/Channel) > [Execute]`.

---

## 8. Current Limitations & Constraints
- **Split Transactions:** The data model supports splits, but the UI is currently optimized for single-category entry.
- **Currency Conversion:** While wallets can have different currencies, the total balance currently performs a simple sum without real-time FX conversion (assumes base currency).
- **Manual Allocation:** Initial channel balances must be manually entered during wallet creation; there is no auto-detection of bank balances.

---

## 9. Technical Notes
- **Persistence:** Supabase (PostgreSQL) with Row Level Security (RLS).
- **State Management:** React Context API (`FinanceContext`) with `useMemo` for high-performance balance recalculations.
- **Visuals:** AMOLED-ready dark mode using Tailwind-like custom styles and Glassmorphic CSS.
- **Intelligence:** Google Gemini API for category matching and financial advice.
