-- Add parse_status and parsed_json to captures (listing-only enforcement)
ALTER TABLE captures ADD COLUMN parse_status TEXT DEFAULT 'ok';
ALTER TABLE captures ADD COLUMN parsed_json TEXT;
