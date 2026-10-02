(function () {
  const $ = id => document.getElementById(id);
  const tokenKey = 'wolko-hub-token';
  const requestedVehicle = new URLSearchParams(location.search).get('vehicle');
  /* ── 한/영 (차량 스케줄 페이지와 같은 wolkoCarLang 설정을 공유) ── */
  const I18N = {
    ko: {
      pageTitle: '차량 스케줄', docTitle: '차량 사용 일지 — WOLKO', menuLabel: '차량 메뉴',
      tabReservations: '예약현황', tabMaintenance: '정비 관리', tabLog: '사용 일지',
      h1: '차량 사용 일지', intro: '운행 전 사진 한 장으로 사용 시각과 목적을 남깁니다.', loading: '일지를 불러오는 중…',
      loginTitle: '포탈 로그인', loginHelp: '차량 QR을 새 탭에서 열었다면 다시 로그인해야 할 수 있습니다. 기록자는 로그인 계정으로 자동 저장됩니다.',
      email: '이메일', password: '비밀번호', loginBtn: '로그인하고 계속하기',
      recordTitle: '운행 전 기록', recorder: '기록자', vehicleLabel: '차량 선택', purposeLegend: '사용 목적', ministry: '사역용', personal: '개인용',
      photoTitle: '운행 전 사진', photoHelp: '계기판이나 차량 상태가 보이도록 찍어 주세요. 사용 목적을 고르면 카메라를 열 수 있습니다.',
      photoBtn: '카메라 열기 · 사진 선택', save: '사용 일지 저장', saving: '저장 중…',
      historyTitle: '최근 사용 내역', historyHelp: '기록은 로그인 계정과 함께 저장됩니다. 사진은 포탈 사용자만 볼 수 있습니다.',
      qrTitle: '차량에 부착할 QR 코드', qrHelp: '고정 차량의 코드를 인쇄해 각 차량에 부착하세요. 스캔하면 해당 차량이 자동 선택됩니다.', qrPrint: 'QR 코드 인쇄',
      photoDialog: '차량 사진', closePhoto: '사진 닫기',
      pickVehicle: '차량을 선택해 주세요', noEntries: '아직 등록된 사용 기록이 없습니다.', viewPhoto: '사진 보기',
      useMinistry: '사역용', usePersonal: '개인용', timeExif: '사진 촬영 시각', timeSaved: '기록 시각',
      connectFail: '일지 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.', loadFail: '일지를 불러오지 못했습니다.',
      photoOpenFail: '사진을 열지 못했습니다.', resizeFail: '사진 크기를 줄이지 못했습니다. 다른 사진을 선택해 주세요.',
      loginFail: '로그인하지 못했습니다.', photoDiff: '사진 촬영 시각이 오늘과 다릅니다. 운행 전 사진을 새로 찍어 주세요.',
      photoOld: '오래된 사진입니다. 운행 전 사진을 새로 찍어 주세요.', photoReadFail: '사진을 읽지 못했습니다.',
      photoTaken: t => `사진 촬영: ${t} (사진 정보 기준)`, photoNoTime: '사진에 촬영 시각 정보가 없어 저장 시각으로 기록됩니다.',
      saved: '사용 일지가 저장됐습니다.', saveFail: '저장하지 못했습니다.',
    },
    en: {
      pageTitle: 'Vehicle Schedule', docTitle: 'Vehicle Usage Log — WOLKO', menuLabel: 'Vehicle menu',
      tabReservations: 'Reservations', tabMaintenance: 'Maintenance', tabLog: 'Usage Log',
      h1: 'Vehicle Usage Log', intro: 'Leave the time and purpose of use with a single pre-drive photo.', loading: 'Loading the log…',
      loginTitle: 'Portal Login', loginHelp: 'If you opened the vehicle QR in a new tab you may need to log in again. The recorder is saved automatically from your account.',
      email: 'Email', password: 'Password', loginBtn: 'Log in and continue',
      recordTitle: 'Pre-drive record', recorder: 'Recorder', vehicleLabel: 'Vehicle', purposeLegend: 'Purpose of use', ministry: 'Ministry', personal: 'Personal',
      photoTitle: 'Pre-drive photo', photoHelp: 'Take a photo that shows the dashboard or the vehicle condition. Choose the purpose first to open the camera.',
      photoBtn: 'Open camera · choose photo', save: 'Save usage log', saving: 'Saving…',
      historyTitle: 'Recent usage', historyHelp: 'Records are saved with your account. Photos are visible only to portal users.',
      qrTitle: 'QR codes for the vehicles', qrHelp: 'Print the code for each fixed vehicle and attach it. Scanning selects that vehicle automatically.', qrPrint: 'Print QR codes',
      photoDialog: 'Vehicle photo', closePhoto: 'Close photo',
      pickVehicle: 'Select a vehicle', noEntries: 'No usage records yet.', viewPhoto: 'View photo',
      useMinistry: 'Ministry', usePersonal: 'Personal', timeExif: 'photo taken', timeSaved: 'recorded',
      connectFail: 'Could not reach the log service. Please try again shortly.', loadFail: 'Could not load the log.',
      photoOpenFail: 'Could not open the photo.', resizeFail: 'Could not shrink the photo. Please choose another one.',
      loginFail: 'Could not log in.', photoDiff: 'The photo was not taken today. Please take a new pre-drive photo.',
      photoOld: 'This photo is old. Please take a new pre-drive photo.', photoReadFail: 'Could not read the photo.',
      photoTaken: t => `Photo taken: ${t} (from photo data)`, photoNoTime: 'The photo has no capture time, so the save time will be recorded.',
      saved: 'Usage log saved.', saveFail: 'Could not save.',
    },
  };
  let lang = (() => { try { return localStorage.getItem('wolkoCarLang') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } })();
  const t = (key, arg) => { const v = I18N[lang][key] ?? I18N.ko[key] ?? key; return typeof v === 'function' ? v(arg) : v; };
  const formatTime = value => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll('[data-t-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.tAria)));
    $('langKoBtn').classList.toggle('is-active', lang === 'ko');
    $('langEnBtn').classList.toggle('is-active', lang === 'en');
    const select = $('vehicleSelect');
    if (select.options.length) select.options[0].text = t('pickVehicle');
    if (!$('logApp').hidden) renderEntries();
  }
  function setLang(next) {
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem('wolkoCarLang', lang); } catch {}
    applyLang();
  }
  let entries = [];
  let photoBlob = null;
  let photoTakenAt = null;
  let previewUrl = null;
  let fullPhotoUrl = null;

  // 예전 기록에 이메일이 이름 자리에 저장돼 있어도 이름처럼 보이게 한다
  const shownName = name => String(name || '').includes('@') ? String(name).split('@')[0] : String(name || '');
  function headers() { return { Authorization: `Bearer ${sessionStorage.getItem(tokenKey) || ''}` }; }
  function showLogin(message = '') {
    $('loadStatus').hidden = true;
    $('logApp').hidden = true;
    $('loginPanel').hidden = false;
    $('loginError').textContent = message;
  }
  function updateReady() {
    const purpose = document.querySelector('input[name="useType"]:checked');
    $('photoButton').disabled = !purpose;
    $('saveButton').disabled = !purpose || !photoBlob || !$('vehicleSelect').value;
  }

  async function loadData() {
    const response = await fetch('/api/car/usage', { headers: headers() });
    if (response.status === 401) { showLogin(); return; }
    const data = await response.json().catch(() => ({ error: t('connectFail') }));
    if (!response.ok || !data.user || !Array.isArray(data.vehicles)) {
      throw new Error(data.error || t('loadFail'));
    }
    $('loadStatus').hidden = true;
    $('loginPanel').hidden = true;
    $('logApp').hidden = false;
    $('currentUser').textContent = shownName(data.user.name);
    const select = $('vehicleSelect');
    select.replaceChildren(new Option(t('pickVehicle'), ''));
    data.vehicles.forEach(vehicle => select.add(new Option(vehicle.name, vehicle.id)));
    if (data.vehicles.some(vehicle => vehicle.id === requestedVehicle)) select.value = requestedVehicle;
    entries = data.entries || [];
    renderEntries();
    updateReady();
  }

  function renderEntries() {
    const list = $('entryList');
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'log-empty';
      empty.textContent = t('noEntries');
      list.append(empty);
      return;
    }
    entries.forEach(entry => {
      const row = document.createElement('article');
      row.className = 'log-entry';
      const body = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${entry.vehicleName} · ${entry.useType === 'ministry' ? t('useMinistry') : t('usePersonal')}`;
      const details = document.createElement('span');
      details.textContent = `${formatTime(entry.photoTakenAt)} · ${shownName(entry.userName)} · ${entry.timeSource === 'exif' ? t('timeExif') : t('timeSaved')}`;
      body.append(title, details);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = t('viewPhoto');
      button.addEventListener('click', () => openPhoto(entry.id));
      row.append(body, button);
      list.append(row);
    });
  }

  async function openPhoto(id) {
    const response = await fetch(`/api/car/usage-photo?id=${encodeURIComponent(id)}`, { headers: headers() });
    if (!response.ok) { $('formError').textContent = t('photoOpenFail'); return; }
    if (fullPhotoUrl) URL.revokeObjectURL(fullPhotoUrl);
    fullPhotoUrl = URL.createObjectURL(await response.blob());
    $('fullPhoto').src = fullPhotoUrl;
    $('photoDialog').hidden = false;
  }

  function closePhoto() {
    $('photoDialog').hidden = true;
    $('fullPhoto').removeAttribute('src');
    if (fullPhotoUrl) URL.revokeObjectURL(fullPhotoUrl);
    fullPhotoUrl = null;
  }

  function readExifDate(file) {
    return file.slice(0, 512 * 1024).arrayBuffer().then(buffer => {
      const view = new DataView(buffer);
      if (view.byteLength < 12 || view.getUint16(0) !== 0xffd8) return null;
      let offset = 2;
      while (offset + 4 < view.byteLength) {
        if (view.getUint8(offset) !== 0xff) break;
        const marker = view.getUint8(offset + 1);
        if (marker === 0xda || marker === 0xd9) break;
        const length = view.getUint16(offset + 2);
        if (length < 2 || offset + 2 + length > view.byteLength) break;
        if (marker === 0xe1 && view.getUint32(offset + 4) === 0x45786966) {
          const base = offset + 10;
          if (base + 8 > view.byteLength) return null;
          const little = view.getUint16(base) === 0x4949;
          const get16 = at => view.getUint16(at, little);
          const get32 = at => view.getUint32(at, little);
          const ascii = (at, count) => {
            if (at < 0 || at + count > view.byteLength) return '';
            return String.fromCharCode(...new Uint8Array(buffer, at, count)).replace(/\0.*$/, '');
          };
          const tag = (ifd, wanted) => {
            if (ifd < 0 || ifd + 2 > view.byteLength) return null;
            const count = get16(ifd);
            for (let i = 0; i < count && i < 256; i++) {
              const at = ifd + 2 + i * 12;
              if (at + 12 > view.byteLength) break;
              if (get16(at) === wanted) return { type: get16(at + 2), count: get32(at + 4), value: get32(at + 8), at };
            }
            return null;
          };
          const exif = tag(base + get32(base + 4), 0x8769);
          if (!exif) return null;
          const ifd = base + exif.value;
          const dateTag = tag(ifd, 0x9003);
          if (!dateTag || dateTag.type !== 2 || dateTag.count < 19 || dateTag.count > 40) return null;
          const raw = ascii(base + dateTag.value, dateTag.count);
          const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(raw);
          if (!match) return null;
          const zoneTag = tag(ifd, 0x9011);
          const zone = zoneTag?.type === 2 && zoneTag.count <= 7
            ? ascii(zoneTag.count <= 4 ? zoneTag.at + 8 : base + zoneTag.value, zoneTag.count) : '';
          const [, year, month, day, hour, minute, second] = match.map(Number);
          const date = /^[-+]\d{2}:\d{2}$/.test(zone)
            ? new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${zone}`)
            : new Date(year, month - 1, day, hour, minute, second);
          return Number.isFinite(date.getTime()) ? date : null;
        }
        offset += 2 + length;
      }
      return null;
    }).catch(() => null);
  }

  async function toJpeg(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const encode = quality => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      let blob = await encode(.82);
      if (blob?.size > 4 * 1024 * 1024) blob = await encode(.65);
      if (!blob || blob.size > 4 * 1024 * 1024) throw new Error(t('resizeFail'));
      return blob;
    } finally { URL.revokeObjectURL(url); }
  }

  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginError').textContent = '';
    const button = $('loginForm').querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch('/api/hub/account-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('loginFail'));
      sessionStorage.setItem(tokenKey, data.hubToken);
      $('loginPassword').value = '';
      await loadData();
    } catch (error) { $('loginError').textContent = error.message; }
    finally { button.disabled = false; }
  });

  document.querySelectorAll('input[name="useType"]').forEach(input => input.addEventListener('change', updateReady));
  $('vehicleSelect').addEventListener('change', updateReady);
  $('photoButton').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', async () => {
    const file = $('photoInput').files?.[0];
    if (!file) return;
    $('formError').textContent = '';
    $('photoButton').disabled = true;
    photoBlob = null;
    updateReady();
    try {
      const exifDate = await readExifDate(file);
      if (exifDate && (exifDate.getTime() < Date.now() - 24 * 60 * 60_000 || exifDate.getTime() > Date.now() + 5 * 60_000)) {
        throw new Error(t('photoDiff'));
      }
      if (!exifDate && file.lastModified && file.lastModified < Date.now() - 24 * 60 * 60_000) {
        throw new Error(t('photoOld'));
      }
      photoBlob = await toJpeg(file);
      photoTakenAt = exifDate?.toISOString() || null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(photoBlob);
      $('photoPreview').src = previewUrl;
      $('photoPreview').hidden = false;
      $('photoTime').textContent = exifDate ? t('photoTaken', formatTime(exifDate)) : t('photoNoTime');
    } catch (error) {
      $('formError').textContent = error.message || t('photoReadFail');
      $('photoPreview').hidden = true;
      $('photoTime').textContent = '';
    }
    updateReady();
  });

  $('usageForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!photoBlob) return;
    $('formError').textContent = '';
    $('saveButton').disabled = true;
    $('saveButton').textContent = t('saving');
    try {
      const form = new FormData();
      form.append('vehicleId', $('vehicleSelect').value);
      form.append('useType', document.querySelector('input[name="useType"]:checked').value);
      form.append('photo', photoBlob, 'vehicle-before.jpg');
      if (photoTakenAt) { form.append('photoTakenAt', photoTakenAt); form.append('timeSource', 'exif'); }
      const response = await fetch('/api/car/usage', { method: 'POST', headers: headers(), body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('saveFail'));
      entries.unshift(data.entry);
      renderEntries();
      photoBlob = null;
      photoTakenAt = null;
      $('photoInput').value = '';
      $('photoPreview').hidden = true;
      $('photoTime').textContent = t('saved');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    } catch (error) { $('formError').textContent = error.message; }
    finally { $('saveButton').textContent = t('save'); updateReady(); }
  });

  $('closePhoto').addEventListener('click', closePhoto);
  $('photoDialog').addEventListener('click', event => { if (event.target === $('photoDialog')) closePhoto(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('photoDialog').hidden) closePhoto(); });
  $('printQrButton').addEventListener('click', () => window.print());
  $('langKoBtn').addEventListener('click', () => setLang('ko'));
  $('langEnBtn').addEventListener('click', () => setLang('en'));
  applyLang();
  loadData().catch(error => showLogin(error.message));
})();
