-- Private input snapshot for AI retries and public summary/coverage metadata.
ALTER TABLE items ADD COLUMN reddit_context TEXT;
ALTER TABLE items ADD COLUMN discussion TEXT;
