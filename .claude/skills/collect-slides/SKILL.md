---
name: collect-slides
description: X（旧 Twitter）を Claude in Chrome で検索して JSConf JP 2026 の登壇スライドを収集し、index.html のまとめに追記して GitHub Pages に反映する。「スライドを再検索して」「新しいスライドを追加して」「まとめを更新して」と頼まれたときに使う。
---

# JSConf JP 2026 スライド収集

X の検索結果から登壇者が投稿したスライドのリンクを集め、`index.html` の `talks` 配列に追記する。
X はログインが必要なので、ユーザーの Chrome（Claude in Chrome）を使う。

## 前提

- `anthropic-skills:chrome-browser` スキルを先に読み、Chrome ツールを 1 回の ToolSearch でまとめて読み込む。
  必要なのは `tabs_context_mcp`, `tabs_create_mcp`, `tabs_close_mcp`, `navigate`, `javascript_tool`, `get_page_text`, `computer`。
- X にログインしていない（`/i/flow/login` や onboarding に飛ばされる）ときは、ユーザーにログインを頼んで待つ。パスワードは入力しない。
- 下記スクリプトのパスはこの SKILL.md からの相対パス（`scripts/...`）。

## 手順

### 1. 既存データの確認

`index.html` の `talks` 配列から、掲載済みの `tweet`（ポスト ID）と `slug` を控える。

```sh
grep -o 'tweet: "[0-9]*"' index.html | grep -o '[0-9]*'
```

### 2. X を検索して収集

`tabs_context_mcp` → `tabs_create_mcp` で新しいタブを作る。次の検索 URL を順に開き、それぞれで
`scripts/collect.js` の中身を `javascript_tool` に渡して実行する。スクリプトは非同期で走り、すぐ `started` を返す。
`computer` の `wait`（10 秒）を挟みながら `[window.__n, window.__done]` を確認し、`__done` が `true` になったら次の URL へ移る。
結果は sessionStorage に蓄積されるので、同じタブで URL を移動するだけでマージされる。

`SINCE` には前回の収集日の前日あたり（例: `2026-11-21`）を入れる。

1. `https://x.com/search?q=%23jsconfjp%20filter%3Alinks%20since%3ASINCE&f=live`
2. `https://x.com/search?q=JSConf%20(speakerdeck%20OR%20docswell%20OR%20%E3%82%B9%E3%83%A9%E3%82%A4%E3%83%89%20OR%20%E7%99%BA%E8%A1%A8%E8%B3%87%E6%96%99%20OR%20slides)%20since%3ASINCE&f=live`
3. `https://x.com/search?q=(%23jsconfjp_a%20OR%20%23jsconfjp_b%20OR%20%23jsconfjp_c%20OR%20%23jsconfjp_d)%20filter%3Alinks%20since%3ASINCE&f=live`

`#jsconfjp` だけの検索では、ハッシュタグ付きでも取りこぼす投稿がある。3 つとも回すこと。

### 3. 結果を読み出す

`javascript_tool` の戻り値は約 1000 文字で切り詰められるので、そのまま返さない。
まず `window.__since = 'SINCE'; window.__known = [手順1のIDの配列];` を実行し、続けて `scripts/dump.js` を実行する。
これでページ本文が 1 リンク 1 行の一覧に置き換わるので、`get_page_text` で読む。

行の形式: `@user|tweetId|MM-DDTHH:MM(UTC)|t.coコード|カードタイトル|本文中の表示URL|本文先頭`

### 4. スライドを選別する

スライドとして採用するもの:
- speakerdeck.com、docswell.com、docs.google.com/presentation、slideshare、登壇者自身の Web スライド（github.io、個人ドメインの `/slides/` や `/talks/` など）
- 登壇者本人が「資料です」「スライドです」と投稿したもの

採用しないもの:
- jsconf.jp のトークページ、YouTube 配信、connpass、企業ブログ告知、GitHub リポジトリ、デモサイト、MDN や仕様書など発表中の参照リンク
- 日付が古い資料（例: 2024 年の資料を参考として紹介しているだけのもの）
- 登壇者以外による紹介ポスト（本人の投稿が見つからない場合に限り、元のスライド URL を使ってよい）

### 5. URL の展開とトーク情報の補完

```sh
sh scripts/resolve-tco.sh CODE1 CODE2 ...        # t.co → 実 URL
sh scripts/talk-info.sh --list                   # 公式の全トーク slug
sh scripts/talk-info.sh SLUG1 SLUG2 ...          # タイトル・時間・種別・トラック・登壇者名
```

`speaker` には公式ページの登壇者名か X の表示名を使う。slug のローマ字から漢字表記を推測しないこと。

slug は登壇者名から推測できないことがある（例: @riya_amemiya → `yuta-nishi`）。
見つからないときは `sh scripts/talk-info.sh $(sh scripts/talk-info.sh --list) | grep キーワード` で全トークのタイトルから探す。
それでも特定できなければ `slug: null, time: null, track: null` で載せる（「時間未確認」グループに入る）。

### 6. index.html を更新する

- `talks` 配列に、既存エントリと同じ形でオブジェクトを追加する。並び順は開始時刻順、同時刻内はトラック順。
- 複数のスライド（日英両版、Web 版と Speaker Deck 版など）は `slides` 配列に並べる。最初の要素が強調表示される。
- 英語のトークには `lang: "English"` を付ける。
- フッターの「〇〇 JST 時点」の日時を、今回の収集時刻に更新する。

### 7. 確認と公開

1. `python3 -m http.server 8765 --bind 127.0.0.1` をバックグラウンドで起動し、Chrome で `http://127.0.0.1:8765/` を開いてスクリーンショットで表示を確認する（Chrome 拡張では `file://` は開けない）。
2. 確認が済んだらタブを閉じ、サーバーを止める。
3. `index.html` をコミットして `main` に push する。GitHub Pages（https://yebis0942.github.io/jsconfjp-2026-slides/）は push で自動更新される。
   `gh api repos/yebis0942/jsconfjp-2026-slides/pages/builds/latest --jq .status` が `built` になったら、`curl` で公開ページに反映されたことを確かめる。

### 8. 報告

追加したトーク（タイトル・登壇者）、採用を見送ったリンクとその理由、時間やトラックを特定できなかったものを伝える。
