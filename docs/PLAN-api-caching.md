# PLAN: API Caching — Parallel Queries + In-Memory Cache

## Goal

Tối ưu `/api/marketing` route: chạy 5 Prisma queries **song song** (`Promise.all`) + cache in-memory (TTL 5 min) + `Cache-Control` header cho CDN/browser.

---

## Changes

### [MODIFY] `apps/web/src/app/api/marketing/route.ts`

**1. Parallel queries** — Thay 5 `await` tuần tự bằng `Promise.all`:

```typescript
// BEFORE (sequential ~3-5s)
const summary = await prisma.marketingEntry.groupBy({...});
const daily = await prisma.marketingEntry.groupBy({...});
const campaigns = await prisma.marketingEntry.groupBy({...});
const channels = await prisma.marketingEntry.groupBy({...});
const masterStatus = await prisma.campaignMaster.groupBy({...});

// AFTER (parallel ~1-1.5s)
const [summary, daily, campaigns, channels, masterStatus] = await Promise.all([
    prisma.marketingEntry.groupBy({...}),
    prisma.marketingEntry.groupBy({...}),
    prisma.marketingEntry.groupBy({...}),
    prisma.marketingEntry.groupBy({...}),
    prisma.campaignMaster.groupBy({...}),
]);
```

**2. In-memory cache** — Cache response theo query key (start+end+companyId):

```typescript
const cache = new Map<string, { data: object; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const cacheKey = `${companyId || 'all'}:${startDate}:${endDate}`;
const cached = cache.get(cacheKey);
if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
}
```

**3. Cache-Control header** — CDN + browser cache:

```typescript
return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
});
```

---

### [MODIFY] `apps/web/src/app/api/marketing/entries/route.ts`

- Áp dụng `Cache-Control` header (dữ liệu ít thay đổi trong ngày)

---

## Verification

- [ ] API response time giảm đáng kể
- [ ] Lần fetch thứ 2 (cùng params) trả về từ cache
- [ ] `next build` passes
- [ ] Trang /cmo, /staff, /manager load nhanh hơn
