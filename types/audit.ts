export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  resource: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
