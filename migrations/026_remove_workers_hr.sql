-- Migration 026: Remove Workers / HR / Time Tracking feature entirely

-- Drop tables with FK dependencies first (FK checks disabled by migration runner)
DROP TABLE IF EXISTS piece_assignments;
DROP TABLE IF EXISTS time_entries;
DROP TABLE IF EXISTS project_workers;
DROP TABLE IF EXISTS workers;

-- Remove hr role
DELETE FROM roles WHERE name = 'hr';

-- Remove hr users
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role_id NOT IN (SELECT id FROM roles));
DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM users WHERE role_id NOT IN (SELECT id FROM roles));
DELETE FROM user_notifications WHERE user_id IN (SELECT id FROM users WHERE role_id NOT IN (SELECT id FROM roles));
DELETE FROM users WHERE role_id NOT IN (SELECT id FROM roles);
