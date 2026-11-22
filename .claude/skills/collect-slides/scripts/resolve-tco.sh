#!/bin/sh
# t.co の短縮コードを実 URL に展開する。
# usage: resolve-tco.sh CODE [CODE...]
for c in "$@"; do
  printf '%s %s\n' "$c" "$(curl -s -o /dev/null -w '%{redirect_url}' "https://t.co/$c")"
done
