CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,

    name    VARCHAR(255) NOT NULL,
    type    VARCHAR(50)  NOT NULL,  -- checkpoint, lora, vae, embedding
    version VARCHAR(100),
    url     VARCHAR(500),

    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_name ON resources(name);
