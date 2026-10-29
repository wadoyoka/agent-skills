#!/usr/bin/env bash
#
# 静止画を 4 枚ずつ 2×2 の 1 枚（コンタクトシート）にまとめる。
# 1 枚ずつ開くより速く、シーンどうしの見た目の揃い方も比べられる。
#
# 使い方:
#   contact-sheet.sh <出力の接頭辞> <画像>...
#   例: contact-sheet.sh out/sheet out/stills/*.png
#       → out/sheet-1.png, out/sheet-2.png, ...
#
# 4 枚に満たない最後の組は、最後の画像を繰り返して埋める。
set -euo pipefail

if [ $# -lt 2 ]; then
  sed -n '3,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2
  exit 2
fi

prefix="$1"
shift
files=("$@")
n=1
for ((i = 0; i < ${#files[@]}; i += 4)); do
  a="${files[i]}"
  b="${files[i + 1]:-${files[${#files[@]} - 1]}}"
  c="${files[i + 2]:-${files[${#files[@]} - 1]}}"
  d="${files[i + 3]:-${files[${#files[@]} - 1]}}"
  ffmpeg -v error -y -i "$a" -i "$b" -i "$c" -i "$d" \
    -filter_complex "[0]scale=960:-2[a];[1]scale=960:-2[b];[2]scale=960:-2[c];[3]scale=960:-2[d];[a][b]hstack[t];[c][d]hstack[u];[t][u]vstack" \
    "$prefix-$n.png"
  echo "$prefix-$n.png: $(basename "$a") $(basename "$b") $(basename "$c") $(basename "$d")"
  n=$((n + 1))
done
