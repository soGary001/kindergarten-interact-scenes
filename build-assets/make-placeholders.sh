#!/usr/bin/env bash
set -euo pipefail
DIR="public/assets/img"
mkdir -p "$DIR"

scene() { # name, bg-fill
  printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="%s"/><text x="800" y="80" font-size="44" text-anchor="middle" fill="#999">%s (placeholder)</text></svg>' "$2" "$1" > "$DIR/scene-$1.svg"
}
emoji() { # filename, emoji, viewbox
  printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s"><text x="50%%" y="78%%" font-size="100" text-anchor="middle">%s</text></svg>' "$3" "$2" > "$DIR/$1.svg"
}

scene "living-room" "#FFF7E6"
scene "boy-room"     "#E8F7FF"
scene "girl-outdoor" "#EAF7EA"

emoji "char-grandma" "👵" "200 260"
emoji "char-boy"     "👦" "200 260"
emoji "char-girl"    "👧" "200 260"
emoji "char-dad"     "👨" "200 260"
emoji "char-mom"     "👩" "200 260"

emoji "item-glasses"   "👓" "120 120"
emoji "item-football"  "⚽" "120 120"
emoji "item-toys"      "🧸" "120 120"
emoji "item-puppy"     "🐶" "120 120"
emoji "item-kitten"    "🐱" "120 120"
emoji "item-keys"      "🔑" "120 120"
emoji "item-wallet"    "👛" "120 120"
emoji "item-newspaper" "📰" "120 120"
emoji "item-handbag"   "👜" "120 120"
emoji "item-necklace"  "📿" "120 120"
emoji "item-ring"      "💍" "120 120"

echo "✓ wrote placeholder SVGs to $DIR"
