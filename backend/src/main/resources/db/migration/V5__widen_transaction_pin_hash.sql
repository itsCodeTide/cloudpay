-- scrypt hashes contain a prefix, salt, and a hex digest and can exceed 100 characters.
ALTER TABLE users ALTER COLUMN transaction_pin_hash TYPE VARCHAR(255);
