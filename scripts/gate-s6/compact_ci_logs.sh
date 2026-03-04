#!/usr/bin/env bash
# Builds a compact CI log file from unzipped workflow run logs.
# Usage: compact_ci_logs.sh <logs_dir> <output_file>
# Enforces 12,000 character limit; keeps error-like lines + last 200 lines per log.

set -euo pipefail

LOGS_DIR="${1:-.}"
OUTPUT_FILE="${2:-artifacts/ci_compact_log.txt}"
MAX_CHARS=12000

# Patterns to keep (case-insensitive)
PATTERN='error|fail|failed|exception|assert|fatal|lint'

mkdir -p "$(dirname "$OUTPUT_FILE")"
TMP_ALL="$(mktemp)"
TMP_TAIL="$(mktemp)"
trap 'rm -f "$TMP_ALL" "$TMP_TAIL"' EXIT

while IFS= read -r -d '' f; do
  grep -iE "$PATTERN" "$f" >> "$TMP_ALL" 2>/dev/null || true
  tail -n 200 "$f" >> "$TMP_TAIL" 2>/dev/null || true
done < <(find "$LOGS_DIR" -type f -name "*.txt" -print0 2>/dev/null)

# Dedupe and merge: pattern lines first, then tail lines
sort -u "$TMP_ALL" >> "$TMP_TAIL" 2>/dev/null || true
# Enforce max char limit (truncate safely)
head -c "$MAX_CHARS" "$TMP_TAIL" > "$OUTPUT_FILE"

echo "Compact log written to $OUTPUT_FILE ($(wc -c < "$OUTPUT_FILE") chars)"
