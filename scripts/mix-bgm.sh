#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

VIDEO="${PROJECT_DIR}/output/video.mp4"
BGM="${PROJECT_DIR}/bgm/paulyudin-minimal-164833.mp3"
OUTPUT="${PROJECT_DIR}/output/final.mp4"

if [ ! -f "$VIDEO" ]; then
  echo "Error: ${VIDEO} not found. Run remotion render first."
  exit 1
fi

echo "Mixing BGM into video..."
echo "Video: ${VIDEO}"
echo "BGM:   ${BGM}"

ffmpeg -y \
  -i "$VIDEO" \
  -i "$BGM" \
  -filter_complex " \
    [1:a]atrim=0:30,afade=t=in:st=0:d=2,afade=t=out:st=27:d=3,volume=0.15[bgm]; \
    [0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[out] \
  " \
  -map 0:v -map "[out]" \
  -c:v copy \
  -c:a aac -b:a 192k \
  "$OUTPUT"

echo ""
echo "Output: ${OUTPUT}"
ffprobe -v quiet -show_entries format=duration,size -of default=noprint_wrappers=1 "$OUTPUT"
echo "Done!"
