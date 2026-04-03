-- ==========================================
-- ATOMIC WALLET ATOMIC INCREMENT (v4.1)
-- ==========================================

-- Create a function to safely increment user balance
CREATE OR REPLACE FUNCTION increment_wallet_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET wallet_balance = wallet_balance + amount,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
