/**
 * Seeds two development accounts (owner + customer) into the LOCAL database.
 *
 * Run:  node --experimental-strip-types scripts/seed-dev-users.ts
 *
 * Mirrors POST /api/auth/signup: same validation rules (lib/auth/validation.ts),
 * bcryptjs with 12 rounds (lib/auth/password.ts), User + Profile created in one
 * transaction, status left to the schema default (ACTIVE).
 *
 * Idempotent: an existing email is reported and left untouched.
 * Refuses to run in production or against a non-local database host.
 * Never prints DATABASE_URL or any password hash.
 */
import "temporal-polyfill/full/global";
import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { z } from "zod";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../prisma/contract";
import contractJson from "../prisma/contract.json" with { type: "json" };

// ─── Safety guard ─────────────────────────────────────────────────────────────

if (existsSync(".env")) process.loadEnvFile(".env");

function fail(message: string): never {
  console.error(`seed-dev-users: ${message}`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  fail('refusing to run with NODE_ENV="production".');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) fail("DATABASE_URL is not set (expected in .env).");

let host: string;
try {
  host = new URL(databaseUrl).hostname;
} catch {
  fail("DATABASE_URL is not a valid URL.");
}
if (host !== "localhost" && host !== "127.0.0.1") {
  fail("refusing to run: the database host is not localhost / 127.0.0.1.");
}

// ─── Same field rules as lib/auth/validation.ts (signUpSchema) ────────────────

const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must not exceed 72 characters."),
  firstName: z.string().min(1, "First name is required.").max(80).trim(),
  lastName: z.string().min(1, "Last name is required.").max(80).trim(),
});

const SALT_ROUNDS = 12; // lib/auth/password.ts

const ACCOUNTS = [
  {
    label: "owner",
    managementRole: "OWNER" as const,
    input: { email: "manager@restivo.test", password: "Manager2026!", firstName: "Amine", lastName: "Manager" },
  },
  {
    label: "customer",
    managementRole: null,
    input: { email: "client@restivo.test", password: "Client2026!", firstName: "Sarra", lastName: "Client" },
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

const db = postgres<Contract>({ contractJson, url: databaseUrl });

try {
  for (const account of ACCOUNTS) {
    const parsed = signUpSchema.safeParse(account.input);
    if (!parsed.success) {
      fail(`${account.label}: ${parsed.error.issues[0]?.message ?? "invalid data"}`);
    }
    const body = parsed.data;

    const existing = await db.orm.public.User.where({ email: body.email }).first();
    if (existing) {
      console.log(`[skip]    ${body.email} already exists — left unchanged.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    await db.transaction(async (tx) => {
      const user = await tx.orm.public.User.create({
        email: body.email,
        passwordHash,
        managementRole: account.managementRole,
      });
      await tx.orm.public.Profile.create({
        userId: user.id,
        firstName: body.firstName,
        lastName: body.lastName,
        displayName: `${body.firstName} ${body.lastName}`.trim(),
        phone: null,
      });
    });

    console.log(`[created] ${body.email} (${account.label}).`);
  }
} finally {
  await db.close?.();
}
process.exit(0);
