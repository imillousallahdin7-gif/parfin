/**
 * Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Intended for validation against Firebase Rules Emulator or unit policy checks.
 */

export interface DirtyPayloadCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'delete' | 'read';
  auth: { email?: string; email_verified?: boolean } | null;
  docId: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyPayloadCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Product Create',
    collection: 'products',
    operation: 'create',
    auth: null,
    docId: 'prod_1',
    payload: {
      name: { fr: 'Oud Royal', ar: 'عود ملكي' },
      description: { fr: 'Description', ar: '' },
      category: 'Niche',
      price: 500,
      sizes: [{ id: 's1', label: '10 ml', price: 500, inStock: true }],
      inStock: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Oversized imageData (> 600000 bytes)',
    collection: 'products',
    operation: 'create',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'prod_2',
    payload: {
      name: { fr: 'Ambre', ar: '' },
      description: { fr: 'Desc', ar: '' },
      category: 'Arabe',
      price: 300,
      sizes: [{ id: 's1', label: '10 ml', price: 300, inStock: true }],
      inStock: true,
      imageData: 'A'.repeat(600001),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Invalid Product Name Type (string instead of map)',
    collection: 'products',
    operation: 'create',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'prod_3',
    payload: {
      name: 'Oud Royal',
      description: { fr: 'Desc', ar: '' },
      category: 'Niche',
      price: 300,
      sizes: [{ id: 's1', label: '10 ml', price: 300, inStock: true }],
      inStock: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Product',
    collection: 'products',
    operation: 'create',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'prod_4',
    payload: {
      name: { fr: 'Oud', ar: '' },
      description: { fr: 'Desc', ar: '' },
      category: 'Niche',
      price: 300,
      sizes: [{ id: 's1', label: '10 ml', price: 300, inStock: true }],
      inStock: true,
      isAdminApproved: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning (> 128 chars or invalid chars)',
    collection: 'products',
    operation: 'create',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'bad$id'.repeat(30),
    payload: {},
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Negative Price Tampering',
    collection: 'products',
    operation: 'create',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'prod_6',
    payload: {
      name: { fr: 'Oud', ar: '' },
      description: { fr: 'Desc', ar: '' },
      category: 'Niche',
      price: -100,
      sizes: [{ id: 's1', label: '10 ml', price: -100, inStock: true }],
      inStock: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unbounded Sizes Array (> 20 items)',
    collection: 'products',
    operation: 'create',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'prod_7',
    payload: {
      name: { fr: 'Oud', ar: '' },
      description: { fr: 'Desc', ar: '' },
      category: 'Niche',
      price: 200,
      sizes: Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, label: `${i} ml`, price: 200, inStock: true })),
      inStock: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Invalid Pack Category',
    collection: 'packs',
    operation: 'create',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'pack_8',
    payload: {
      category: 'kids',
      name: { fr: 'Pack Test', ar: '' },
      description: { fr: 'Desc', ar: '' },
      price: 400,
      active: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unauthorized WhatsApp Settings Hijack',
    collection: 'settings',
    operation: 'update',
    auth: { email: 'attacker@example.com', email_verified: true },
    docId: 'whatsapp',
    payload: { number: '212600000000' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Arbitrary Settings Document',
    collection: 'settings',
    operation: 'create',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'secret_keys',
    payload: { apiKey: 'leak' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Undeclared Collection Read/Write',
    collection: 'users',
    operation: 'read',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'uid_1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Immutable createdAt Overwrite on Update',
    collection: 'products',
    operation: 'update',
    auth: { email: 'Taghzout.saif@hotmail.com', email_verified: true },
    docId: 'prod_1',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
];
