import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { DEFAULT_ROLE_PERMISSIONS } from "../src/modules/rbac/services/permissions";
import { getScriptAdminApp } from "./lib/firebaseAdmin";

const app = getScriptAdminApp();
const db = getFirestore(app);
const auth = getAuth(app);

export const DEMO_CUSTOMER_EMAIL = "demo-customer@rymx.test";
const DEMO_CUSTOMER_PASSWORD = "password123";

// For admin e2e/manual testing: an owner (full permissions) and a staff
// member with no permissions granted yet, so "non-permitted staff denied" is
// exercisable without hand-rolling custom claims in every test run.
export const DEMO_OWNER_EMAIL = "demo-owner@rymx.test";
export const DEMO_RESTRICTED_STAFF_EMAIL = "demo-staff@rymx.test";
export const DEMO_ADMIN_EMAILS = ["demo-admin-1@rymx.test", "demo-admin-2@rymx.test"] as const;
const DEMO_ADMIN_PASSWORD = "password123";

type SeedVariant = {
  sku: string;
  optionValues: Record<string, string>;
  priceMinor: number;
  compareAtMinor?: number | null;
  stock: number;
};

type SeedProduct = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  options: { name: string; values: string[] }[];
  variants: SeedVariant[];
};

const categories = [
  { slug: "tops", title: "Tops", order: 0 },
  { slug: "bottoms", title: "Bottoms", order: 1 },
  { slug: "outerwear", title: "Outerwear", order: 2 },
];

const products: SeedProduct[] = [
  {
    slug: "cairo-bomber-jacket",
    title: "Cairo Bomber Jacket",
    description: "A gold-lined bomber cut for Cairo nights.",
    category: "outerwear",
    tags: ["ss26", "jacket"],
    options: [{ name: "Size", values: ["S", "M", "L"] }],
    variants: [
      { sku: "CBJ-S", optionValues: { Size: "S" }, priceMinor: 285000, stock: 8 },
      { sku: "CBJ-M", optionValues: { Size: "M" }, priceMinor: 285000, stock: 12 },
      { sku: "CBJ-L", optionValues: { Size: "L" }, priceMinor: 285000, stock: 5 },
    ],
  },
  {
    slug: "nile-tee",
    title: "Nile Tee",
    description: "Heavyweight cotton tee with a minimal gold RYMX mark.",
    category: "tops",
    tags: ["ss26", "essentials"],
    options: [{ name: "Size", values: ["S", "M", "L", "XL"] }],
    variants: [
      { sku: "NT-S", optionValues: { Size: "S" }, priceMinor: 65000, stock: 20 },
      { sku: "NT-M", optionValues: { Size: "M" }, priceMinor: 65000, stock: 25 },
      { sku: "NT-L", optionValues: { Size: "L" }, priceMinor: 65000, stock: 18 },
      { sku: "NT-XL", optionValues: { Size: "XL" }, priceMinor: 65000, stock: 0 },
    ],
  },
  {
    slug: "desert-cargo-pants",
    title: "Desert Cargo Pants",
    description: "Utility cargo pants in sand and black.",
    category: "bottoms",
    tags: ["ss26"],
    options: [
      { name: "Size", values: ["30", "32", "34"] },
      { name: "Color", values: ["Sand", "Black"] },
    ],
    variants: [
      {
        sku: "DCP-30-SAND",
        optionValues: { Size: "30", Color: "Sand" },
        priceMinor: 195000,
        stock: 6,
      },
      {
        sku: "DCP-32-SAND",
        optionValues: { Size: "32", Color: "Sand" },
        priceMinor: 195000,
        stock: 9,
      },
      {
        sku: "DCP-34-SAND",
        optionValues: { Size: "34", Color: "Sand" },
        priceMinor: 195000,
        stock: 4,
      },
      {
        sku: "DCP-30-BLACK",
        optionValues: { Size: "30", Color: "Black" },
        priceMinor: 195000,
        stock: 7,
      },
      {
        sku: "DCP-32-BLACK",
        optionValues: { Size: "32", Color: "Black" },
        priceMinor: 195000,
        stock: 10,
      },
      {
        sku: "DCP-34-BLACK",
        optionValues: { Size: "34", Color: "Black" },
        priceMinor: 195000,
        stock: 3,
      },
    ],
  },
];

async function seed() {
  console.log("Seeding categories...");
  for (const category of categories) {
    await db
      .collection("categories")
      .doc(category.slug)
      .set({ title: category.title, slug: category.slug, order: category.order });
  }

  console.log("Seeding products + variants...");
  const productIds = new Map<string, string>();
  for (const product of products) {
    const minPriceMinor = Math.min(...product.variants.map((v) => v.priceMinor));
    const ref = db.collection("products").doc(product.slug);
    await ref.set({
      title: product.title,
      slug: product.slug,
      description: product.description,
      status: "active",
      tags: product.tags,
      category: product.category,
      media: [],
      options: product.options,
      minPriceMinor,
      createdAt: new Date(),
    });
    productIds.set(product.slug, ref.id);

    for (const variant of product.variants) {
      await ref
        .collection("variants")
        .doc(variant.sku)
        .set({
          sku: variant.sku,
          optionValues: variant.optionValues,
          priceMinor: variant.priceMinor,
          compareAtMinor: variant.compareAtMinor ?? null,
          stock: variant.stock,
        });
    }
  }

  console.log("Seeding collections...");
  await db
    .collection("collections")
    .doc("ss26-launch")
    .set({
      title: "SS26 Launch",
      slug: "ss26-launch",
      description: "The first drop. Cairo-built, gold-lined.",
      media: [],
      productIds: [productIds.get("cairo-bomber-jacket")!, productIds.get("nile-tee")!],
      publishAt: null,
      active: true,
    });

  console.log("Seeding discount codes...");
  await db.collection("discounts").doc("WELCOME10").set({
    code: "WELCOME10",
    type: "percent",
    value: 10,
    minSpendMinor: 0,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    redeemedCount: 0,
    perUserLimit: 1,
    productIds: [],
    collectionIds: [],
    active: true,
    assignedToUid: null,
  });
  await db
    .collection("discounts")
    .doc("EXPIRED5")
    .set({
      code: "EXPIRED5",
      type: "fixed",
      value: 5000,
      minSpendMinor: 0,
      startsAt: null,
      endsAt: new Date("2020-01-01"),
      usageLimit: null,
      redeemedCount: 0,
      perUserLimit: 1,
      productIds: [],
      collectionIds: [],
      active: true,
      assignedToUid: null,
    });

  console.log("Seeding demo customer + personal promo...");
  const demoUser = await auth.getUserByEmail(DEMO_CUSTOMER_EMAIL).catch(() =>
    auth.createUser({
      email: DEMO_CUSTOMER_EMAIL,
      password: DEMO_CUSTOMER_PASSWORD,
      displayName: "Demo Customer",
    }),
  );
  await db.doc(`users/${demoUser.uid}`).set(
    {
      email: DEMO_CUSTOMER_EMAIL,
      displayName: "Demo Customer",
      role: "customer",
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );
  await db.collection("discounts").doc("VIP20").set({
    code: "VIP20",
    type: "percent",
    value: 20,
    minSpendMinor: 0,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    redeemedCount: 0,
    perUserLimit: 1,
    productIds: [],
    collectionIds: [],
    active: true,
    assignedToUid: demoUser.uid,
  });

  console.log("Seeding demo owner + restricted staff...");
  // Elevated (staff/admin/owner) roles skip email verification — access is
  // already gated by role-based permissions (see src/modules/rbac), not
  // verification status, so there's nothing extra it would protect here.
  // Customers (demo customer below) go through the real unverified flow.
  const ownerUser = await auth.getUserByEmail(DEMO_OWNER_EMAIL).catch(() =>
    auth.createUser({
      email: DEMO_OWNER_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
      displayName: "Demo Owner",
      emailVerified: true,
    }),
  );
  await auth.setCustomUserClaims(ownerUser.uid, {
    role: "owner",
    permissions: DEFAULT_ROLE_PERMISSIONS.owner,
  });
  await db.doc(`users/${ownerUser.uid}`).set(
    {
      email: DEMO_OWNER_EMAIL,
      displayName: "Demo Owner",
      role: "owner",
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );

  const staffUser = await auth.getUserByEmail(DEMO_RESTRICTED_STAFF_EMAIL).catch(() =>
    auth.createUser({
      email: DEMO_RESTRICTED_STAFF_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
      displayName: "Demo Staff",
      emailVerified: true,
    }),
  );
  await auth.setCustomUserClaims(staffUser.uid, {
    role: "staff",
    permissions: DEFAULT_ROLE_PERMISSIONS.staff,
  });
  await db.doc(`users/${staffUser.uid}`).set(
    {
      email: DEMO_RESTRICTED_STAFF_EMAIL,
      displayName: "Demo Staff",
      role: "staff",
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log("Seeding admin accounts...");
  for (const [i, email] of DEMO_ADMIN_EMAILS.entries()) {
    const displayName = `Demo Admin ${i + 1}`;
    const adminUser = await auth.getUserByEmail(email).catch(() =>
      auth.createUser({
        email,
        password: DEMO_ADMIN_PASSWORD,
        displayName,
        emailVerified: true,
      }),
    );
    await auth.setCustomUserClaims(adminUser.uid, {
      role: "admin",
      permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    });
    await db.doc(`users/${adminUser.uid}`).set(
      {
        email,
        displayName,
        role: "admin",
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  console.log("Done.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
