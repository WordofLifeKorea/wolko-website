/* WOLKO 포탈 앱(아이폰·안드로이드) 안에서만 쓰는 도우미.
   앱이 모든 wolko.org 페이지에 이 파일을 불러 넣는다(mobile/ 의 WolkoApp 도우미). 웹 브라우저에서는 아무 일도 하지 않는다.
   앱 화면은 웹 브라우저와 달라서 그대로 두면 아래 기능이 조용히 안 되거나 앱 밖으로 나간다.
   - 내려받기(a[download], blob:·data: 주소) → 파일로 저장한 뒤 휴대폰 공유·저장 창
   - 같은 사이트의 새 창(window.open, target=_blank) → 앱 안에서 이동 (아이폰은 그대로 두면 사파리로 나가 로그인이 풀린다)
   - 다른 사이트 → 휴대폰 브라우저
   - 인쇄(window.print) → 휴대폰 인쇄 창 (끝나면 afterprint 를 보내 화면을 되돌리게 한다)
   - 공유(navigator.share)가 없으면 휴대폰 공유 창으로 대신 */
(function () {
  var cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform() || window.__wolkoApp) return;
  window.__wolkoApp = true;
  var P = cap.Plugins || {};
  document.documentElement.classList.add('is-wolko-app');

  function sameSite(href) {
    try { var u = new URL(href, location.href); return u.origin === location.origin ? u : null; } catch (e) { return null; }
  }
  function isFileUrl(href) { return /^(blob|data):/i.test(String(href || '')); }
  function canceled(e) { return /cancel/i.test(String((e && (e.message || e.errorMessage)) || e || '')); }
  function fail() { alert('파일을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.'); }

  /* 페이지가 a.click() 바로 뒤에 revokeObjectURL 을 불러도 파일을 꺼낼 수 있게, 만든 blob 을 1분 동안 들고 있는다 */
  var blobs = new Map();
  var createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL;
  URL.createObjectURL = function (obj) {
    var url = createUrl.call(URL, obj);
    if (obj instanceof Blob) blobs.set(url, obj);
    return url;
  };
  URL.revokeObjectURL = function (url) {
    setTimeout(function () { blobs.delete(url); revokeUrl.call(URL, url); }, 60000);
  };

  var EXT = { 'text/csv': 'csv', 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx', 'text/plain': 'txt', 'application/zip': 'zip' };
  function fileName(name, href, blob) {
    var n = String(name || '').trim();
    if (!n && !isFileUrl(href)) { try { n = decodeURIComponent(new URL(href, location.href).pathname.split('/').pop() || ''); } catch (e) {} }
    n = n.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').slice(0, 120);
    if (!n) n = 'WOLKO-' + new Date().toISOString().slice(0, 10);
    var ext = EXT[(blob && blob.type || '').split(';')[0]];
    if (ext && !/\.[a-z0-9]{2,5}$/i.test(n)) n += '.' + ext;
    return n;
  }
  function toBase64(blob) {
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { no(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function writeFile(blob, name) {
    return toBase64(blob).then(function (data) {
      return P.Filesystem.writeFile({ path: 'wolko-files/' + name, data: data, directory: 'CACHE', recursive: true });
    }).then(function (r) { return r.uri; });
  }
  function getBlob(href) {
    if (blobs.has(href)) return Promise.resolve(blobs.get(href));
    return fetch(href).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.blob(); });
  }

  /* 파일 하나를 휴대폰 공유·저장 창으로 — 다른 사이트의 파일은 휴대폰 브라우저가 받게 넘긴다 */
  function openFile(href, name) {
    href = String(href || '');
    if (!href) return;
    if (!isFileUrl(href) && !sameSite(href)) { location.href = href; return; }
    if (!P.Filesystem || !P.Share) { location.href = href; return; }
    getBlob(href)
      .then(function (blob) { var n = fileName(name, href, blob); return writeFile(blob, n).then(function (uri) { return P.Share.share({ title: n, dialogTitle: n, files: [uri] }); }); })
      .catch(function (e) { if (!canceled(e)) fail(); });
  }
  function goTo(href) {
    href = String(href || '');
    if (!href || href === 'about:blank') return;
    if (isFileUrl(href)) { openFile(href, null); return; }
    var u = sameSite(href);
    location.href = u ? u.href : href;
  }
  function isFileLink(a) { return !!(a && a.href && (a.hasAttribute('download') || isFileUrl(a.getAttribute('href')))); }

  var nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (isFileLink(this)) { openFile(this.href, this.getAttribute('download')); return; }
    if (this.target === '_blank' && this.href) { goTo(this.href); return; }
    return nativeClick.call(this);
  };
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (isFileLink(a)) { e.preventDefault(); openFile(a.href, a.getAttribute('download')); return; }
    if (a.target === '_blank') { e.preventDefault(); goTo(a.href); }
  });

  /* window.open — 빈 창을 먼저 열고 나중에 주소를 넣는 코드(win.location = url)도 그대로 돌아가게 가짜 창을 돌려준다 */
  function fakeWindow() {
    var loc = { assign: goTo, replace: goTo };
    Object.defineProperty(loc, 'href', { get: function () { return 'about:blank'; }, set: goTo });
    var win = { closed: false, opener: null, focus: function () {}, blur: function () {}, close: function () { win.closed = true; },
      document: { write: function () {}, writeln: function () {}, open: function () {}, close: function () {} } };
    Object.defineProperty(win, 'location', { get: function () { return loc; }, set: goTo });
    return win;
  }
  window.open = function (url) {
    if (url) goTo(url);
    return fakeWindow();
  };

  /* 인쇄 */
  if (P.WolkoApp && typeof P.WolkoApp.printPage === 'function') {
    window.print = function () {
      window.dispatchEvent(new Event('beforeprint'));
      P.WolkoApp.printPage().catch(function () {}).then(function () { window.dispatchEvent(new Event('afterprint')); });
    };
  }

  /* 공유 — 안드로이드 앱 화면에는 navigator.share 가 없다 */
  if (!navigator.share && P.Share) {
    navigator.canShare = function () { return true; };
    navigator.share = function (data) {
      data = data || {};
      var files = Array.prototype.slice.call(data.files || []);
      return Promise.all(files.map(function (f) { return writeFile(f, fileName(f.name, '', f)); }))
        .then(function (uris) {
          var opts = { title: data.title, text: data.text, url: data.url, dialogTitle: data.title };
          if (uris.length) opts.files = uris;
          return P.Share.share(opts);
        })
        .then(function () {}, function (e) {
          var err = new Error(canceled(e) ? 'Share canceled' : String((e && e.message) || e));
          err.name = canceled(e) ? 'AbortError' : 'Error';
          throw err;
        });
    };
  }
})();
