-- Migration V7: Atomic Wallet Increments
-- Description: Adds a Postgres function to increment wallet balances atomically, preventing race conditions.
-- Author: Antigravity (SRE/DevOps)

CREATE OR REPLACE FUNCTION increment_wallet(row_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + amount 
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Verify the function is created
COMMENT ON FUNCTION increment_wallet IS 'Atomically increments a users wallet_balance to prevent race conditions during concurrent top-ups.';
