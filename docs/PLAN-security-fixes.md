# PLAN: Fix All Security Issues

> Based on codebase security audit — 2026-02-25

---

## Phase 1 — Prisma Singleton + Middleware Secret (Quick Wins)

**Goal:** Eliminate connection pool exhaustion and remove fallback JWT secret.

### 1.1 [NEW] `lib/prisma.ts` — Prisma Singleton

Create shared singleton used by all API routes:

```ts
// apps/web/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 1.2 [MODIFY] `middleware.ts` — Remove fallback secret

```diff
-const AUTH_SECRET = new TextEncoder().encode(
-    process.env.AUTH_SECRET || 'fallback-dev-secret-change-me'
-);
+function getAuthSecret() {
+    const secret = process.env.AUTH_SECRET;
+    if (!secret) throw new Error('AUTH_SECRET is required');
+    return new TextEncoder().encode(secret);
+}
```

### 1.3 [MODIFY] `api/marketing/route.ts` + `api/marketing/entries/route.ts`

Replace `new PrismaClient()` → `import { prisma } from '@/lib/prisma'`

**Files changed:** 3 modified, 1 new

---

## Phase 2 — API Auth Guard

**Goal:** Protect all `/api/marketing/*` routes with JWT verification.

### 2.1 [NEW] `lib/api-auth.ts` — Shared Auth Helper

```ts
export async function requireAuth(request: Request): Promise<{
  email: string; role: string;
} | Response>
```

- Reads `mh_session` cookie
- Verifies JWT with `getAuthSecret()`
- Returns user payload or `401 NextResponse`

### 2.2 [MODIFY] `api/marketing/route.ts`

```diff
+import { requireAuth } from '@/lib/api-auth';
+
 export async function GET(request: Request) {
+    const auth = await requireAuth(request);
+    if (auth instanceof Response) return auth;
+
     const { searchParams } = new URL(request.url);
```

### 2.3 [MODIFY] `api/marketing/entries/route.ts`

Same pattern — add `requireAuth()` at top of `GET()`.

**Files changed:** 2 modified, 1 new

---

## Phase 3 — Input Validation

**Goal:** Validate all query params to prevent bad DB queries.

### 3.1 [MODIFY] `api/marketing/route.ts`

Add validation:
- `companyId` ∈ `['san', 'teennie', 'tgil']` or undefined
- `start`/`end` must be valid `YYYY-MM-DD` format
- `start` ≤ `end`

### 3.2 [MODIFY] `api/marketing/entries/route.ts`

Same validation + `channel` must be a known channel ID.

### 3.3 [MODIFY] `api/marketing/entries/route.ts` — Remove `take: 500` hard limit

Add configurable limit with max cap:
```ts
const limit = Math.min(Number(searchParams.get('limit')) || 500, 2000);
```

**Files changed:** 2 modified

---

## Phase 4 — Password Hashing

**Goal:** Hash passwords with bcrypt. Plaintext `'demo'` → hashed strings.

### 4.1 Install bcryptjs (no native deps for Vercel)

```bash
npm install bcryptjs && npm install -D @types/bcryptjs
```

### 4.2 [MODIFY] `api/auth/login/route.ts`

```diff
-const USERS = {
-    'cmo@sgroup.vn': { password: 'demo', ... },
+import bcrypt from 'bcryptjs';
+const USERS = {
+    'cmo@sgroup.vn': { password: '$2a$10$...hashed...', ... },
```

Replace `user.password !== password` with `bcrypt.compare()`.

### 4.3 [NEW] `scripts/hash-passwords.mjs`

Utility to generate bcrypt hashes for initial setup.

**Files changed:** 1 modified, 1 new script

---

## Phase 5 — RBAC on Data APIs

**Goal:** Staff can only see data for their assigned company.

### 5.1 [MODIFY] `api/marketing/route.ts`

```ts
const auth = await requireAuth(request);
// STAFF role: force companyId filter (assigned company from user profile)
// CMO/HEAD: can query any company
```

### 5.2 [MODIFY] `api/marketing/entries/route.ts`

Same RBAC check.

> **Note:** Requires adding `companyId` to user USERS record or JWT claims.

**Files changed:** 2 modified

---

## Phase 6 — Edge Cases + Hardcoded Date

**Goal:** Fix remaining edge cases.

### 6.1 [MODIFY] `use-marketing-data.ts` — Dynamic reference date

```diff
-const now = new Date('2026-02-25');
+const now = new Date(); // Use actual current date
```

### 6.2 [MODIFY] `TimeFilterBar.tsx` — Validate start ≤ end

Add validation: if user picks `start > end`, swap them.

### 6.3 [MODIFY] `staff/page.tsx` — Same dynamic date fix

```diff
-const now = new Date('2026-02-25');
+const now = new Date();
```

**Files changed:** 3 modified

---

## Summary

| Phase | Priority | Files | Risk |
|-------|----------|-------|------|
| 1 — Prisma + Secret | 🔴 Critical | 4 | Low |
| 2 — API Auth | 🔴 Critical | 3 | Low |
| 3 — Input Validation | 🟠 High | 2 | Low |
| 4 — Password Hashing | 🟠 High | 2 | Medium |
| 5 — RBAC Data APIs | 🟡 Medium | 2 | Medium |
| 6 — Edge Cases | 🟡 Medium | 3 | Low |

**Total:** ~16 file changes across 6 phases

---

## Verification Plan

### Per Phase
- [ ] Build passes (`npx turbo build`)
- [ ] Login flow works (all 4 roles)
- [ ] Marketing APIs return data (authenticated)
- [ ] Marketing APIs reject unauthenticated requests

### Final
- [ ] `AUTH_SECRET` set in Vercel env vars
- [ ] No plaintext passwords in source
- [ ] All API routes protected
- [ ] Push to production + verify
