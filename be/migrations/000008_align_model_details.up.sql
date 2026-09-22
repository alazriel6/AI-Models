-- Migration 000008: Align models, images, reviews, trigger words, and tensor info with FE UI

-- 1. Add missing fields to models
ALTER TABLE models
    ADD COLUMN IF NOT EXISTS source_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tensor_size VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vram_min VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vram_recommended VARCHAR(50),
    ADD COLUMN IF NOT EXISTS conditioner INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS first_stage_model INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS model_tensor INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_models_published_at ON models(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_models_likes ON models(likes DESC);
CREATE INDEX IF NOT EXISTS idx_models_rating ON models(rating DESC);

-- 2. Add scheduler to model_images for generation metadata
ALTER TABLE model_images
    ADD COLUMN IF NOT EXISTS scheduler VARCHAR(100);

-- 3. Create model_trigger_words table
CREATE TABLE IF NOT EXISTS model_trigger_words (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    trigger_word VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_trigger_words_model_id ON model_trigger_words(model_id);
CREATE INDEX IF NOT EXISTS idx_model_trigger_words_word ON model_trigger_words(trigger_word);

-- 4. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    reviewer VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_model_id ON reviews(model_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating DESC);
