# RBAC Option A (Config-Backed) — Summary and Next Steps

## What was added

- Config-driven RBAC (no DB migrations)
  - `config/permissions.json`: `fullAccessStoreIds`, `staff`, `managers`, `notifyEmails`
  - `config/permissions.js`: helpers to read config
- Auth response enriched
  - `routes/auth.js` now returns `user.permissions` with `{ fullAccessStoreIds, staffStoreIds, isFullAccess, isStaff }`
- Items route protections
  - STAFF: can list only assigned store(s) (requires `?storeId=`); can update quantity only; no create/delete
  - Full-feature (ADMIN/HEADOFFICE or whitelisted stores): can create/update/delete
  - Item history logs `updatedBy` using requester email when available
- Admin API (config-backed)
  - `routes/admin.js` mounted at `/api/admin`
  - Endpoints (ADMIN/HEADOFFICE only):
    - `GET /api/admin/config/permissions`
    - `POST /api/admin/config/full-feature-stores` { storeIds: number[] }
    - `POST /api/admin/config/staff` { email: string, storeIds: number[] }
    - `POST /api/admin/config/managers` { email: string, storeIds: number[] }
    - `POST /api/admin/config/notify` { emails: string[] }

## How to configure

- Edit `config/permissions.json` directly or use the admin endpoints.
- Example:

```json
{
	"fullAccessStoreIds": [1, 2],
	"notifyEmails": ["manager@example.com"],
	"staff": { "staff1@org.com": [3], "staff2@org.com": [4, 5] },
	"managers": { "manager1@org.com": [1] }
}
```

## Frontend expectations

- Read `user.permissions` from login response.
- If `isStaff`: hide create/delete; only allow quantity edit; require `storeId` filter on list.
- If store is in `fullAccessStoreIds`: show full CRUD for that store.

## Phase 1 email plan

- Use `notifyEmails` as recipients.
- Send email on item create/update (esp. STAFF updates) with: store, user, item, and before→after quantity.

## Recommended next steps

1. Wire email notifications on item create/update (Phase 1 requirement)
2. Extend RBAC to categories/stores routes (read-only for STAFF)
3. Add `/api/me` to return user + permissions for the frontend
4. Optional: per-store notification recipients
5. Tighten CORS for production (remove `*`)
6. Option B (DB-backed) later: `UserStore(userId, storeId, storeRole)` and `Store.isFullFeature`

## Quick test checklist

- As STAFF: GET `/items?storeId=<allowed>` works; PUT updates quantity only; POST/DELETE blocked.
- As ADMIN/HEADOFFICE: Admin endpoints work; full CRUD on whitelisted stores.
