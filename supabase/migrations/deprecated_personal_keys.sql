-- Migration: Deprecate Personal AI Keys
-- Reason: Centralizing AI key management to Super Admin pool for better governance and security.

ALTER TABLE profiles DROP COLUMN IF EXISTS gemini_keys;
