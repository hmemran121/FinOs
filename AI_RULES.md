# ANTIGRAVITY AI ENGINEERING CONSTITUTION
> **Severity:** HARD LAW (Immutable)
> **Enforcement:** Strict (Zero Tolerance for Violations)

This document defines the 13 Semantic Laws that govern all AI Agents, Copilots, and Engineers working on the **FinOS** project.

---

## Article 1: Stability Over Speed
**"Better to arrive late than to arrive broken."**
- **Rule:** Never push code that breaks the build.
- **Rule:** If a refactor is risky, simulate it mentally or create a backup branch first.
- **Rule:** 100% uptime for the `dev` server is the goal.

## Article 2: Correctness Over Cleverness
**"Clear code is better than smart code."**
- **Rule:** Avoid "one-liners" if they obscure logic.
- **Rule:** Variable names must be descriptive (`isTransactionValid` > `isValid`).
- **Rule:** No "magic numbers". Use named constants in `constants.tsx`.

## Article 3: Architecture Over Hacks
**"Build for 10 years, not 10 minutes."**
- **Rule:** Functionality must follow the established architecture (e.g., `FinanceContext` state management).
- **Rule:** Do not bypass the `OfflineSyncService` for data operations.
- **Rule:** Component composition > Prop drilling.

## Article 4: The "No Placeholder" Policy
**"Real pixels only."**
- **Rule:** Never leave `Lorem Ipsum` or `TODO` visual artifacts in the UI.
- **Rule:** Use realistic mock data if real data is unavailable.
- **Rule:** Every button must have a click handler, even if it just logs "Not Implemented".

## Article 5: Premium Aesthetics
**"If it looks cheap, it is a bug."**
- **Rule:** Use the predefined specific color palette (Glassmorphism, Neon Accents).
- **Rule:** Deep visuals: Shadows, Blurs, and Gradients are mandatory for depth.
- **Rule:** Animation is not optional. Elements must enter/exit smoothly.

## Article 6: Absolute Type Safety
**"TypeScript is the Law."**
- **Rule:** `any` type is strictly forbidden. Use `interface` or `type`.
- **Rule:** Props must be strictly typed.
- **Rule:** API responses must be typed before consumption.

## Article 7: Atomic Responsibility
**"Do one thing, do it perfectly."**
- **Rule:** Functions should not exceed 50-80 lines ideally.
- **Rule:** React Components should be small and composable.
- **Rule:** Separation of Concerns: Logic in Hooks/Context, UI in Components.

## Article 8: User-Centricity
**"The User determines the value."**
- **Rule:** Always confirm dangerous actions (Delete, Reset) with a Modal.
- **Rule:** Infinite scrolling/pagination for large lists (Transaction Lists).
- **Rule:** Instant visual feedback for every interaction (Toast, Pulse, Ripple).

## Article 9: Security First
**"Trust no one."**
- **Rule:** Row Level Security (RLS) must be respected in Supabase.
- **Rule:** Biometric Authentication is the primary gatekeeper.
- **Rule:** Sensitive data (API Keys) must never be logged to console in Production.

## Article 10: Performance Optimization
**"60 FPS or nothing."**
- **Rule:** Memoize expensive calculations (`useMemo`).
- **Rule:** Memoize function references (`useCallback`).
- **Rule:** Virtualize long lists.

## Article 11: Agentic Autonomy
**"Think before you code."**
- **Rule:** Read the file before editing it.
- **Rule:** Verify the import path before writing it.
- **Rule:** Check for existing utility functions before writing new ones.

## Article 12: Documentation
**"Code tells you how, comments tell you why."**
- **Rule:** Complex logic must have explanatory comments.
- **Rule:** Maintain `task.md` and `implementation_plan.md` religiously.
- **Rule:** Document database schema changes in `migration.sql`.

## Article 13: The Language Protocol
- **13.1:** All communication with the USER must be in **BENGALI** (Friendly, Professional).
- **13.2:** All internal thought processes, code comments, variable names, and git commits must be in **ENGLISH**.

---
*Ratified by Internal High Command*
*Automated Enforcement Active*
