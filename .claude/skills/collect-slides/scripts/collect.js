// X の検索結果ページで実行する収集スクリプト。
// javascript_tool にこのファイルの中身をそのまま渡す。CDP の 45 秒タイムアウトを避けるため、
// 非同期で走らせて即座に 'started' を返す。完了は `window.__done` をポーリングして確認する。
// 結果は sessionStorage の '__jsc' に、ポスト ID（/user/status/123）をキーとして蓄積される。
// 同じタブで別の検索 URL に移動して再実行すれば、結果はマージされる。
(() => {
  window.__done = false;
  window.__n = 0;
  const store = JSON.parse(sessionStorage.getItem('__jsc') || '{}');
  const grab = () =>
    document.querySelectorAll('article[data-testid="tweet"]').forEach((a) => {
      const t = a.querySelector('a[href*="/status/"] time')?.closest('a');
      if (!t) return;
      const id = t.getAttribute('href');
      const user = a.querySelector('[data-testid="User-Name"]')?.innerText.replace(/\n/g, ' ') || '';
      const text = a.querySelector('[data-testid="tweetText"]')?.innerText || '';
      // t.co リンク。aria-label はリンクカードのタイトル（"speakerdeck.com タイトル" 形式）、
      // text は本文中の表示 URL（途中で … により省略される）。
      const links = [...a.querySelectorAll('a[href^="https://t.co"]')].map((l) => ({
        href: l.href,
        text: l.innerText.trim(),
        aria: l.getAttribute('aria-label'),
      }));
      store[id] = { id, user, time: t.querySelector('time').getAttribute('datetime'), text, links };
    });
  (async () => {
    await new Promise((r) => setTimeout(r, 2500));
    let last = -1, same = 0;
    for (let i = 0; i < 150 && same < 8; i++) {
      grab();
      window.scrollBy(0, 2500);
      await new Promise((r) => setTimeout(r, 1500));
      const n = Object.keys(store).length;
      same = n === last ? same + 1 : 0;
      last = n;
      window.__n = n;
      sessionStorage.setItem('__jsc', JSON.stringify(store));
    }
    grab();
    sessionStorage.setItem('__jsc', JSON.stringify(store));
    window.__done = true;
  })();
  return 'started';
})();
