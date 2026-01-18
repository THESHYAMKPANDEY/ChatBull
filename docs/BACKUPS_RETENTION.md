# Backups, Retention, and Restore Drills (Production)

## MongoDB Backups (Recommended: MongoDB Atlas)
- Enable daily snapshots (or more frequent, based on your business needs).
- Enable Point-in-Time Recovery (PITR) if available on your cluster tier.
- Set snapshot retention to match your legal/compliance needs (commonly 7–35 days for consumer apps, longer for enterprise).
- Restrict who can download snapshots (least privilege).

## Restore Drill (Do This Regularly)
- Restore into a separate staging cluster (never restore into production directly).
- Verify:
  - Backend can connect and serve `/api/health`.
  - Core flows work: login sync, feed load, chat send/receive, private mode start/end.
- Document the recovery time (RTO) and recovery point (RPO).

## Application Retention Policies

### Private Mode Messages
- Stored in `PrivateMessage` and auto-deleted via TTL index (24 hours by default).

### Security Telemetry Events
- Stored in `SecurityEvent` and auto-deleted via TTL index (90 days).

### AI Chat History
- Stored in `AIMessage` and auto-deleted via TTL index using `expiresAt`.
- Control retention with environment variable:
  - `AI_MESSAGE_TTL_DAYS=365` (default)
  - `AI_MESSAGE_TTL_DAYS=0` disables TTL (no expiry will be set)

## Index Management
- Indexes are defined in Mongoose schemas.
- In production, indexes are not always created automatically.
- For controlled index creation, enable boot-time syncing:
  - `MONGODB_SYNC_INDEXES=true`
- After first successful deploy (or after planned schema/index changes), set it back to:
  - `MONGODB_SYNC_INDEXES=false`

## Data Protection Notes
- Store MongoDB credentials only in the deployment environment (Render/CI secrets), not in git.
- Use IP allowlisting and TLS for database connections.
- Prefer separate clusters for dev/staging/prod to avoid accidental data exposure.

