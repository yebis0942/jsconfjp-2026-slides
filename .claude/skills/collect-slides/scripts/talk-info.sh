#!/bin/sh
# 公式サイトからトーク情報を取得する。
# usage:
#   talk-info.sh --list          スケジュールに載っている全トークの slug を列挙
#   talk-info.sh SLUG [SLUG...]  slug ごとに「slug<TAB>タイトル<TAB>開始 - 終了 種別 トラック 言語」を出力
BASE=https://jsconf.jp/2026/ja
if [ "$1" = "--list" ]; then
  curl -sL "$BASE/schedule" | grep -o 'talks/[a-zA-Z0-9_-]*' | sed 's|talks/||' | sort -u
  exit 0
fi
for p in "$@"; do
  html=$(curl -sL "$BASE/talks/$p")
  title=$(printf '%s' "$html" | grep -o '<title>[^<]*' | head -1 | sed 's/<title>//; s/ | JSConf JP 2026$//')
  slot=$(printf '%s' "$html" | sed 's/<[^>]*>/\n/g' | sed 's/^[[:space:]]*//' | grep -v '^$' |
    awk '/^[0-9]{1,2}:[0-9]{2}$/ && !f {f=1} f && n<6 {printf "%s ", $0; n++}')
  printf '%s\t%s\t%s\n' "$p" "$title" "$slot"
done
