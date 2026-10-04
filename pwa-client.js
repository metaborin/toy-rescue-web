(() => {
  'use strict';
  const script = document.currentScript;
  const base = new URL('.', script.src);
  const title = script.dataset.pwaTitle || document.title;
  let registration, installPrompt, transfer, worker, ready = false;
  const mb = bytes => (bytes / 1024 / 1024).toFixed(1);
  const toggle = document.createElement('button');
  toggle.id = 'pwa-toggle'; toggle.type = 'button'; toggle.textContent = 'アプリ・オフライン';
  toggle.setAttribute('aria-haspopup', 'dialog'); toggle.setAttribute('aria-controls', 'pwa-panel');
  const panel = document.createElement('dialog'); panel.id = 'pwa-panel'; panel.setAttribute('aria-labelledby', 'pwa-heading');
  panel.innerHTML = `<form method="dialog"><button class="pwa-close" aria-label="アプリ設定を閉じる">×</button></form>
    <p class="pwa-eyebrow">この端末で あそぶ</p><h2 id="pwa-heading"></h2>
    <p id="pwa-status" role="status" aria-live="polite">保存機能を準備しています…</p>
    <div id="pwa-progress-area" hidden><progress id="pwa-progress" max="100" value="0" aria-label="オフライン保存の進み具合"></progress><p id="pwa-progress-text"></p></div>
    <div class="pwa-actions"><button id="pwa-download" type="button" disabled>オフライン用に保存</button><button id="pwa-cancel" type="button" hidden>保存を中断</button><button id="pwa-install" type="button" disabled>アプリを追加</button><button id="pwa-check" type="button" disabled>更新を確認</button></div>
    <p id="pwa-update-note" class="pwa-update" hidden>新しい版があります。保存が完了したら、ゲームを終えてこのアプリのタブ・ウィンドウをすべて閉じ、開き直してください。途中で自動的に切り替えることはありません。</p>
    <p class="pwa-help">通信できるときに「保存」を完了すると、次から通信なしで開けます。途中で中断してもセーブや保存済みの版は消しません。</p>
    <p id="pwa-install-note" class="pwa-help">対応ブラウザのメニューから「アプリをインストール／ホーム画面に追加」も選べます。追加だけではオフライン保存は完了しません。</p>
    <p class="pwa-help">端末の空き容量やブラウザの判断で保存が消える場合があります。ブラウザのサイトデータを削除すると、ゲームの記録も消えます。</p>`;
  document.body.append(toggle, panel);
  if (script.dataset.pwaApp === 'manabi-bridge-adventure') {
    const overlay = document.querySelector('#overlay');
    if (overlay) {
      const placeInMenu = () => {
        const menu = overlay.querySelector('.title-content, .menu-panel, .help-panel');
        const parent = menu || document.body;
        if (toggle.parentElement !== parent) parent.append(toggle);
        toggle.classList.toggle('pwa-menu-button', !!menu);
      };
      new MutationObserver(placeInMenu).observe(overlay, { childList: true, subtree: true });
      placeInMenu();
    }
  }
  const el = id => panel.querySelector(`#${id}`);
  el('pwa-heading').textContent = title;
  const tell = text => { el('pwa-status').textContent = text; };
  const controls = busy => {
    el('pwa-download').disabled = busy || !worker;
    el('pwa-check').disabled = busy || !registration;
    el('pwa-cancel').hidden = !transfer;
    el('pwa-install').disabled = busy || !ready || !installPrompt;
  };
  toggle.addEventListener('click', () => {
    // Existing blur handlers clear held keys / pause gameplay before the modal takes focus.
    if (document.pointerLockElement) document.exitPointerLock();
    window.dispatchEvent(new Event('blur'));
    panel.showModal();
    panel.querySelector('.pwa-close').focus();
    if (registration && !transfer) refresh().catch(() => tell('保存状態を確認できませんでした。「更新を確認」でお試しください。'));
  });
  // Do not let dialog navigation also move/jump/interact in any of the games.
  for (const type of ['keydown', 'keyup', 'keypress']) window.addEventListener(type, event => {
    if (!panel.open) return;
    if (type === 'keydown' && event.code === 'Tab') {
      const buttons = [...panel.querySelectorAll('button')].filter(button => !button.disabled && button.getClientRects().length);
      const first = buttons[0], last = buttons.at(-1), active = document.activeElement;
      if (!panel.contains(active) || (!event.shiftKey && active === last)) { event.preventDefault(); first?.focus(); }
      else if (event.shiftKey && active === first) { event.preventDefault(); last?.focus(); }
    }
    event.stopImmediatePropagation();
  }, true);
  panel.addEventListener('close', () => toggle.focus());
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event; controls(!!transfer);
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null; el('pwa-install-note').textContent = 'アプリを追加しました。オフラインで開く前に保存を完了してください。'; controls(!!transfer);
  });
  if (matchMedia('(display-mode: standalone)').matches) el('pwa-install-note').textContent = 'アプリとして開いています。通信なしで使う前に、オフライン保存を完了してください。';
  function request(target, type) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('timeout')); }, 10000);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      target.postMessage({ type }, [channel.port2]);
    });
  }
  async function refresh() {
    worker = registration.waiting || registration.active;
    if (!worker) { tell('保存機能を準備しています…'); controls(false); return; }
    const state = await request(worker, 'STATUS');
    ready = state.ready || state.previousReady;
    const updated = !!registration.waiting || (state.previousReady && !state.ready);
    el('pwa-update-note').hidden = !updated;
    el('pwa-download').textContent = state.ready ? '保存済みを確認' : updated ? '新しい版を保存' : `オフライン用に保存（約${mb(state.bytes)} MB）`;
    if (state.downloading) {
      tell('オフライン用のファイルを保存しています。');
      if (state.progress) showProgress(state.progress);
    } else if (state.ready) {
      tell(updated ? '新しい版を保存しました。ゲームを終えてアプリを閉じ、開き直すと使えます。' : 'オフラインの準備ができました。次から通信なしで開けます。');
    } else tell(state.previousReady ? '保存済みの版はオフラインで遊べます。新しい版はまだ保存されていません。' : `ゲームに必要な約${mb(state.bytes)} MBを保存します。通信できる場所で準備してください。`);
    controls(state.downloading);
  }
  function showProgress(message) {
    const percent = Math.min(100, Math.floor(message.loaded / message.total * 100));
    el('pwa-progress-area').hidden = false; el('pwa-progress').value = percent;
    el('pwa-progress-text').textContent = `${percent}% · ${mb(message.loaded)} / ${mb(message.total)} MB · ${message.done} / ${message.count} ファイル${message.phase === 'verify' ? '（確認中）' : ''}`;
    toggle.textContent = `保存中 ${percent}%`;
  }
  el('pwa-download').addEventListener('click', async () => {
    if (!worker || transfer) return;
    const target = worker; const id = crypto.randomUUID();
    const channel = new MessageChannel(); transfer = { id, target, port: channel.port1 };
    tell('保存を始めています…'); controls(true);
    try { await navigator.storage?.persist?.(); } catch { /* Optional persistence is not required. */ }
    channel.port1.onmessage = async event => {
      const message = event.data;
      if (message.type === 'PROGRESS') { showProgress(message); return; }
      if (!['COMPLETE', 'CANCELLED', 'ERROR'].includes(message.type)) return;
      channel.port1.close(); transfer = null; toggle.textContent = 'アプリ・オフライン';
      try { await refresh(); } catch { controls(false); }
      if (message.type !== 'COMPLETE') tell(message.message);
    };
    target.postMessage({ type: 'DOWNLOAD', id }, [channel.port2]);
  });
  const cancel = () => { if (transfer) transfer.target.postMessage({ type: 'CANCEL', id: transfer.id }); };
  el('pwa-cancel').addEventListener('click', () => { cancel(); tell('保存を中断しています…'); });
  window.addEventListener('pagehide', cancel);
  el('pwa-install').addEventListener('click', async () => {
    if (!installPrompt || !ready) return;
    await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; controls(!!transfer);
  });
  el('pwa-check').addEventListener('click', async () => {
    tell('更新を確認しています…');
    try { await registration.update(); await refresh(); }
    catch { tell('通信できないため更新を確認できません。保存済みの版はそのまま使えます。'); }
  });
  async function initialize() {
    if (!isSecureContext || !('serviceWorker' in navigator) || !('caches' in window)) {
      tell('この環境ではアプリ保存を使えません。HTTPSの公開URLを対応ブラウザで開いてください。オンラインのゲームはそのまま遊べます。'); return;
    }
    try {
      registration = await navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname, updateViaCache: 'none' });
      const watch = candidate => {
        candidate?.addEventListener('statechange', () => { if (['installed', 'activated'].includes(candidate.state) && !transfer) refresh().catch(() => {}); });
      };
      registration.addEventListener('updatefound', () => watch(registration.installing)); watch(registration.installing);
      await navigator.serviceWorker.ready; await refresh();
    } catch { tell('保存機能を読み込めませんでした。通信とブラウザの設定を確認してください。オンラインではそのまま遊べます。'); }
  }
  initialize();
})();
