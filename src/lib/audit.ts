import { activityLogs } from './db/schema';
import type { AppDb } from './db/client';

export interface AuditEvent {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function logActivity(db: AppDb, event: AuditEvent): Promise<void> {
  await db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    userId: event.userId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    metadata: event.metadata ?? null,
    ipAddress: event.ipAddress ?? null,
  });
}
