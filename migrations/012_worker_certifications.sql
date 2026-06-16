-- Phase 2: Worker Safety & Certification Tracking

ALTER TABLE workers ADD COLUMN ssm_expiry_date TEXT;
ALTER TABLE workers ADD COLUMN psi_expiry_date TEXT;
ALTER TABLE workers ADD COLUMN medical_expiry_date TEXT;
