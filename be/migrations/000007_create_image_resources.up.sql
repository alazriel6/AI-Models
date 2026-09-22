CREATE TABLE IF NOT EXISTS image_resources (
    image_id    INTEGER NOT NULL REFERENCES model_images(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    weight      DOUBLE PRECISION DEFAULT 0,

    PRIMARY KEY (image_id, resource_id)
);

CREATE INDEX idx_image_resources_image_id ON image_resources(image_id);
CREATE INDEX idx_image_resources_resource_id ON image_resources(resource_id);
