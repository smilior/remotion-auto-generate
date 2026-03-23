#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INPUT="${PROJECT_DIR}/output/narration.wav"
OUTPUT_DIR="${PROJECT_DIR}/output"

if [ ! -f "$INPUT" ]; then
  echo "Error: ${INPUT} not found. Run generate-tts.ts first."
  exit 1
fi

echo "Generating SRT subtitles with Whisper..."
echo "Input: ${INPUT}"

whisper "$INPUT" \
  --model small \
  --language ja \
  --output_format srt \
  --output_dir "$OUTPUT_DIR" \
  --word_timestamps True

# Whisper outputs as narration.srt
OUTPUT="${OUTPUT_DIR}/narration.srt"

if [ -f "$OUTPUT" ]; then
  echo ""
  echo "=== Generated SRT ==="
  cat "$OUTPUT"
  echo ""
  echo "Output: ${OUTPUT}"
  echo "Done!"
else
  echo "Error: SRT file was not generated"
  exit 1
fi
