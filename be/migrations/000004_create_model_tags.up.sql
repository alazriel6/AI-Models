CREATE TABLE IF NOT EXISTS model_tags (
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

    PRIMARY KEY (model_id, tag_id)
);

CREATE INDEX idx_model_tags_model_id ON model_tags(model_id);
CREATE INDEX idx_model_tags_tag_id ON model_tags(tag_id);
