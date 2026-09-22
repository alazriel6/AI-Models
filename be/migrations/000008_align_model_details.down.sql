DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS model_trigger_words;

ALTER TABLE model_images
    DROP COLUMN IF EXISTS scheduler;

ALTER TABLE models
    DROP COLUMN IF EXISTS source_url,
    DROP COLUMN IF EXISTS published_at,
    DROP COLUMN IF EXISTS likes,
    DROP COLUMN IF EXISTS rating,
    DROP COLUMN IF EXISTS tensor_size,
    DROP COLUMN IF EXISTS vram_min,
    DROP COLUMN IF EXISTS vram_recommended,
    DROP COLUMN IF EXISTS conditioner,
    DROP COLUMN IF EXISTS first_stage_model,
    DROP COLUMN IF EXISTS model_tensor;
