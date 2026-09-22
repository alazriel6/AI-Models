CREATE TABLE IF NOT EXISTS models (
    id SERIAL PRIMARY KEY,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,

    type VARCHAR(100) NOT NULL,
    base_model VARCHAR(255),

    description TEXT,
    author VARCHAR(255),

    civitai_url VARCHAR(500),
    huggingface_url VARCHAR(500),
    thumbnail_url VARCHAR(500),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_models_type ON models(type);
CREATE INDEX idx_models_base_model ON models(base_model);
CREATE INDEX idx_models_author ON models(author);
CREATE INDEX idx_models_created_at ON models(created_at DESC);
