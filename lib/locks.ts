/**
 * Transaction-scoped PostgreSQL advisory locks.
 *
 * `tx` has no raw lane, but a plan built from `db.raw` runs inside a
 * transaction through `tx.execute`. Callers that touch the same key queue
 * behind each other, and the lock is released when the transaction ends.
 */
import { db } from "@/lib/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function advisoryXactLock(tx: Tx, key: string): Promise<void> {
  const plan = db.raw.sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`.affectedCount().build();
  await tx.execute(plan);
}
