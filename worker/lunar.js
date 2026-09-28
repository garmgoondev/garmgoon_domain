// 한국 음력(단기력) 변환. 런타임 ICU의 dangi 달력을 쓴다.
// 한국천문연구원 기준 데이터와 1950~2050년을 하루씩 비교했을 때 2017년 음력 1월 길이(한 달)만 달랐고,
// 2018년 이후는 모두 같았다. 기념일은 올해 이후 날짜만 계산하므로 이 방식으로 충분하다.

const fmt = new Intl.DateTimeFormat("en-u-ca-dangi", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
const DAY_MS = 86400000;
const cache = new Map();

function toMs(day) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// "YYYY-MM-DD" → { year, month, day, leap }
export function solarToLunar(day) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(toMs(day))).map((x) => [x.type, x.value]));
  return { year: Number(p.relatedYear), month: parseInt(p.month, 10), day: Number(p.day), leap: p.month.endsWith("bis") };
}

// 음력 year년 month월 day일(leap이면 윤달)의 양력 날짜. 그런 날이 없으면(작은달 30일 등) null.
export function lunarToSolar(year, month, day, leap = false) {
  const key = `${year}-${month}-${day}-${leap}`;
  if (cache.has(key)) return cache.get(key);
  // 음력 설은 양력 1월 21일 ~ 2월 20일 사이에 온다. 거기서 대략 몇 달 뒤인지 어림한 뒤 앞뒤를 찾는다.
  const guess = Date.UTC(year, 0, 21) + Math.round(((month - 1 + (leap ? 1 : 0)) * 29.53 + day + 15) * DAY_MS);
  let found = null;
  for (let i = 0; i <= 60 && !found; i++) {
    for (const t of i ? [guess - i * DAY_MS, guess + i * DAY_MS] : [guess]) {
      const l = solarToLunar(toDay(t));
      if (l.year === year && l.month === month && l.day === day && l.leap === leap) {
        found = toDay(t);
        break;
      }
    }
  }
  cache.set(key, found);
  return found;
}

// 매년 돌아오는 음력 기념일의 양력 날짜. 윤달이 아닌 평달 기준이고, 30일이 없는 해는 29일로 지낸다.
export function lunarAnniversary(year, month, day) {
  return lunarToSolar(year, month, day) || (day === 30 ? lunarToSolar(year, month, 29) : null);
}
