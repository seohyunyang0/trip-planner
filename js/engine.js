// 동선 생성 엔진
// input: { cityKey, days, companion, arriveAt: Date, departAt: Date, hotelArea }
// output: { city, days: [{ day, theme, stops: [...] }] }

(function() {
  const HOUR = 60; // 분

  function pad(n) { return String(n).padStart(2, '0'); }
  function toHHMM(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${pad(h)}:${pad(m)}`;
  }
  function rangeStr(start, dur) {
    return `${toHHMM(start)}~${toHHMM(start + dur)}`;
  }

  function distance(a, b) {
    const dy = a.lat - b.lat;
    const dx = a.lng - b.lng;
    return Math.sqrt(dy*dy + dx*dx);
  }

  // 동행자 적합도 (0~3) → 가중치
  function fitScore(poi, companion) {
    return (poi.fit && poi.fit[companion]) || 1;
  }

  // 시간대 매칭 점수
  function timeOfDayScore(poi, hourBlock) {
    if (poi.timeOfDay === 'anytime') return 1;
    return poi.timeOfDay === hourBlock ? 2 : 0.3;
  }

  function pickHourBlock(mins) {
    const h = Math.floor(mins / 60) % 24;
    if (h < 11) return 'morning';
    if (h < 16) return 'afternoon';
    if (h < 19) return 'evening';
    return 'night';
  }

  // POI 분류: 일자별 area 기반 클러스터링
  function clusterByArea(pois, numDays, hotelArea) {
    // area별 POI 그룹화
    const areaMap = new Map();
    pois.forEach(p => {
      if (!areaMap.has(p.area)) areaMap.set(p.area, []);
      areaMap.get(p.area).push(p);
    });

    // area별 POI 점수 합산 (얼마나 핵심 area인지)
    const areas = Array.from(areaMap.entries()).map(([area, list]) => ({
      area,
      pois: list,
      weight: list.length,
      // hotel area는 가중치 ↑ (마지막 날에 배치하기 좋음)
      isHotel: area === hotelArea
    }));

    // 비중 큰 순으로 정렬
    areas.sort((a, b) => b.weight - a.weight);

    // numDays개의 일자 버킷으로 분배 (greedy)
    const buckets = Array.from({ length: numDays }, () => ({ areas: [], pois: [], weight: 0 }));

    // 호텔 area는 첫째날/마지막날에 배치
    const hotelAreas = areas.filter(a => a.isHotel);
    const otherAreas = areas.filter(a => !a.isHotel);

    if (hotelAreas.length && numDays >= 2) {
      // 첫째날에 호텔 area 일부, 마지막날에 호텔 area 일부
      buckets[0].areas.push(hotelAreas[0]);
      buckets[0].pois.push(...hotelAreas[0].pois);
      buckets[0].weight += hotelAreas[0].weight;
      if (numDays >= 2) {
        buckets[numDays - 1].areas.push(hotelAreas[0]);
        // 마지막날엔 POI 일부만 (쇼핑/카페 위주)
        const lastDayPois = hotelAreas[0].pois.filter(p => ['쇼핑', '카페', '맛집'].includes(p.category));
        buckets[numDays - 1].pois.push(...lastDayPois);
        buckets[numDays - 1].weight += lastDayPois.length;
      }
    } else if (hotelAreas.length) {
      buckets[0].areas.push(hotelAreas[0]);
      buckets[0].pois.push(...hotelAreas[0].pois);
      buckets[0].weight += hotelAreas[0].weight;
    }

    // 나머지 area들을 weight 균형 맞춰 분배
    otherAreas.forEach(a => {
      // 가장 weight 적은 버킷 (단, 첫째날·마지막날은 도착/출국으로 짧으니 제외)
      let candidateIndices = buckets.map((_, i) => i);
      if (numDays >= 2) {
        // 마지막날 제외 (출국 준비)
        candidateIndices = candidateIndices.slice(0, numDays - 1);
      }
      // 첫째날에 호텔 area가 이미 있으면 첫째날도 적게
      const target = candidateIndices.reduce((min, i) =>
        buckets[i].weight < buckets[min].weight ? i : min,
        candidateIndices[0]
      );
      buckets[target].areas.push(a);
      buckets[target].pois.push(...a.pois);
      buckets[target].weight += a.weight;
    });

    return buckets;
  }

  // 한 일자의 POI 후보 중에서 시간 슬롯에 맞춰 일정 짜기
  function buildDaySchedule(dayBucket, opts) {
    const { dayIndex, totalDays, companion, dayStart, dayEnd, hotelLatLng, isArrival, isDeparture, arriveAt, departAt, airport, hotelArea, hotelPois } = opts;

    let cursor = dayStart;
    const scheduled = [];

    // 도착일: 공항→호텔 추가
    if (isArrival && airport && arriveAt) {
      const arriveMins = arriveAt.getHours() * 60 + arriveAt.getMinutes();
      const transitDur = airport.transitToCity;
      scheduled.push({
        time: rangeStr(arriveMins, transitDur),
        emoji: '✈️',
        name: `${airport.name} → ${hotelArea}`,
        lat: airport.lat,
        lng: airport.lng,
        desc: `공항 도착 후 ${hotelArea} 이동`,
        memo: `약 ${transitDur}분 소요`,
        category: '이동',
        priority: '필수'
      });
      cursor = arriveMins + transitDur;
      // 체크인
      const checkinDur = 30;
      scheduled.push({
        time: rangeStr(cursor, checkinDur),
        emoji: '🏨',
        name: `${hotelArea} 숙소 체크인`,
        lat: hotelLatLng[0],
        lng: hotelLatLng[1],
        desc: '체크인 및 짐 정리',
        memo: '체력 아끼기',
        category: '숙소',
        priority: '필수'
      });
      cursor += checkinDur;
    }

    // 핵심 POI 채우기 (출국일이면 슬롯 적게)
    let remainingMins = dayEnd - cursor;
    if (isDeparture && departAt && airport) {
      const departMins = departAt.getHours() * 60 + departAt.getMinutes();
      // 공항 도착은 1시간 40분 전, 그 전에 공항 이동
      const flightCheckIn = departMins - 100;
      const airportTransit = flightCheckIn - airport.transitToCity;
      remainingMins = airportTransit - cursor - 30; // 짐 픽업 여유 30분
    }

    // POI 후보군: 동행자 적합도 + (이미 사용된 POI 제외)
    const candidates = dayBucket.pois
      .map(p => ({ ...p, _fit: fitScore(p, companion) }))
      .filter(p => p._fit >= 1)
      .sort((a, b) => b._fit - a._fit);

    // 그리디로 채우기: 현재 시간대 → 가장 가까운 + fit 높은 + 안 겹치는 POI
    const used = new Set();
    let lastLatLng = hotelLatLng;

    while (cursor + 30 < dayEnd && remainingMins > 30) {
      const hourBlock = pickHourBlock(cursor);
      // 출국일이면 cursor가 공항이동 전까지만
      if (isDeparture && cursor + 30 > dayEnd - 180) break;

      // 점수: fit * timeOfDay * (거리 페널티)
      const refLat = lastLatLng[0], refLng = lastLatLng[1];
      const ranked = candidates
        .filter(p => !used.has(p.name))
        .map(p => {
          const distPenalty = 1 / (1 + distance({ lat: refLat, lng: refLng }, p) * 20);
          const score = p._fit * timeOfDayScore(p, hourBlock) * distPenalty;
          return { ...p, _score: score };
        })
        .sort((a, b) => b._score - a._score);

      if (ranked.length === 0) break;
      const next = ranked[0];

      // 이동시간 추정 (직선거리 × 30분/도 단위 대충)
      const moveDist = distance({ lat: refLat, lng: refLng }, next);
      const moveTime = Math.max(10, Math.min(60, Math.round(moveDist * 600)));

      // 점심/저녁 시간 강제 삽입 (이미 맛집 카테고리가 아니면)
      const h = Math.floor(cursor / 60) % 24;
      if (h === 12 && !scheduled.slice(-1)[0]?.category?.includes('맛집') && next.category !== '맛집') {
        const lunch = candidates.find(p => p.category === '맛집' && !used.has(p.name) && fitScore(p, companion) >= 2);
        if (lunch) {
          used.add(lunch.name);
          scheduled.push({
            time: rangeStr(cursor, 60),
            emoji: lunch.emoji,
            name: lunch.name,
            lat: lunch.lat,
            lng: lunch.lng,
            desc: lunch.desc,
            memo: '점심 시간',
            category: lunch.category,
            priority: '필수',
            area: lunch.area
          });
          cursor += 60;
          lastLatLng = [lunch.lat, lunch.lng];
          continue;
        }
      }

      if (cursor + moveTime + next.duration > dayEnd) break;

      cursor += moveTime;
      used.add(next.name);
      scheduled.push({
        time: rangeStr(cursor, next.duration),
        emoji: next.emoji,
        name: next.name,
        lat: next.lat,
        lng: next.lng,
        desc: next.desc,
        memo: moveTime > 20 ? `이동 약 ${moveTime}분` : null,
        category: next.category,
        priority: next._fit >= 3 ? '필수' : (next._fit >= 2 ? '추천' : '선택'),
        area: next.area
      });
      cursor += next.duration;
      lastLatLng = [next.lat, next.lng];

      // 한 일자 최대 6개 POI
      if (scheduled.filter(s => !['이동', '숙소'].includes(s.category)).length >= 6) break;
    }

    // 출국일: 짐픽업 + 공항 이동
    if (isDeparture && departAt && airport) {
      const departMins = departAt.getHours() * 60 + departAt.getMinutes();
      const flightCheckIn = departMins - 100;
      const airportTransit = flightCheckIn - airport.transitToCity;

      scheduled.push({
        time: rangeStr(airportTransit - 30, 30),
        emoji: '🧳',
        name: '숙소/보관소 짐 픽업',
        lat: hotelLatLng[0],
        lng: hotelLatLng[1],
        desc: '체크아웃·짐 픽업',
        memo: '여유 있게',
        category: '숙소',
        priority: '필수'
      });
      scheduled.push({
        time: rangeStr(airportTransit, airport.transitToCity),
        emoji: '🚌',
        name: `${hotelArea} → ${airport.name}`,
        lat: airport.lat,
        lng: airport.lng,
        desc: `공항 이동 (약 ${airport.transitToCity}분)`,
        memo: `${toHHMM(departMins)} 출국 기준`,
        category: '이동',
        priority: '필수'
      });
      scheduled.push({
        time: rangeStr(flightCheckIn, 100),
        emoji: '✈️',
        name: '체크인·출국 수속·탑승',
        lat: airport.lat,
        lng: airport.lng,
        desc: '체크인부터 탑승까지',
        memo: '안녕 👋',
        category: '이동',
        priority: '필수'
      });
    }

    return scheduled;
  }

  // 일자별 테마 + 이모지 결정
  function themeForDay(dayBucket, dayIndex, totalDays, isArrival, isDeparture) {
    if (isArrival) return { emoji: '🛬', label: '도착 & 야간 적응' };
    if (isDeparture) return { emoji: '🛍️', label: '쇼핑 & 출국' };

    // 카테고리 분석
    const cats = {};
    dayBucket.pois.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const topCat = sorted[0]?.[0] || '관광';
    const areas = [...new Set(dayBucket.areas.map(a => a.area))].slice(0, 2).join(' · ');

    const emojiMap = {
      '관광': '🏯', '맛집': '🍜', '쇼핑': '🛍️', '카페': '☕',
      '야경': '🌃', '온천': '♨️', '체험': '🎢', '자연': '🌿', '이동': '🚄', '숙소': '🏨'
    };

    return { emoji: emojiMap[topCat] || '✨', label: `${areas} · ${topCat} 중심` };
  }

  function generateItinerary(input) {
    const { cityKey, days, companion, arriveAt, departAt, hotelArea } = input;
    const city = window.CITIES[cityKey];
    if (!city) throw new Error(`Unknown city: ${cityKey}`);

    const hotelLatLng = (() => {
      // 호텔 area의 평균 좌표
      const areaPois = city.pois.filter(p => p.area === hotelArea);
      if (!areaPois.length) return city.center;
      const lat = areaPois.reduce((s, p) => s + p.lat, 0) / areaPois.length;
      const lng = areaPois.reduce((s, p) => s + p.lng, 0) / areaPois.length;
      return [lat, lng];
    })();

    const buckets = clusterByArea(city.pois, days, hotelArea);

    const result = {
      city: { name: city.name, emoji: city.emoji, center: city.center, zoom: city.zoom },
      hotel: { area: hotelArea, lat: hotelLatLng[0], lng: hotelLatLng[1] },
      airport: city.airport,
      companion,
      days: []
    };

    for (let d = 0; d < days; d++) {
      const isArrival = d === 0;
      const isDeparture = d === days - 1;
      const dayBucket = buckets[d];

      // 시간 범위
      let dayStart, dayEnd;
      if (isArrival && arriveAt) {
        dayStart = arriveAt.getHours() * 60 + arriveAt.getMinutes();
        dayEnd = 22 * 60;
      } else if (isDeparture && departAt) {
        dayStart = 9 * 60;
        dayEnd = departAt.getHours() * 60 + departAt.getMinutes();
      } else {
        dayStart = 9 * 60;
        dayEnd = 21 * 60;
      }

      const stops = buildDaySchedule(dayBucket, {
        dayIndex: d,
        totalDays: days,
        companion,
        dayStart,
        dayEnd,
        hotelLatLng,
        isArrival,
        isDeparture,
        arriveAt,
        departAt,
        airport: city.airport,
        hotelArea,
        hotelPois: city.pois.filter(p => p.area === hotelArea)
      });

      const theme = themeForDay(dayBucket, d, days, isArrival, isDeparture);
      result.days.push({
        day: d + 1,
        emoji: theme.emoji,
        theme: theme.label,
        stops
      });
    }

    return result;
  }

  window.TripEngine = { generateItinerary };
})();
