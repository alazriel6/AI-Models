-- Migration 000009: Support standalone gallery images without linked model
ALTER TABLE model_images
    ADD COLUMN IF NOT EXISTS model_name VARCHAR(255);

ALTER TABLE model_images
    ALTER COLUMN model_id DROP NOT NULL;
