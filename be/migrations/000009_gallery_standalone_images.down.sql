ALTER TABLE model_images
    DROP COLUMN IF EXISTS model_name;

ALTER TABLE model_images
    ALTER COLUMN model_id SET NOT NULL;
