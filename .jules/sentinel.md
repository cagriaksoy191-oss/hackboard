## 2025-02-24 - Unvalidated SQL Query Limit parameter
**Vulnerability:** `limit` query parameter on `GET /api/notifications` API endpoint allowed negative and large inputs. SQLite treats negative limit values as unbounded queries.
**Learning:** Negative `LIMIT` values bypassing restrictions to dump arbitrary amounts of data.
**Prevention:** Explicitly validate numeric inputs such as `limit`, ensuring they are strictly positive and reasonably capped.
