// 확정 여행 일정 (자동 생성이 아닌 직접 짠 일정)
// stop에 lat/lng가 없으면 지도 마커 없이 일정표에만 표시 (이동·체크인 등)
// priority: 예약완료 | 확인필요 | 선택

const FLORENCE_HOTEL = { name: 'Solo Experience Hotel', note: 'SMN역 도보 5분' };
const MILAN_HOTEL = { name: 'NYX Hotel Milan', note: '중앙역 앞', lat: 45.4853, lng: 9.2024 };

window.TRIPS = {
  italy: {
    title: '🇮🇹 이탈리아 11일 여행 ✈️',
    subtitle: '로마 → 피렌체 → 밀라노 → 로마 · 11/18(수) → 11/28(토)',
    center: [43.2, 11.8],
    zoom: 6,
    weatherCities: {
      rome: [41.9028, 12.4964],
      florence: [43.7696, 11.2558],
      milan: [45.4642, 9.1900]
    },
    days: [
      {
        day: 1, date: '2026-11-18', label: '11/18 수', city: 'rome', emoji: '🛬', theme: '로마 도착', hotel: { name: 'The Liberty Boutique Hotel' },
        stops: [
          { time: '14:05', emoji: '✈️', name: '인천 출발', desc: '인천 → 로마 직항' },
          { time: '19:35', emoji: '🛬', name: '로마 피우미치노 공항 (FCO)', lat: 41.8003, lng: 12.2389, desc: '도착 후 택시로 시내 이동', memo: '택시 40~50분, 시내 고정요금 확인 후 탑승' },
          { time: '저녁', emoji: '🏨', name: 'The Liberty Boutique Hotel 체크인', desc: '첫날은 푹 쉬기' }
        ]
      },
      {
        day: 2, date: '2026-11-19', label: '11/19 목', city: 'rome', emoji: '🇻🇦', hotel: { name: 'The Liberty Boutique Hotel' }, theme: '바티칸 & 로마 중심가',
        stops: [
          { time: '오전', emoji: '🖼️', name: '바티칸 박물관', lat: 41.9065, lng: 12.4536, desc: '가이드 투어: 바티칸 베스트 트랙', priority: '예약완료' },
          { time: '오전', emoji: '🎨', name: '시스티나 성당', lat: 41.9029, lng: 12.4545, desc: '미켈란젤로 천장화·최후의 심판' },
          { time: '오후', emoji: '⛪', name: '성 베드로 대성당', lat: 41.9022, lng: 12.4539, desc: '세계 최대 성당, 피에타' },
          { time: '오후', emoji: '🕊️', name: '성 베드로 광장', lat: 41.9022, lng: 12.4573, desc: '베르니니 열주 광장' },
          { time: '오후', emoji: '🏛️', name: '베네치아 광장', lat: 41.8960, lng: 12.4823, desc: '비토리오 에마누엘레 2세 기념관' },
          { time: '저녁', emoji: '⛲', name: '트레비 분수', lat: 41.9009, lng: 12.4833, desc: '동전 던지기', memo: '분수 앞 구역 입장 €2' },
          { time: '저녁', emoji: '🏛️', name: '판테온', lat: 41.8986, lng: 12.4769, desc: '2000년 된 돔 신전', memo: '입장 €5' },
          { time: '저녁', emoji: '🎭', name: '나보나 광장', lat: 41.8992, lng: 12.4731, desc: '베르니니 4대강 분수, 야경 산책' }
        ]
      },
      {
        day: 3, date: '2026-11-20', label: '11/20 금', city: 'florence', emoji: '🚄', hotel: FLORENCE_HOTEL, theme: '로마 → 피렌체',
        stops: [
          { time: '오전', emoji: '🚉', name: '로마 테르미니역', lat: 41.9010, lng: 12.5016, desc: '고속열차로 피렌체 이동', priority: '예약완료' },
          { time: '+1시간30분', emoji: '🚉', name: '피렌체 산타 마리아 노벨라역 (SMN)', lat: 43.7764, lng: 11.2480, desc: '숙소 Solo Experience Hotel까지 도보 5분' },
          { time: '오후', emoji: '⛪', name: '산타 마리아 노벨라 성당', lat: 43.7747, lng: 11.2493, desc: '역 앞 고딕 성당' },
          { time: '오후', emoji: '🏰', name: '산 로렌초 성당', lat: 43.7749, lng: 11.2540, desc: '메디치 가문의 성당' },
          { time: '오후', emoji: '👑', name: '메디치 예배당', lat: 43.7752, lng: 11.2534, desc: '미켈란젤로 조각, 메디치 묘소' },
          { time: '오후', emoji: '🌸', name: '피렌체 두오모', lat: 43.7731, lng: 11.2560, desc: '산타 마리아 델 피오레 대성당', memo: '일요일은 관광 입장이 제한돼서 내부는 오늘 보기' },
          { time: '저녁', emoji: '🗿', name: '시뇨리아 광장', lat: 43.7696, lng: 11.2558, desc: '베키오 궁전·야외 조각 전시' },
          { time: '저녁', emoji: '🌉', name: '베키오 다리', lat: 43.7680, lng: 11.2531, desc: '아르노강 위 보석 가게 다리' }
        ]
      },
      {
        day: 4, date: '2026-11-21', label: '11/21 토', city: 'florence', emoji: '🛍️', hotel: FLORENCE_HOTEL, theme: '더 몰 피렌체 아울렛',
        stops: [
          { time: '08:40 · 09:10 · 10:00', emoji: '🚌', name: '몬텔룽고 광장 버스 정류장', lat: 43.7776, lng: 11.2468, desc: 'SMN역 근처, 아울렛 직행버스 (왕복 €18)', priority: '확인필요' },
          { time: '종일', emoji: '🛍️', name: '더 몰 피렌체 (The Mall Firenze)', lat: 43.7022, lng: 11.4466, desc: '명품 아울렛 쇼핑' }
        ]
      },
      {
        day: 5, date: '2026-11-22', label: '11/22 일', city: 'florence', emoji: '🎨', hotel: FLORENCE_HOTEL, theme: '우피치 & 미켈란젤로 광장',
        stops: [
          { time: '오전', emoji: '🖼️', name: '우피치 미술관', lat: 43.7678, lng: 11.2553, desc: '가이드 투어 2~3시간, 보티첼리 「비너스의 탄생」', priority: '예약완료' },
          { time: '오후', emoji: '🌸', name: '피렌체 두오모', lat: 43.7731, lng: 11.2560, desc: '광장과 외관 다시 보기' },
          { time: '오후', emoji: '⛪', name: '산타 크로체 성당', lat: 43.7686, lng: 11.2622, desc: '미켈란젤로·갈릴레오 묘소' },
          { time: '오후', emoji: '🗿', name: '시뇨리아 광장', lat: 43.7696, lng: 11.2558, desc: '낮의 시뇨리아 광장' },
          { time: '오후', emoji: '🌉', name: '베키오 다리', lat: 43.7680, lng: 11.2531, desc: '건너서 미켈란젤로 광장 방향으로' },
          { time: '16:00', emoji: '🌅', name: '미켈란젤로 광장', lat: 43.7629, lng: 11.2650, desc: '피렌체 전경 노을', memo: '일몰 16:50쯤, 딱 맞는 시간' }
        ]
      },
      {
        day: 6, date: '2026-11-23', label: '11/23 월', city: 'milan', emoji: '🚄', hotel: MILAN_HOTEL, theme: '피렌체 → 밀라노',
        stops: [
          { time: '오전', emoji: '🚉', name: '피렌체 SMN역', lat: 43.7764, lng: 11.2480, desc: '고속열차로 밀라노 이동', priority: '예약완료' },
          { time: '+2시간', emoji: '🚉', name: '밀라노 중앙역 (Centrale)', lat: 45.4862, lng: 9.2045, desc: '밀라노 도착' },
          { time: '체크인', emoji: '🏨', name: 'NYX Hotel Milan', lat: MILAN_HOTEL.lat, lng: MILAN_HOTEL.lng, desc: '중앙역 바로 앞, 11/23~25 2박', priority: '예약완료' },
          { time: '오후', emoji: '⛪', name: '두오모 광장', lat: 45.4641, lng: 9.1919, desc: '밀라노 대성당', memo: '옥상 테라스는 온라인 예매 추천' },
          { time: '오후', emoji: '🛍️', name: '갤러리아 비토리오 에마누엘레 2세', lat: 45.4659, lng: 9.1900, desc: '유리 돔 쇼핑 아케이드, 황소 모자이크' },
          { time: '저녁', emoji: '🎭', name: '스칼라 극장 (외관)', lat: 45.4674, lng: 9.1895, desc: '세계 3대 오페라 극장' },
          { time: '19:00~21:00', emoji: '🍝', name: '다 자코모 아렌가리오 (da Giacomo Arengario)', lat: 45.4637, lng: 9.1903, desc: '두오모 광장 옆 노베첸토 미술관 건물, 4인 · 실내석(Sala Interna)', priority: '예약완료', memo: '테라스에서 두오모 뷰' }
        ]
      },
      {
        day: 7, date: '2026-11-24', label: '11/24 화', city: 'milan', emoji: '🛍️', hotel: MILAN_HOTEL, theme: '세라발레 아울렛',
        stops: [
          { time: '09:00 · 09:30 · 10:00', emoji: '🚌', name: '아울렛 왕복버스 출발', desc: '밀라노 시내 출발', priority: '확인필요' },
          { time: '종일', emoji: '🛍️', name: '세라발레 디자이너 아울렛', lat: 44.7225, lng: 8.8578, desc: '유럽 최대 규모 아울렛' }
        ]
      },
      {
        day: 8, date: '2026-11-25', label: '11/25 수', city: 'rome', emoji: '🚄', theme: '밀라노 → 로마',
        stops: [
          { time: '오전', emoji: '🚉', name: '밀라노 중앙역 (Centrale)', lat: 45.4862, lng: 9.2045, desc: '고속열차로 로마 이동', priority: '예약완료' },
          { time: '+3시간', emoji: '🚉', name: '로마 테르미니역', lat: 41.9010, lng: 12.5016, desc: '로마 도착, 숙소 체크인' }
        ]
      },
      {
        day: 9, date: '2026-11-26', label: '11/26 목', city: 'rome', emoji: '🏟️', theme: '고대 로마',
        stops: [
          { time: '오전', emoji: '🏟️', name: '콜로세움', lat: 41.8902, lng: 12.4922, desc: '입장권만 예매 (가이드 없음)', priority: '예약완료' },
          { time: '오후', emoji: '🏛️', name: '포로 로마노', lat: 41.8925, lng: 12.4853, desc: '고대 로마의 중심 광장' },
          { time: '오후', emoji: '🌿', name: '팔라티노 언덕', lat: 41.8894, lng: 12.4875, desc: '황제 궁전 터, 포로 로마노 전망' }
        ]
      },
      {
        day: 10, date: '2026-11-27', label: '11/27 금', city: 'rome', emoji: '🌊', theme: '남부 1일 투어 (선택)',
        stops: [
          { time: '이른 아침', emoji: '🚌', name: '로마 출발', desc: '남부 1일 투어', priority: '선택', memo: '아직 미예약 · 안 가면 블랙프라이데이 쇼핑' },
          { time: '오전', emoji: '🌋', name: '폼페이 유적', lat: 40.7489, lng: 14.4848, desc: '화산재에 묻힌 고대 도시' },
          { time: '오후', emoji: '🏘️', name: '포지타노', lat: 40.6281, lng: 14.4850, desc: '절벽 위 파스텔 마을' },
          { time: '오후', emoji: '🍋', name: '아말피', lat: 40.6340, lng: 14.6027, desc: '아말피 해안, 레몬 마을' },
          { time: '밤', emoji: '🚌', name: '로마 복귀' }
        ]
      },
      {
        day: 11, date: '2026-11-28', label: '11/28 토', city: 'rome', emoji: '🛫', theme: '출국',
        stops: [
          { time: '낮', emoji: '🧳', name: '체크아웃 & 자유 일정', desc: '짐은 테르미니역 짐 보관소에 맡기기' },
          { time: '22:00', emoji: '🛫', name: '로마 피우미치노 공항 (FCO)', lat: 41.8003, lng: 12.2389, desc: '로마 → 인천, 다음날 17:25 도착' }
        ]
      }
    ]
  }
};
