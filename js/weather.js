// Open-Meteo 날씨 클라이언트 (API 키 불필요)
(function() {
  const CACHE_TTL = 60 * 60 * 1000; // 1시간

  // WMO weather code → 이모지·라벨·동선 가중치
  function interpretCode(code) {
    if (code === 0) return { emoji: '☀️', label: '맑음', outdoorBonus: 1.35, indoorBonus: 0.95 };
    if (code <= 1) return { emoji: '🌤️', label: '대체로 맑음', outdoorBonus: 1.2, indoorBonus: 1.0 };
    if (code <= 3) return { emoji: '⛅', label: '구름 많음', outdoorBonus: 1.0, indoorBonus: 1.0 };
    if (code <= 48) return { emoji: '🌫️', label: '안개', outdoorBonus: 0.8, indoorBonus: 1.1 };
    if (code <= 57) return { emoji: '🌦️', label: '이슬비', outdoorBonus: 0.6, indoorBonus: 1.3 };
    if (code <= 65) return { emoji: '🌧️', label: '비', outdoorBonus: 0.35, indoorBonus: 1.5 };
    if (code <= 67) return { emoji: '🥶', label: '진눈깨비', outdoorBonus: 0.3, indoorBonus: 1.5 };
    if (code <= 77) return { emoji: '❄️', label: '눈', outdoorBonus: 0.5, indoorBonus: 1.4 };
    if (code <= 82) return { emoji: '🌦️', label: '소나기', outdoorBonus: 0.55, indoorBonus: 1.3 };
    if (code <= 86) return { emoji: '🌨️', label: '눈 소나기', outdoorBonus: 0.5, indoorBonus: 1.3 };
    if (code <= 99) return { emoji: '⛈️', label: '뇌우', outdoorBonus: 0.2, indoorBonus: 1.55 };
    return { emoji: '🌥️', label: '흐림', outdoorBonus: 0.95, indoorBonus: 1.0 };
  }

  // 기온에 따른 추가 보정
  function tempAdjustment(tempMax) {
    if (tempMax >= 33) return { hint: '폭염 ☀️ 한낮 야외 주의', outdoorBonus: 0.85 };
    if (tempMax >= 30) return { hint: '더움 — 한낮은 실내 추천', outdoorBonus: 0.95 };
    if (tempMax <= 0) return { hint: '한파 — 실내 위주 추천', outdoorBonus: 0.7, indoorBonus: 1.2 };
    if (tempMax <= 5) return { hint: '추움 — 따뜻하게', outdoorBonus: 0.85 };
    return { hint: null };
  }

  async function fetchWeather(lat, lng, startDate, endDate, tz = 'Asia/Tokyo') {
    const cacheKey = `weather:${lat.toFixed(2)},${lng.toFixed(2)}:${startDate}:${endDate}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL) return parsed.data;
      }
    } catch (e) {}

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=${encodeURIComponent(tz)}&start_date=${startDate}&end_date=${endDate}`;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.daily || !data.daily.time) return null;

      const days = data.daily.time.map((date, i) => {
        const code = data.daily.weathercode[i];
        const tempMax = Math.round(data.daily.temperature_2m_max[i]);
        const tempMin = Math.round(data.daily.temperature_2m_min[i]);
        const precip = data.daily.precipitation_sum[i];
        const base = interpretCode(code);
        const adj = tempAdjustment(tempMax);
        return {
          date,
          code,
          emoji: base.emoji,
          label: base.label,
          tempMax,
          tempMin,
          precip,
          hint: adj.hint,
          outdoorBonus: base.outdoorBonus * (adj.outdoorBonus || 1),
          indoorBonus: base.indoorBonus * (adj.indoorBonus || 1)
        };
      });

      const result = { days };
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: result })); } catch (e) {}
      return result;
    } catch (e) {
      console.warn('Weather fetch failed', e);
      return null;
    }
  }

  // 여행 날짜 배열 생성 (도착일~출국일)
  function getTravelDates(arriveAt, departAt) {
    const dates = [];
    const cur = new Date(arriveAt.getFullYear(), arriveAt.getMonth(), arriveAt.getDate());
    const end = new Date(departAt.getFullYear(), departAt.getMonth(), departAt.getDate());
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  window.Weather = { fetchWeather, getTravelDates };
})();
