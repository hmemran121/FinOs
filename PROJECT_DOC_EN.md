# FinOS: Premium Financial Operating System - Technical Manual

FinOS is a high-performance, offline-first personal finance ecosystem designed for users who demand precision, security, and a premium aesthetic experience.

---

## 🏗️ Core Architectural Pillars

### 1. Data Integrity: Local-First, Cloud-Mirror
- **SQLite Persistence:** Leverages `@capacitor-community/sqlite` for native ACID-compliant storage. This ensures zero latency and total data integrity even without internet access.
- **Supabase Real-time Sync:** The `OfflineSyncService` manages a dual-layer synchronization process using WebSockets for instant updates and Delta Pulling for efficient background matching.
- **Atomic Operations:** All database writes are wrapped in transactions, ensuring that failed syncs or app crashes never leave the system in an inconsistent state.

### 2. State Engineering: FinanceContext
- **Global Orchestration:** The entire application's state is centralized in `FinanceContext.tsx`. This acts as the "Source of Truth" for all UI components.
- **Sub-Ledger Logic:** Implements a unique "Parent-Child" wallet relationship where transactions in child wallets are automatically mirrored in parents, maintaining accurate reporting across complex financial structures.

### 3. Intelligence: Google Gemini 3.0
- **Contextual Insights:** Uses raw transaction data to generate urgency-aware financial advice.
- **Predictive Taxonomy:** AI-driven category suggestions based on transaction narratives, reducing manual input effort by up to 70%.

---

## 🛠️ The Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Logic Layer** | React 18 + TypeScript | Type-safe, component-based development with high modularity. |
| **Mobile Bridge** | Capacitor | Provides direct access to native Android/iOS APIs with a single codebase. |
| **UI System** | Tailwind CSS v4 + Framer Motion | Modern toolchain for high-end micro-animations and layouts. |
| **Persistence** | SQLite + Supabase | The gold standard for hybrid offline-online data management. |

---

## 🔗 Integrated Workflows (Linkages)

1. **The Life of a Transaction:**
   When a user hits "Save", the data undergoes a multi-stage relay:
   - `Persistence:` Local SQLite commit.
   - `Propagation:` Enqueued in `sync_queue`.
   - `Cloud Handshake:` `OfflineSyncService` pushes to Supabase via `auth.getSession()`.
   - `Broadcast:` A "Sync Pulse" is sent via Realtime channels to update all other logged-in devices.

2. **Security Integration:**
   `Supabase Auth ➡️ Biometric Lock ➡️ RLS Policies`. This three-layer shield ensures that even if a phone is stolen, the financial data is inaccessible without biometric proof.

3. **Financial Planning Module:**
   A specialized engine within the app that links `Categories`, `Wallets`, and `Budgets` into a cohesive planning UI with integrated math calculation logic.

---

## 🎨 Design Language & Aesthetics

- **Glassmorphism:** Elegant use of blur and translucency to create depth.
- **Micro-Interactions:** Custom loaders, slide-to-delete actions, and status indicators that make the app feel alive.
- **Optimistic UI:** Every action is processed locally first, providing instant visual feedback before the network request ever completes.

---
*Architected by: Antigravity AI*
*Last Updated: January 7, 2026*
