// ─────────── FORM ───────────
const cityInput = document.getElementById('cityInput');
const hotelInput = document.getElementById('hotelInput');
const companionGroup = document.getElementById('companionInput');
const arriveInput = document.getElementById('arriveInput');
const departInput = document.getElementById('departInput');
const generateBtn = document.getElementById('generateBtn');

let selectedCompanion = null;

// 기본 도착·출국 시간 (다음 주 토요일 18:00 → 그 주 수요일 18:00)
(() => {
  const now = new Date();
  const arrival = new Date(now); arrival.setDate(now.getDate() + 7); arrival.setHours(11, 0, 0, 0);
  const depart = new Date(arrival); depart.setDate(arrival.getDate() + 4); depart.setHours(18, 0, 0, 0);
  arriveInput.value = formatLocal(arrival);
  departInput.value = formatLocal(depart);
})();

function formatLocal(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

cityInput.addEventListener('change', () => {
  const cityKey = cityInput.value;
  if (!cityKey) {
    hotelInput.disabled = true;
    hotelInput.innerHTML = '<option value="">도시를 먼저 선택하세요</option>';
    checkValid();
    return;
  }
  const city = window.CITIES[cityKey];
  hotelInput.disabled = false;
  hotelInput.innerHTML = city.hotelAreas.map(a =>
    `<option value="${a}" ${a === city.defaultHotelArea ? 'selected' : ''}>📍 ${a}</option>`
  ).join('');
  checkValid();
});

companionGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('#companionInput .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  selectedCompanion = btn.dataset.val;
  checkValid();
});

[arriveInput, departInput, hotelInput].forEach(el => el.addEventListener('change', checkValid));

function checkValid() {
  const valid = cityInput.value && selectedCompanion && arriveInput.value && departInput.value && hotelInput.value &&
    new Date(departInput.value) > new Date(arriveInput.value);
  generateBtn.disabled = !valid;
}

generateBtn.addEventListener('click', async () => {
  const arriveAt = new Date(arriveInput.value);
  const departAt = new Date(departInput.value);
  const msDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((new Date(departAt.toDateString()) - new Date(arriveAt.toDateString())) / msDay) + 1;

  const city = window.CITIES[cityInput.value];
  const dates = window.Weather.getTravelDates(arriveAt, departAt);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const originalText = generateBtn.innerHTML;
  generateBtn.innerHTML = '☁️ 날씨 확인 중... ☁️';
  generateBtn.disabled = true;

  let weatherByDay = null;
  try {
    const wx = await window.Weather.fetchWeather(city.center[0], city.center[1], startDate, endDate);
    if (wx && wx.days) {
      weatherByDay = {};
      wx.days.forEach((w, i) => { weatherByDay[i] = w; });
    }
  } catch (e) {
    console.warn('Weather fetch error', e);
  }

  const itinerary = window.TripEngine.generateItinerary({
    cityKey: cityInput.value,
    days,
    companion: selectedCompanion,
    arriveAt,
    departAt,
    hotelArea: hotelInput.value,
    weatherByDay
  });

  generateBtn.innerHTML = originalText;
  generateBtn.disabled = false;
  renderResult(itinerary, { arriveAt, departAt });
});

// ─────────── RESULT ───────────
const DAY_COLORS = ['#ff8fa3', '#ff8c61', '#5fc9b3', '#9d8eff', '#f5b942', '#84dcc6', '#ffb5a7'];
let map = null;
const layers = {};
const markersByStop = new Map();

function renderResult(it, { arriveAt, departAt }) {
  document.getElementById('form-screen').style.display = 'none';
  document.getElementById('result-screen').style.display = '';

  document.getElementById('resultTitle').innerHTML = it.title || `${it.city.emoji} ${it.city.name} ${it.days.length}일 여행 ✈️`;
  if (it.subtitle) {
    document.getElementById('resultSub').textContent = it.subtitle;
  } else {
  const arriveStr = `${arriveAt.getMonth()+1}/${arriveAt.getDate()} ${String(arriveAt.getHours()).padStart(2,'0')}:${String(arriveAt.getMinutes()).padStart(2,'0')}`;
  const departStr = `${departAt.getMonth()+1}/${departAt.getDate()} ${String(departAt.getHours()).padStart(2,'0')}:${String(departAt.getMinutes()).padStart(2,'0')}`;
  document.getElementById('resultSub').textContent = `${it.companion} · ${it.hotel.area} 숙소 · ${arriveStr} → ${departStr}`;
  }

  if (map) { map.remove(); }
  map = L.map('map', { zoomControl: true }).setView(it.center || it.city.center, it.zoom || it.city.zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap 💕'
  }).addTo(map);

  // 호텔 마커 (별표) — 확정 일정은 숙소가 stop으로 들어가 있음
  if (it.hotel) L.marker([it.hotel.lat, it.hotel.lng], {
    icon: L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-pin" style="--c:#ffd97d"><span class="emoji">🏨</span></div>`,
      iconSize: [36, 42],
      iconAnchor: [18, 38]
    })
  }).bindPopup(`<div class="popup-title">🏨 ${it.hotel.area} 숙소</div>`).addTo(map);

  Object.keys(layers).forEach(k => delete layers[k]);
  markersByStop.clear();

  it.days.forEach((day, dIdx) => {
    const color = DAY_COLORS[dIdx % DAY_COLORS.length];
    const group = L.layerGroup();
    const path = [];

    day.stops.forEach((stop, i) => {
      if (stop.lat == null) return;
      const marker = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-pin" style="--c:${color}"><span class="emoji">${stop.emoji}</span></div>`,
          iconSize: [36, 42],
          iconAnchor: [18, 38],
          popupAnchor: [0, -36]
        })
      });
      const priority = stop.priority ? `<span class="stop-priority priority-${stop.priority}">${stop.priority}</span>` : '';
      const popupHtml = `
        <div>
          <div class="popup-time">⏰ ${stop.time}</div>
          <div class="popup-title">${stop.emoji} ${stop.name}</div>
          <div class="popup-meta">
            ${stop.desc || ''}
            ${stop.memo ? `<br/><span class="memo">💭 ${stop.memo}</span>` : ''}
            ${priority ? `<br/>${priority}` : ''}
          </div>
          <a class="popup-link" href="https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}" target="_blank" rel="noopener">📍 Google Maps 열기</a>
        </div>`;
      marker.bindPopup(popupHtml, { maxWidth: 280 });
      marker.addTo(group);
      path.push([stop.lat, stop.lng]);
      markersByStop.set(`${day.day}-${i}`, marker);
    });

    // 그날 숙소 마커 (일정에 같은 숙소 stop이 있으면 생략)
    const h = day.hotel;
    if (h && h.lat != null && !day.stops.some(st => st.lat === h.lat && st.lng === h.lng)) {
      L.marker([h.lat, h.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-pin" style="--c:#ffd97d"><span class="emoji">🏨</span></div>`,
          iconSize: [36, 42],
          iconAnchor: [18, 38],
          popupAnchor: [0, -36]
        })
      }).bindPopup(`<div class="popup-title">🏨 ${h.name}</div>${h.note ? `<div class="popup-meta">${h.note}</div>` : ''}`).addTo(group);
    }

    if (path.length > 1) {
      L.polyline(path, { color, weight: 4, opacity: 0.6, dashArray: '8, 8', lineCap: 'round' }).addTo(group);
    }
    layers[day.day] = { group, color };
  });

  renderDayTabs(it);
  renderSchedule(it);
  showDay(it.days[0].day, it);
}

function renderDayTabs(it) {
  const tabs = document.getElementById('dayTabs');
  tabs.innerHTML = '';
  it.days.forEach((day, i) => {
    const btn = document.createElement('button');
    btn.className = 'day-tab' + (i === 0 ? ' active' : '');
    btn.dataset.day = day.day;
    btn.innerHTML = `${day.emoji} ${day.label || day.day + '일차'}`;
    btn.onclick = () => showDay(day.day, it);
    tabs.appendChild(btn);
  });
  const all = document.createElement('button');
  all.className = 'day-tab all';
  all.dataset.day = 'all';
  all.innerHTML = '🌈 전체';
  all.onclick = () => showDay('all', it);
  tabs.appendChild(all);
}

function gmapsDirLink(stops) {
  stops = stops.filter(s => s.lat != null);
  if (stops.length < 2) return null;
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const dest = `${stops[stops.length-1].lat},${stops[stops.length-1].lng}`;
  const wp = stops.slice(1, -1).slice(0, 9).map(s => `${s.lat},${s.lng}`).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=transit`;
  if (wp) url += `&waypoints=${encodeURIComponent(wp)}`;
  return url;
}

function renderSchedule(it) {
  const el = document.getElementById('schedule');
  el.innerHTML = '';
  it.days.forEach((day, dIdx) => {
    const color = DAY_COLORS[dIdx % DAY_COLORS.length];
    const section = document.createElement('div');
    section.className = 'day-section';
    section.dataset.day = day.day;
    section.style.display = dIdx === 0 ? '' : 'none';

    const dirUrl = gmapsDirLink(day.stops);
    const wx = day.weather;
    const wxChip = wx ? `<div class="weather-chip" title="${wx.label}${wx.hint ? ' · ' + wx.hint : ''}">
        <span class="wx-emoji">${wx.emoji}</span>
        <span class="wx-temp">${wx.tempMin}°~${wx.tempMax}°</span>
        ${wx.precip > 1 ? `<span class="wx-precip">💧${wx.precip.toFixed(1)}mm</span>` : ''}
      </div>` : '';
    section.innerHTML = `
      <div class="day-header">
        <span class="day-badge" style="background:${color}">${day.day}</span>
        <span class="day-theme">${day.emoji} ${day.label ? `<small>${day.label}</small> ` : ''}${day.theme}</span>
        ${dirUrl ? `<a class="day-dir-link" href="${dirUrl}" target="_blank">🗺️ 전체경로</a>` : ''}
      </div>
      ${wxChip}
      ${day.hotel ? `<div class="day-hotel">🏨 ${day.hotel.name}${day.hotel.note ? ` <small>· ${day.hotel.note}</small>` : ''}</div>` : ''}
      ${wx && wx.hint ? `<div class="weather-hint">💡 ${wx.hint}</div>` : ''}
    `;

    day.stops.forEach((stop, i) => {
      const item = document.createElement('div');
      item.className = 'stop' + (stop.lat == null ? ' no-map' : '');
      const memo = stop.memo ? `<br/><span class="memo">💭 ${stop.memo}</span>` : '';
      item.innerHTML = `
        <span class="stop-num" style="background:${color}">${i+1}</span>
        <div class="stop-body">
          <span class="stop-time">⏰ ${stop.time}</span>
          <div class="stop-title"><span class="stop-emoji">${stop.emoji}</span>${stop.name}${stop.priority ? `<span class="stop-priority priority-${stop.priority}">${stop.priority}</span>` : ''}</div>
          <div class="stop-meta">${stop.desc || ''}${memo}</div>
        </div>
      `;
      item.onclick = () => {
        const marker = markersByStop.get(`${day.day}-${i}`);
        if (marker) {
          if (!map.hasLayer(layers[day.day].group)) showDay(day.day, it);
          map.setView(marker.getLatLng(), 14, { animate: true });
          marker.openPopup();
          document.querySelectorAll('.stop').forEach(s => s.classList.remove('active'));
          item.classList.add('active');
          if (window.innerWidth <= 800) {
            document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      };
      section.appendChild(item);
    });
    el.appendChild(section);
  });
}

function showDay(dayNum, it) {
  Object.values(layers).forEach(l => map.removeLayer(l.group));
  document.querySelectorAll('.day-tab').forEach(b => b.classList.toggle('active', String(b.dataset.day) === String(dayNum)));
  document.querySelectorAll('.day-section').forEach(s => {
    s.style.display = (dayNum === 'all' || String(s.dataset.day) === String(dayNum)) ? '' : 'none';
  });

  const bounds = [];
  const targets = dayNum === 'all' ? Object.keys(layers) : [dayNum];
  targets.forEach(d => {
    layers[d].group.addTo(map);
    it.days.find(x => String(x.day) === String(d))?.stops.forEach(s => { if (s.lat != null) bounds.push([s.lat, s.lng]); });
    const h = it.days.find(x => String(x.day) === String(d))?.hotel;
    if (h && h.lat != null) bounds.push([h.lat, h.lng]);
  });
  // 점이 하나뿐이면 fitBounds가 최대 확대(19)로 가버리므로 상한을 둠
  if (bounds.length) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
}

document.getElementById('backBtn').addEventListener('click', () => {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  document.getElementById('result-screen').style.display = 'none';
  document.getElementById('form-screen').style.display = '';
});

// ─────────── 확정 일정 (data/trips.js) ───────────
async function openTrip(key) {
  const trip = window.TRIPS && window.TRIPS[key];
  if (!trip) return;
  if (location.hash !== '#' + key) history.replaceState(null, '', '#' + key);

  // 도시별 날씨를 한 번씩만 받아서 날짜로 매칭 (예보 범위 밖이면 생략)
  const dates = trip.days.map(d => d.date);
  const start = dates[0], end = dates[dates.length - 1];
  const wxByCity = {};
  await Promise.all(Object.entries(trip.weatherCities || {}).map(async ([city, [lat, lng]]) => {
    try {
      // 날씨가 늦으면 기다리지 않고 일정부터 보여줌
      const timeout = new Promise(res => setTimeout(() => res(null), 3000));
      const wx = await Promise.race([window.Weather.fetchWeather(lat, lng, start, end, 'Europe/Rome'), timeout]);
      if (wx && wx.days) wxByCity[city] = Object.fromEntries(wx.days.map(w => [w.date, w]));
    } catch (e) { console.warn('Weather fetch error', e); }
  }));

  const it = {
    ...trip,
    days: trip.days.map(d => ({ ...d, weather: wxByCity[d.city]?.[d.date] || null }))
  };
  renderResult(it, {});

  // 여행 중이면 오늘 날짜 탭으로 바로 이동
  const t = new Date();
  const today = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  const todayDay = it.days.find(d => d.date === today);
  if (todayDay) showDay(todayDay.day, it);
}

document.querySelectorAll('[data-trip]').forEach(btn =>
  btn.addEventListener('click', () => openTrip(btn.dataset.trip))
);
if (location.hash.length > 1 && window.TRIPS && window.TRIPS[location.hash.slice(1)]) {
  openTrip(location.hash.slice(1));
}
