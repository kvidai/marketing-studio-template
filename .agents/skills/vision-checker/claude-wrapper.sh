#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF' >&2
Usage: claude-wrapper.sh --prompt-file <file> --schema-file <file> --output-file <file> [--model <name>] [--permission-mode <mode>] -- <image-path>...

Runs `claude -p` with a stable wrapper prompt and writes the raw JSON result to the requested output file.
EOF
  exit 1
}

PROMPT_FILE=""
SCHEMA_FILE=""
OUTPUT_FILE=""
MODEL="${CLAUDE_VISION_MODEL:-}"
PERMISSION_MODE="${CLAUDE_VISION_PERMISSION_MODE:-bypassPermissions}"
declare -a IMAGE_PATHS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt-file)
      PROMPT_FILE="${2:-}"
      shift 2
      ;;
    --schema-file)
      SCHEMA_FILE="${2:-}"
      shift 2
      ;;
    --output-file)
      OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --permission-mode)
      PERMISSION_MODE="${2:-}"
      shift 2
      ;;
    --)
      shift
      IMAGE_PATHS=("$@")
      break
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

[[ -n "$PROMPT_FILE" && -f "$PROMPT_FILE" ]] || { echo "--prompt-file is required" >&2; usage; }
[[ -n "$SCHEMA_FILE" && -f "$SCHEMA_FILE" ]] || { echo "--schema-file is required" >&2; usage; }
[[ -n "$OUTPUT_FILE" ]] || { echo "--output-file is required" >&2; usage; }
[[ "${#IMAGE_PATHS[@]}" -gt 0 ]] || { echo "At least one image path is required after --" >&2; usage; }

for image_path in "${IMAGE_PATHS[@]}"; do
  [[ -f "$image_path" ]] || { echo "Image file not found: $image_path" >&2; exit 1; }
done

TMP_PROMPT="$(mktemp)"
trap 'rm -f "$TMP_PROMPT"' EXIT

cat "$PROMPT_FILE" > "$TMP_PROMPT"
{
  printf '\n\nInspect these image files from the workspace if possible:\n'
  for image_path in "${IMAGE_PATHS[@]}"; do
    printf '%s\n' "$image_path"
  done
} >> "$TMP_PROMPT"

mkdir -p "$(dirname "$OUTPUT_FILE")"

CLAUDE_ARGS=(
  -p
  --system-prompt ""
  --output-format json
  --json-schema "$(cat "$SCHEMA_FILE")"
  --permission-mode "$PERMISSION_MODE"
)

if [[ -n "$MODEL" ]]; then
  CLAUDE_ARGS+=(--model "$MODEL")
fi

# Run from /tmp so claude finds no CLAUDE.md files — reduces workspace context load
cd /tmp
claude "${CLAUDE_ARGS[@]}" "$(cat "$TMP_PROMPT")" > "$OUTPUT_FILE"
