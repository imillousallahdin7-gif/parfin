# Security Specification — PARFUMERIE EL KHALIFI

## 1. Data Invariants
1. **Default-Deny Baseline**: Any Firestore collection not explicitly declared (`products`, `packs`, `settings`, `categories`, `_health`) is denied for both read and write.
2. **Public Catalog Read, Zero Anonymous/Public Write**: `products`, `packs`, `settings`, and `categories` are publicly readable (used by the build-time static catalog generator `scripts/build-catalog.ts` and admin preview), while all write operations (`create`, `update`, `delete`) require an authenticated admin session (`request.auth != null` matching the configured admin email).
3. **Product Payload Integrity**: Every `products` document must include `name` as a `{ fr, ar }` map, `description` as a `{ fr, ar }` map, bounded `category`, non-negative `price`, bounded `sizes` list, boolean `inStock`, immutable `createdAt`, and server-enforced `updatedAt`. `imageData` (when present) must be a string with `.size() <= 600000`.
4. **Pack Payload Integrity**: Every `packs` document must restrict `category` to `'women'` or `'men'`, enforce `{ fr, ar }` maps, non-negative `price`, boolean `active`, and `imageData.size() <= 600000`.
5. **Path Hardening**: All document IDs (`productId`, `packId`, `settingId`, `categoryId`, `docId`) must satisfy `^[a-zA-Z0-9_-]+$` and length `<= 128`. Settings IDs are further restricted to `'whatsapp'` or `'general'`.
6. **Diagnostic Isolation**: `_health` documents are strictly admin-only (`read` and `write`).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Product Create**: Anonymous client attempts `create` on `/products/test-1`.
2. **Oversized `imageData` DoS**: Authenticated non-admin or admin attempts `create` on `/products/test-2` with `imageData.size() == 600001`.
3. **Invalid `name` Type**: Attempt to write `/products/test-3` with `name: "Oud Royal"` (string instead of `{ fr, ar }` map).
4. **Shadow Field Injection on Product**: Attempt to write `/products/test-4` with extra ghost field `isAdminApproved: true`.
5. **ID Poisoning**: Attempt to write `/products/../../etc/passwd` or 300-character ID.
6. **Negative Price Tampering**: Attempt to write `/products/test-5` with `price: -100`.
7. **Unbounded Sizes Array**: Attempt to write `/products/test-6` with 25 size objects (`> 20`).
8. **Invalid Pack Category**: Attempt to write `/packs/pack-1` with `category: "kids"`.
9. **Unauthorized Settings Hijack**: Unauthenticated or non-admin user attempts `update` on `/settings/whatsapp` to redirect WhatsApp orders.
10. **Arbitrary Settings Document**: Attempt to create `/settings/secret_keys`.
11. **Undeclared Collection Access**: Attempt `read` or `write` on `/users/uid-1` or `/orders/order-1`.
12. **Timestamp Spoofing / Immutable `createdAt` Tampering**: Attempt to overwrite `createdAt` on an existing `/products/test-1` during `update`.
