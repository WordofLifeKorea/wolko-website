(function () {
  const $ = id => document.getElementById(id);
  const tokenKey = 'wolko-hub-token';
  const requestedVehicle = new URLSearchParams(location.search).get('vehicle');
  /* ── 한/영 (차량 스케줄 페이지와 같은 wolkoCarLang 설정을 공유) ── */
  const I18N = {
    ko: {
      pageTitle: '차량 스케줄', docTitle: '차량 사용 일지 — WOLKO', menuLabel: '차량 메뉴',
      tabReservations: '예약현황', tabMaintenance: '정비 관리', tabLog: '사용 일지', tabDrive: '운행 스케줄',
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
      nRecords: n => `${n}건`, latest: '최근', noVehicleRecords: '아직 기록이 없습니다.', manage: '관리', manageDone: '완료', selectAll: '전체 선택', selectedN: n => n ? `${n}건 선택` : '기록을 골라 주세요', editSel: '선택 수정', delSel: '선택 삭제', delSelConfirm: n => `선택한 ${n}건의 기록과 사진을 삭제합니다.\n(삭제 보관함에 백업돼요)\n\n삭제할까요?`, editTitle: '선택한 기록 수정', editHelp: n => `선택한 ${n}건에 적용돼요. 바꾸지 않을 항목은 “변경 안 함”으로 두세요.`, editVehicle: '차량', editUse: '사용 목적', keepAsIs: '변경 안 함', cancelBtn: '취소', editSaveBtn: '저장', editNothing: '바꿀 내용을 골라 주세요.', deleted: n => `${n}건을 삭제했습니다.`, edited: n => `${n}건을 수정했습니다.`, clearConfirm: '지금 있는 모든 사용 기록과 사진을 삭제합니다.\n(삭제 보관함에 백업돼요)\n\n계속하려면 "삭제"라고 입력하세요.', cleared: n => n + '건을 삭제했어요.',
      mileageAfter: '사용 후 마일리지', mileagePh: '사용 후 계기판 km', mileageSave: '저장', mileageEdit: '수정', mileageSaved: '마일리지를 저장했습니다.', mileageFail: '마일리지를 숫자(km)로 입력해 주세요.',
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
      tabReservations: 'Reservations', tabMaintenance: 'Maintenance', tabLog: 'Usage Log', tabDrive: 'Driving',
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
      nRecords: n => `${n} record${n === 1 ? '' : 's'}`, latest: 'Latest', noVehicleRecords: 'No records yet.', manage: 'Manage', manageDone: 'Done', selectAll: 'Select all', selectedN: n => n ? `${n} selected` : 'Select records', editSel: 'Edit selected', delSel: 'Delete selected', delSelConfirm: n => `This deletes the ${n} selected record(s) and their photos.\n(They are kept in a deleted-items backup)\n\nDelete them?`, editTitle: 'Edit selected records', editHelp: n => `Applies to the ${n} selected record(s). Leave anything you do not want to change as “No change”.`, editVehicle: 'Vehicle', editUse: 'Purpose of use', keepAsIs: 'No change', cancelBtn: 'Cancel', editSaveBtn: 'Save', editNothing: 'Choose what to change.', deleted: n => `Deleted ${n} record(s).`, edited: n => `Updated ${n} record(s).`, clearConfirm: 'This deletes ALL current usage records and photos.\n(They are kept in a deleted-items backup)\n\nType DELETE to continue.', cleared: n => n + ' record(s) deleted.',
      mileageAfter: 'Mileage after use', mileagePh: 'Odometer after use (km)', mileageSave: 'Save', mileageEdit: 'Edit', mileageSaved: 'Mileage saved.', mileageFail: 'Enter the mileage as a number (km).',
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
  let me = null;
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
    me = data.user;
    $('manageBtn').hidden = me.role !== 'master';   // 관리(선택 수정·삭제)는 마스터 계정만
    $('currentUser').textContent = shownName(data.user.name);
    const select = $('vehicleSelect');
    select.replaceChildren(new Option(t('pickVehicle'), ''));
    data.vehicles.forEach(vehicle => select.add(new Option(vehicle.name, vehicle.id)));
    if (data.vehicles.some(vehicle => vehicle.id === requestedVehicle)) select.value = requestedVehicle;
    entries = data.entries || [];
    renderEntries();
    updateReady();
  }

  const openVehicles = new Set(), openEntries = new Set();
  let manageMode = false;
  const selected = new Set();
  function syncManage() {
    const master = me && me.role === 'master';
    if (!master) { manageMode = false; selected.clear(); }
    $('manageBtn').textContent = manageMode ? t('manageDone') : t('manage');
    $('manageBtn').classList.toggle('on', manageMode);
    $('manageBar').hidden = !manageMode;
    const n = selected.size;
    $('selectedCount').textContent = t('selectedN', n);
    $('editSelBtn').disabled = !n; $('delSelBtn').disabled = !n;
    $('selectAll').checked = entries.length > 0 && n === entries.length;
    $('selectAll').indeterminate = n > 0 && n < entries.length;
  }

  function renderEntries() {
    const list = $('entryList');
    [...selected].forEach(id => { if (!entries.some(e => e.id === id)) selected.delete(id); });
    syncManage();
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'log-empty';
      empty.textContent = t('noEntries');
      list.append(empty);
      return;
    }
    // 차량마다 카드 하나 — 카드를 누르면 그 차량의 기록이 한 줄씩 펼쳐지고, 한 줄을 누르면 사진 · 마일리지가 열린다
    const vehicles = [...$('vehicleSelect').options].filter(o => o.value).map(o => ({ id: o.value, name: o.text }));
    entries.forEach(e => { if (!vehicles.some(v => v.id === e.vehicleId)) vehicles.push({ id: e.vehicleId, name: e.vehicleName }); });
    const kmText = e => e.mileageAfter != null ? `${Number(e.mileageAfter).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR')} km` : '';
    const shortTime = value => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
    vehicles.forEach(vehicle => {
      const mine = entries.filter(e => e.vehicleId === vehicle.id);
      const open = openVehicles.has(vehicle.id);
      const card = document.createElement('section');
      card.className = 'log-vehicle' + (open ? ' is-open' : '');
      const head = document.createElement('button');
      head.type = 'button'; head.className = 'log-vehicle-head'; head.setAttribute('aria-expanded', String(open));
      const latest = mine[0];
      head.innerHTML = '<span class="log-vehicle-name"></span><span class="log-vehicle-sub"></span><svg class="log-chev" width="12" height="12" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      head.querySelector('.log-vehicle-name').textContent = vehicle.name;
      head.querySelector('.log-vehicle-sub').textContent = latest ? `${t('nRecords', mine.length)} · ${t('latest')} ${shortTime(latest.photoTakenAt)} · ${shownName(latest.userName)}` : t('noVehicleRecords');
      head.addEventListener('click', () => { if (openVehicles.has(vehicle.id)) openVehicles.delete(vehicle.id); else openVehicles.add(vehicle.id); renderEntries(); });
      card.append(head);
      if (open) {
        const body = document.createElement('div');
        body.className = 'log-vehicle-body';
        if (!mine.length) { const p = document.createElement('p'); p.className = 'log-empty'; p.textContent = t('noVehicleRecords'); body.append(p); }
        mine.forEach(entry => {
          const row = document.createElement('article');
          const expanded = openEntries.has(entry.id);
          row.className = 'log-line' + (expanded ? ' is-open' : '') + (manageMode ? ' has-check' : '') + (manageMode && selected.has(entry.id) ? ' is-selected' : '');
          const line = document.createElement('div');
          line.className = 'log-line-head';
          if (manageMode) {
            const check = document.createElement('input');
            check.type = 'checkbox'; check.className = 'log-entry-check'; check.checked = selected.has(entry.id);
            check.setAttribute('aria-label', `${entry.vehicleName} ${formatTime(entry.photoTakenAt)}`);
            check.addEventListener('change', () => { if (check.checked) selected.add(entry.id); else selected.delete(entry.id); row.classList.toggle('is-selected', check.checked); syncManage(); });
            line.append(check);
          }
          const toggle = document.createElement('button');
          toggle.type = 'button'; toggle.className = 'log-line-toggle'; toggle.setAttribute('aria-expanded', String(expanded));
          toggle.innerHTML = '<span class="log-line-time"></span><span class="log-line-who"></span><span class="log-line-use"></span><span class="log-line-km"></span><svg class="log-chev" width="12" height="12" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          toggle.querySelector('.log-line-time').textContent = shortTime(entry.photoTakenAt);
          toggle.querySelector('.log-line-who').textContent = shownName(entry.userName);
          const use = toggle.querySelector('.log-line-use');
          use.textContent = entry.useType === 'ministry' ? t('useMinistry') : t('usePersonal');
          use.classList.add(entry.useType === 'ministry' ? 'is-ministry' : 'is-personal');
          toggle.querySelector('.log-line-km').textContent = kmText(entry);
          toggle.addEventListener('click', () => { if (openEntries.has(entry.id)) openEntries.delete(entry.id); else openEntries.add(entry.id); renderEntries(); });
          line.append(toggle);
          row.append(line);
          if (expanded) {
            const detail = document.createElement('div');
            detail.className = 'log-line-body';
            const info = document.createElement('span');
            info.className = 'log-line-info';
            info.textContent = `${formatTime(entry.photoTakenAt)} · ${entry.timeSource === 'exif' ? t('timeExif') : t('timeSaved')}`;
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'log-photo-btn'; button.textContent = t('viewPhoto');
            button.addEventListener('click', () => openPhoto(entry.id));
            detail.append(info, button, mileageBlock(entry));
            row.append(detail);
          }
          body.append(row);
        });
        card.append(body);
      }
      list.append(card);
    });
  }

  // 사용 후 마일리지: 값이 있으면 보여주고, 본인 기록이면 입력/수정할 수 있다
  function mileageBlock(entry) {
    const box = document.createElement('div');
    box.className = 'log-mileage';
    const mine = me && (entry.userEmail === me.email || me.role === 'master');
    const draw = editing => {
      box.replaceChildren();
      if (entry.mileageAfter != null && !editing) {
        const text = document.createElement('span');
        text.className = 'log-mileage-value';
        text.textContent = `${t('mileageAfter')} ${Number(entry.mileageAfter).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR')} km`;
        box.append(text);
        if (mine) {
          const edit = document.createElement('button');
          edit.type = 'button'; edit.className = 'log-link'; edit.textContent = t('mileageEdit');
          edit.addEventListener('click', () => draw(true));
          box.append(edit);
        }
        return;
      }
      if (!mine) return;
      const input = document.createElement('input');
      input.type = 'number'; input.inputMode = 'numeric'; input.min = '0'; input.step = '1';
      input.placeholder = t('mileagePh'); input.setAttribute('aria-label', t('mileageAfter'));
      if (entry.mileageAfter != null) input.value = entry.mileageAfter;
      const save = document.createElement('button');
      save.type = 'button'; save.textContent = t('mileageSave');
      save.addEventListener('click', async () => {
        const km = Number(input.value);
        if (input.value === '' || !Number.isInteger(km) || km < 0) { $('formError').textContent = t('mileageFail'); return; }
        $('formError').textContent = '';
        save.disabled = true;
        try {
          const response = await fetch('/api/car/usage', { method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, mileageAfter: km }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || t('saveFail'));
          Object.assign(entry, data.entry);
          draw(false);
        } catch (error) { $('formError').textContent = error.message; save.disabled = false; }
      });
      box.append(input, save);
    };
    draw(false);
    return box;
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
      if (window.wolkoCheckPasswordReset) window.wolkoCheckPasswordReset();
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

  // ── 관리: 체크한 기록만 수정 · 삭제 (마스터 전용) ──
  $('manageBtn').addEventListener('click', () => { manageMode = !manageMode; selected.clear(); renderEntries(); });
  $('selectAll').addEventListener('change', () => { if ($('selectAll').checked) entries.forEach(e => selected.add(e.id)); else selected.clear(); renderEntries(); });
  async function bulk(method, body) {
    const response = await fetch('/api/car/usage', { method, headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || t('saveFail'));
    return data;
  }
  $('delSelBtn').addEventListener('click', async () => {
    const ids = [...selected];
    if (!ids.length || !confirm(t('delSelConfirm', ids.length))) return;
    $('formError').textContent = '';
    try {
      let total = 0;
      for (let i = 0; i < ids.length; i += 50) { const data = await bulk('DELETE', { ids: ids.slice(i, i + 50) }); total += data.count; }
      entries = entries.filter(e => !selected.has(e.id));
      selected.clear();
      renderEntries();
      $('photoTime').textContent = t('deleted', total);
    } catch (error) { $('formError').textContent = error.message; }
  });
  $('editSelBtn').addEventListener('click', () => {
    if (!selected.size) return;
    const v = $('editVehicle'); v.replaceChildren(new Option(t('keepAsIs'), ''));
    [...$('vehicleSelect').options].filter(o => o.value).forEach(o => v.add(new Option(o.text, o.value)));
    $('editUse').value = ''; $('editError').textContent = '';
    $('editHelp').textContent = t('editHelp', selected.size);
    $('editDialog').hidden = false;
  });
  $('editCancel').addEventListener('click', () => { $('editDialog').hidden = true; });
  $('editDialog').addEventListener('click', event => { if (event.target === $('editDialog')) $('editDialog').hidden = true; });
  $('editSave').addEventListener('click', async () => {
    const vehicleId = $('editVehicle').value, useType = $('editUse').value;
    if (!vehicleId && !useType) { $('editError').textContent = t('editNothing'); return; }
    $('editSave').disabled = true;
    try {
      const data = await bulk('PATCH', { ids: [...selected], ...(vehicleId ? { vehicleId } : {}), ...(useType ? { useType } : {}) });
      data.entries.forEach(updated => { const i = entries.findIndex(e => e.id === updated.id); if (i >= 0) entries[i] = { ...entries[i], ...updated }; });
      $('editDialog').hidden = true;
      renderEntries();
      $('photoTime').textContent = t('edited', data.count);
    } catch (error) { $('editError').textContent = error.message; }
    finally { $('editSave').disabled = false; }
  });
  $('closePhoto').addEventListener('click', closePhoto);
  $('photoDialog').addEventListener('click', event => { if (event.target === $('photoDialog')) closePhoto(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!$('photoDialog').hidden) closePhoto(); else if (!$('editDialog').hidden) $('editDialog').hidden = true; } });
  $('printQrButton').addEventListener('click', () => window.print());
  $('langKoBtn').addEventListener('click', () => setLang('ko'));
  $('langEnBtn').addEventListener('click', () => setLang('en'));
  applyLang();
  loadData().catch(error => showLogin(error.message));
})();
