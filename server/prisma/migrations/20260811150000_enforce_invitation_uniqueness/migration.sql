-- The product previously had no invitation write path, so this constraint preserves
-- the single scaffolded record per group/email while making concurrent creation safe.
CREATE UNIQUE INDEX "Invitation_groupId_email_key" ON "Invitation"("groupId", "email");

-- Supports the authenticated invitee's pending, non-expired invitation query.
CREATE INDEX "Invitation_email_status_expiresAt_idx" ON "Invitation"("email", "status", "expiresAt");
