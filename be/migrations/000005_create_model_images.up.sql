CREATE TABLE IF NOT EXISTS model_images (
    id SERIAL PRIMARY KEY,

    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,

    image_path VARCHAR(500),
    image_url  VARCHAR(500),
    caption    VARCHAR(500),

    width  INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,

    -- Structured generation metadata
    positive_prompt TEXT,
    negative_prompt TEXT,
    seed            BIGINT DEFAULT 0,
    steps           INTEGER DEFAULT 0,
    cfg_scale       DOUBLE PRECISION DEFAULT 0,
    sampler         VARCHAR(100),
    clip_skip       INTEGER DEFAULT 0,

    -- Hires settings
    hires_upscale    DOUBLE PRECISION DEFAULT 0,
    hires_steps      INTEGER DEFAULT 0,
    hires_upscaler   VARCHAR(100),
    denoising_strength DOUBLE PRECISION DEFAULT 0,

    -- Flexible metadata (tool-specific)
    raw_metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_images_model_id ON model_images(model_id);
