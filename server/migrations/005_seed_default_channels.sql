-- Migration 005: Seed Default Chat Channels
-- Adds additional default channels for the workspace to demonstrate the channel feature.
-- Only inserts if channels with these slugs don't already exist for workspace 1.

-- @sqlite-only
INSERT OR IGNORE INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Yazılım', 'yazilim', 'Yazılım geliştirme tartışmaları', 0);

-- @sqlite-only
INSERT OR IGNORE INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Tasarım', 'tasarim', 'UI/UX ve tasarım konuları', 0);

-- @sqlite-only
INSERT OR IGNORE INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Duyurular', 'duyurular', 'Önemli duyurular ve güncellemeler', 0);

-- @pg-only
INSERT INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Yazılım', 'yazilim', 'Yazılım geliştirme tartışmaları', 0)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- @pg-only
INSERT INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Tasarım', 'tasarim', 'UI/UX ve tasarım konuları', 0)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- @pg-only
INSERT INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Duyurular', 'duyurular', 'Önemli duyurular ve güncellemeler', 0)
ON CONFLICT (workspace_id, slug) DO NOTHING;
