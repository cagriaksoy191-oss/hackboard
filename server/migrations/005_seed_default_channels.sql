-- Migration 005: Seed Default Chat Channels
-- Adds additional default channels for the workspace to demonstrate the channel feature.
-- Only inserts if channels with these slugs don't already exist for workspace 1.

INSERT OR IGNORE INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Yazılım', 'yazilim', 'Yazılım geliştirme tartışmaları', 0);

INSERT OR IGNORE INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Tasarım', 'tasarim', 'UI/UX ve tasarım konuları', 0);

INSERT OR IGNORE INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'Duyurular', 'duyurular', 'Önemli duyurular ve güncellemeler', 0);
