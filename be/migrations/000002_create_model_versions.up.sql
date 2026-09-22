CREATE TABLE IF NOT EXISTS model_versions (
    id SERIAL PRIMARY KEY,

    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,

    version_name VARCHAR(100) NOT NULL,
    version_number VARCHAR(50),

    file_name VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    format VARCHAR(50),

    download_url VARCHAR(500),
    civitai_version_url VARCHAR(500),

    recommended_settings JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_versions_model_id ON model_versions(model_id);
