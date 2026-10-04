'use strict';
// Generated release catalog. Rebuild this file whenever published assets change.
const RELEASE = {"version":"64ce4494fdf2fddd4062","bytes":16559857,"assets":[{"path":"Build/Publish.data.unityweb","bytes":8034202,"sha256":"69945e9930d217cfff45cefc631737c98c2a5e0bb2254f9545a39c9f11cd1684"},{"path":"Build/Publish.framework.js.unityweb","bytes":82796,"sha256":"6a3275a0e8d0f95df93af18bae852c7056c181db8c952e454a59e484da105fae"},{"path":"Build/Publish.loader.js","bytes":48540,"sha256":"e2a027f2c5d19688d20892b4a2e44817adba52dd67ee438df170638445919c41"},{"path":"Build/Publish.wasm.unityweb","bytes":8343970,"sha256":"d492f2cce6e4ea6972208e0868b3cd1a3aa186dc5411b95ce4c9f4c26e26dc77"},{"path":"OFL-NotoSansJP.txt","bytes":4301,"sha256":"6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2"},{"path":"THIRD-PARTY-NOTICES.txt","bytes":232,"sha256":"8f098c1b581cb9ec7371e893ee8531642a2828bb1fac77b0b7326a912e3bcb9e"},{"path":"icons/icon-192.png","bytes":3176,"sha256":"2d54d451093734f9b00ae600d5ccf62268daf73d07e055d401d167ec275fa5a0"},{"path":"icons/icon-512.png","bytes":7712,"sha256":"00a0160f95e5101eeb4360632c98cca44daf8bc194e9b33799ae0ba43d93aa21"},{"path":"index.html","bytes":10878,"sha256":"6a3656379a58f3510a56539fcd721f0d4e2c5647c4785c38adc1a21713f8a35a"},{"path":"manifest.webmanifest","bytes":694,"sha256":"ea0605810533328e982212f28bb2b7c3de7f4552317f47fb0ede06b1e0e165b9"},{"path":"pwa-client.js","bytes":10306,"sha256":"cdbf7d4869d1abdda048410911376980f94098438c1e9634bab5e107c0675f99"},{"path":"pwa.css","bytes":2184,"sha256":"f066dd16a1d1c7f66318155b6e0204ca88becd79db5d4ef9c8c19e85737810ac"},{"path":"title.css","bytes":4065,"sha256":"b0f6a4025afa79fd526effb2dd7a297eaab6da33756ce62abd2f38ba7de45b6d"},{"path":"title.js","bytes":6801,"sha256":"7b131cd4b15ed285eb0d5df14aa63b180a3513ef8cb72dd542b5e39ec4c59862"}]};
const ROOT = new URL(self.registration.scope);
const PREFIX = `games:${encodeURIComponent(ROOT.pathname)}:offline-v1:`;
const META = `games:${encodeURIComponent(ROOT.pathname)}:offline-control-v1`;
const CURRENT = PREFIX + RELEASE.version;
const READY = new URL('__pwa_ready__', ROOT).href;
const POINTER = new URL('__pwa_selected__', ROOT).href;
let job = null;
const assetURL = path => new URL(path, ROOT).href;
const owned = url => url.origin === ROOT.origin && url.pathname.startsWith(ROOT.pathname);
async function marker(name) {
  if (!name?.startsWith(PREFIX) || !(await caches.has(name))) return null;
  try { return await (await (await caches.open(name)).match(READY))?.json() || null; } catch { return null; }
}
async function completed() {
  const result = [];
  for (const name of await caches.keys()) {
    if (!name.startsWith(PREFIX)) continue;
    const info = await marker(name);
    if (info) result.push({ name, ...info });
  }
  return result.sort((a, b) => b.completedAt - a.completedAt);
}
async function select(name) {
  await (await caches.open(META)).put(POINTER, new Response(JSON.stringify({ name }), { headers: { 'Content-Type': 'application/json' } }));
}
async function selected() {
  const control = await caches.open(META);
  const pointer = await control.match(POINTER);
  let name;
  try { name = pointer && (await pointer.json()).name; } catch { /* Rebuild only this app's selection. */ }
  if (await marker(name)) return name;
  const fallback = (await completed())[0]?.name;
  if (fallback) await select(fallback);
  return fallback || null;
}
async function prune(beforeDownload = false) {
  if (job && !beforeDownload) return;
  const chosen = await selected();
  const ready = await completed();
  const keep = new Set([chosen, ...(ready.filter(x => x.name !== chosen).slice(0, 1).map(x => x.name))]);
  for (const name of await caches.keys()) {
    // Never delete another app's cache or touch localStorage / IndexedDB saves.
    if (name.startsWith(PREFIX) && !keep.has(name)) await caches.delete(name);
  }
}
self.addEventListener('install', event => {
  // Large game files are downloaded only after the user's explicit request.
  // No skipWaiting: an update waits until all old app windows are closed.
  event.waitUntil(Promise.resolve());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const name = await marker(CURRENT) ? CURRENT : (await completed())[0]?.name;
    if (name) await select(name);
    await prune();
    // Do not claim open pages or change a running game's controller.
  })());
});
async function navigationCache(event) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const others = windows.filter(client => owned(new URL(client.url)) && client.id !== event.clientId && client.id !== event.resultingClientId);
  // A completed package becomes selected at a fresh navigation only when no
  // other app window is running. This also covers an update prepared after activation.
  if (!others.length && await marker(CURRENT)) {
    await select(CURRENT);
    await prune();
  }
  return selected();
}
async function cachedResponse(cacheName, request, url) {
  if (!cacheName) return null;
  const path = url.pathname === ROOT.pathname ? 'index.html' : url.pathname.slice(ROOT.pathname.length);
  if (path.startsWith('__pwa_')) return null;
  const response = await (await caches.open(cacheName)).match(assetURL(path));
  if (!response || !request.headers.has('Range')) return response;
  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('Range'));
  if (!range) return response;
  const data = await response.arrayBuffer();
  const start = Number(range[1]); const end = Math.min(Number(range[2] || data.byteLength - 1), data.byteLength - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.byteLength}` } });
  return new Response(data.slice(start, end + 1), { status: 206, headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': `bytes ${start}-${end}/${data.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !owned(url) || url.pathname === new URL('sw.js', ROOT).pathname) return;
  event.respondWith((async () => {
    const name = event.request.mode === 'navigate' ? await navigationCache(event) : await selected();
    const response = await cachedResponse(name, event.request, url);
    if (response) return response;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode !== 'navigate') throw error;
      return new Response('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>通信を確認してください</title><body style="font-family:system-ui;max-width:34rem;margin:12vh auto;padding:24px;line-height:1.9"><h1>オフラインの準備がまだです</h1><p>通信できる場所で開き、「アプリ・オフライン」から保存を完了してください。セーブデータは消していません。</p><button onclick="location.reload()">もう一度開く</button></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  })());
});
function send(port, value) { try { port?.postMessage(value); } catch { /* A closed window cannot receive progress. */ } }
async function status() {
  const ready = await marker(CURRENT);
  return { type: 'STATUS', version: RELEASE.version, bytes: RELEASE.bytes, count: RELEASE.assets.length, ready: !!ready, previousReady: !!await selected(), downloading: !!job, progress: job?.progress || null };
}
async function download(port, id, clientId) {
  if (job) { send(port, { type: 'ERROR', message: '別のウィンドウで保存中です。そこで完了するか中断してください。' }); return; }
  const task = { id, clientId, controller: new AbortController(), cancelled: false, timedOut: false, progress: null };
  job = task;
  let timer;
  const resetTimeout = () => { clearTimeout(timer); timer = setTimeout(() => { task.timedOut = true; task.controller.abort(); }, 30_000); };
  let loaded = 0; let lastSent = 0;
  const progress = (file, done, phase, force = false) => {
    task.progress = { type: 'PROGRESS', loaded, total: RELEASE.bytes, done, count: RELEASE.assets.length, file, phase };
    if (force || Date.now() - lastSent > 180) { send(port, task.progress); lastSent = Date.now(); }
  };
  try {
    if (await marker(CURRENT)) { send(port, { type: 'COMPLETE', version: RELEASE.version }); return; }
    // This is only an incomplete package for this exact app/release.
    await caches.delete(CURRENT);
    // A long-running window may see several successive updates. Bound retained
    // complete packages before reserving another one, while preserving the selected game.
    await prune(true);
    const estimate = await self.navigator.storage?.estimate?.();
    const required = Math.ceil(RELEASE.bytes * 1.15) + 8 * 1024 * 1024;
    if (estimate?.quota && estimate.quota - (estimate.usage || 0) < required) throw new Error('端末の空き容量が足りません。不要なファイルなどを整理してから、もう一度保存してください。保存済みの版とセーブは残っています。');
    const cache = await caches.open(CURRENT);
    for (let index = 0; index < RELEASE.assets.length; index++) {
      if (task.controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!await self.clients.get(clientId)) { task.cancelled = true; task.controller.abort(); throw new DOMException('Window closed', 'AbortError'); }
      const asset = RELEASE.assets[index]; const url = assetURL(asset.path);
      if (!owned(new URL(url))) throw new Error('保存対象のパスを確認できませんでした。');
      progress(asset.path, index, 'download', true); resetTimeout();
      const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', signal: task.controller.signal });
      if (!response.ok || response.type === 'opaque' || response.redirected) throw new Error('通信に失敗しました。接続を確認し、もう一度保存してください。');
      if (!response.body) throw new Error('このブラウザでは保存できません。Chrome または Edge の最新版でお試しください。');
      const reader = response.body.getReader(); let fileBytes = 0;
      const headers = new Headers(response.headers); headers.delete('Content-Encoding'); headers.delete('Content-Length');
      const stream = new ReadableStream({
        async pull(controller) {
          try {
            if (task.controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
            const chunk = await reader.read();
            if (chunk.done) { controller.close(); return; }
            fileBytes += chunk.value.byteLength; loaded += chunk.value.byteLength;
            if (fileBytes > asset.bytes) throw new Error('更新中のファイルを検出しました。少し待ってから、もう一度保存してください。');
            resetTimeout(); progress(asset.path, index, 'download'); controller.enqueue(chunk.value);
          } catch (error) { await reader.cancel().catch(() => {}); controller.error(error); }
        },
        cancel() { return reader.cancel(); },
      });
      await cache.put(url, new Response(stream, { status: 200, headers }));
      progress(asset.path, index, 'verify', true);
      const data = await (await cache.match(url)).arrayBuffer();
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(x => x.toString(16).padStart(2, '0')).join('');
      if (fileBytes !== asset.bytes || digest !== asset.sha256) throw new Error('ファイルの確認に失敗しました。更新が落ち着いてから、もう一度保存してください。');
    }
    if (task.controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await cache.put(READY, new Response(JSON.stringify({ version: RELEASE.version, bytes: RELEASE.bytes, count: RELEASE.assets.length, completedAt: Date.now() }), { headers: { 'Content-Type': 'application/json' } }));
    progress('', RELEASE.assets.length, 'complete', true);
    send(port, { type: 'COMPLETE', version: RELEASE.version });
  } catch (error) {
    if (!await marker(CURRENT)) await caches.delete(CURRENT);
    const message = task.cancelled ? '保存を中断しました。保存済みの版とセーブは残っています。' : task.timedOut ? '通信が止まったため保存を中断しました。接続を確認して、もう一度お試しください。' : error.name === 'QuotaExceededError' ? '保存容量が足りません。空き容量を増やしてからお試しください。セーブは消していません。' : error.message || '保存できませんでした。接続と空き容量を確認してください。';
    send(port, { type: task.cancelled ? 'CANCELLED' : 'ERROR', message });
  } finally { clearTimeout(timer); job = null; }
}
self.addEventListener('message', event => {
  if (!event.source?.url || !owned(new URL(event.source.url))) return;
  const message = event.data || {}; const port = event.ports[0];
  if (message.type === 'STATUS') event.waitUntil(status().then(value => send(port, value)));
  if (message.type === 'DOWNLOAD') event.waitUntil(download(port, message.id, event.source.id));
  if (message.type === 'CANCEL' && job?.id === message.id && job.clientId === event.source.id) { job.cancelled = true; job.controller.abort(); }
});
