-- ==========================================
-- SYSTEM LOGS & AUDIT SYSTEM (v3)
-- ==========================================

-- 1. Create the system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who performed the action
    event_type TEXT NOT NULL, -- e.g., 'AUTH_LOGIN', 'PAYMENT_SUCCESS', 'USER_DELETED', 'ROLE_CHANGE'
    severity TEXT CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')) DEFAULT 'INFO',
    message TEXT NOT NULL, -- Redact sensitive info here
    metadata JSONB DEFAULT '{}', -- Store context: IP, browser, affected_user_id
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_severity ON system_logs(severity);

-- 3. Initial "System Audit" activation logs
INSERT INTO system_logs (event_type, severity, message, metadata)
VALUES ('SYSTEM_INIT', 'INFO', 'Audit log system initialized successfully', '{"version": "1.0.0"}');

-- Note: RLS policies can be applied based on your specific security needs.
-- Normally only 'super_admin' role should have SELECT access.
