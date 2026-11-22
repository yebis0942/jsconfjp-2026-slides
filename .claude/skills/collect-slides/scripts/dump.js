// 収集結果を 1 リンク 1 行に整形してページ本文に書き出す。
// javascript_tool の戻り値は約 1000 文字で切り詰められるため、本文を置き換えてから
// get_page_text で読む。実行後の X のページは壊れるので、次の検索の前に navigate し直す。
//
// 実行前に window.__since（ISO 日付文字列、例 '2026-11-22'）と
// window.__known（index.html に掲載済みのポスト ID と rejected.yaml のポスト ID の配列）を設定しておくと絞り込める。
// IGNORE_DOMAINS に当たるリンクの行は出力しない（スライドではないことが明らかなもの）。
// window.__showAll = true にすると、このドメイン除外を無効にする。
//
// 出力形式: @user|tweetId|MM-DDTHH:MM(UTC)|t.coコード|カードタイトル|本文中の表示URL|本文先頭
(() => {
  // サブドメインも含めて除外する（例: connpass.com → esspec.connpass.com）。
  // github.io は除外しない（登壇者の Web スライドがある）。
  const IGNORE_DOMAINS = [
    'jsconf.jp', 'youtube.com', 'youtu.be', 'connpass.com', 'x.com', 'twitter.com',
    'developer.mozilla.org', 'developer.chrome.com', 'web.dev', 'github.com', 'npmjs.com',
    'tc39.es', 'nodejs.org', 'v8.dev', 'datatracker.ietf.org', 'w3.org', 'whatwg.org',
    'codecast-garapon.pages.dev',
  ];
  const ignored = (host) =>
    !window.__showAll && IGNORE_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  let skipped = 0;
  const s = JSON.parse(sessionStorage.getItem('__jsc') || '{}');
  const since = window.__since || '2000-01-01';
  const known = new Set(window.__known || []);
  const rows = [];
  for (const x of Object.values(s)) {
    if (x.time < since) continue;
    const tid = x.id.split('/').pop();
    if (known.has(tid)) continue;
    const cards = new Map();
    for (const l of x.links) {
      if (!cards.has(l.href)) cards.set(l.href, null);
      if (l.aria) cards.set(l.href, l.aria);
    }
    const disp = new Map(
      x.links
        .filter((l) => !l.aria && /^https?:\/\//.test(l.text))
        .map((l) => [l.href, l.text.replace(/\n/g, '').replace(/…$/, '')]),
    );
    const head = x.text.replace(/\s+/g, ' ').slice(0, 60);
    for (const [h, c] of cards) {
      const d = disp.get(h) || '';
      if (!c && !d) continue; // 画像・引用ポストなど
      // ホスト名は表示 URL から、なければカードタイトル先頭の "example.com" から取る。
      const host = (d || c.split(' ')[0]).replace(/^https?:\/\//, '').split('/')[0].toLowerCase().replace(/^www\./, '');
      if (ignored(host)) { skipped++; continue; }
      rows.push([
        x.user.match(/@\w+/)?.[0], tid, x.time.slice(5, 16),
        h.replace('https://t.co/', ''), (c || '').slice(0, 90), d.slice(0, 80), head,
      ].join('|'));
    }
  }
  rows.sort((a, b) => (a.split('|')[2] < b.split('|')[2] ? -1 : 1));
  document.body.innerHTML = '<article><pre id="dump"></pre></article>';
  document.getElementById('dump').textContent = rows.join('\n');
  return `${rows.length} rows, ${skipped} skipped by domain (stored tweets: ${Object.keys(s).length})`;
})();
