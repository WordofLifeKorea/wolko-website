(function () {
  const $ = id => document.getElementById(id);
  const tokenKey = 'wolko-hub-token';
  const requestedVehicle = new URLSearchParams(location.search).get('vehicle');
  const formatTime = value => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  let entries = [];
  let photoBlob = null;
  let photoTakenAt = null;
  let previewUrl = null;
  let fullPhotoUrl = null;

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
    const data = await response.json().catch(() => ({ error: '일지 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }));
    if (!response.ok || !data.user || !Array.isArray(data.vehicles)) {
      throw new Error(data.error || '일지를 불러오지 못했습니다.');
    }
    $('loadStatus').hidden = true;
    $('loginPanel').hidden = true;
    $('logApp').hidden = false;
    $('currentUser').textContent = `${data.user.name} (${data.user.email})`;
    const select = $('vehicleSelect');
    select.replaceChildren(new Option('차량을 선택해 주세요', ''));
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
      empty.textContent = '아직 등록된 사용 기록이 없습니다.';
      list.append(empty);
      return;
    }
    entries.forEach(entry => {
      const row = document.createElement('article');
      row.className = 'log-entry';
      const body = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${entry.vehicleName} · ${entry.useType === 'ministry' ? '사역용' : '개인용'}`;
      const details = document.createElement('span');
      details.textContent = `${formatTime(entry.photoTakenAt)} · ${entry.userName} · ${entry.timeSource === 'exif' ? '사진 촬영 시각' : '기록 시각'}`;
      body.append(title, details);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '사진 보기';
      button.addEventListener('click', () => openPhoto(entry.id));
      row.append(body, button);
      list.append(row);
    });
  }

  async function openPhoto(id) {
    const response = await fetch(`/api/car/usage-photo?id=${encodeURIComponent(id)}`, { headers: headers() });
    if (!response.ok) { $('formError').textContent = '사진을 열지 못했습니다.'; return; }
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
      if (!blob || blob.size > 4 * 1024 * 1024) throw new Error('사진 크기를 줄이지 못했습니다. 다른 사진을 선택해 주세요.');
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
      if (!response.ok) throw new Error(data.error || '로그인하지 못했습니다.');
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
        throw new Error('사진 촬영 시각이 오늘과 다릅니다. 운행 전 사진을 새로 찍어 주세요.');
      }
      if (!exifDate && file.lastModified && file.lastModified < Date.now() - 24 * 60 * 60_000) {
        throw new Error('오래된 사진입니다. 운행 전 사진을 새로 찍어 주세요.');
      }
      photoBlob = await toJpeg(file);
      photoTakenAt = exifDate?.toISOString() || null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(photoBlob);
      $('photoPreview').src = previewUrl;
      $('photoPreview').hidden = false;
      $('photoTime').textContent = exifDate
        ? `사진 촬영: ${formatTime(exifDate)} (사진 정보 기준)`
        : '사진에 촬영 시각 정보가 없어 저장 시각으로 기록됩니다.';
    } catch (error) {
      $('formError').textContent = error.message || '사진을 읽지 못했습니다.';
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
    $('saveButton').textContent = '저장 중…';
    try {
      const form = new FormData();
      form.append('vehicleId', $('vehicleSelect').value);
      form.append('useType', document.querySelector('input[name="useType"]:checked').value);
      form.append('photo', photoBlob, 'vehicle-before.jpg');
      if (photoTakenAt) { form.append('photoTakenAt', photoTakenAt); form.append('timeSource', 'exif'); }
      const response = await fetch('/api/car/usage', { method: 'POST', headers: headers(), body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '저장하지 못했습니다.');
      entries.unshift(data.entry);
      renderEntries();
      photoBlob = null;
      photoTakenAt = null;
      $('photoInput').value = '';
      $('photoPreview').hidden = true;
      $('photoTime').textContent = '사용 일지가 저장됐습니다.';
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    } catch (error) { $('formError').textContent = error.message; }
    finally { $('saveButton').textContent = '사용 일지 저장'; updateReady(); }
  });

  $('closePhoto').addEventListener('click', closePhoto);
  $('photoDialog').addEventListener('click', event => { if (event.target === $('photoDialog')) closePhoto(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('photoDialog').hidden) closePhoto(); });
  $('printQrButton').addEventListener('click', () => window.print());
  loadData().catch(error => showLogin(error.message));
})();
