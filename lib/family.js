"use client";

export const MOODS = [
  ["😊", "좋음"],
  ["🥰", "행복"],
  ["😆", "신남"],
  ["😌", "평온"],
  ["😐", "그냥"],
  ["😴", "피곤"],
  ["😢", "슬픔"],
  ["😠", "화남"],
  ["🤒", "아픔"],
];

export const REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🙏"];
export const PROFILE_EMOJIS = ["👩", "👨", "👧", "👦", "👵", "👴", "🧒", "👶", "🐶", "🐱", "🐻", "🐰", "🦊", "🐼", "🌸", "⭐"];
export const PROFILE_COLORS = ["#ff5a36", "#f59e0b", "#10b981", "#0ea5e9", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6"];
export const MAX_FILE = 25 * 1024 * 1024;

export function fileUrl(id, variant) {
  return `/api/family/files/${id}${variant ? `?v=${variant}` : ""}`;
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// 캔버스로 줄일 수 있는 형식. GIF는 움직임이 사라지므로 원본 그대로 둔다.
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);
const PREVIEW_SIDE = 1600;
const THUMB_SIDE = 640;
// 아이폰 HEIC는 다른 브라우저가 못 여니 JPEG로 바꿔 올린다. 이때 긴 변 최대 크기.
const CONVERT_SIDE = 4096;

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(img, maxSide, type, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (type === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// WebP로 만들고, 브라우저가 WebP 저장을 못 하면(구형 사파리) JPEG로 만든다
async function variant(img, maxSide) {
  const webp = await encode(img, maxSide, "image/webp", 0.82);
  return webp?.type === "image/webp" ? webp : encode(img, maxSide, "image/jpeg", 0.85);
}

// 원본과 화면용(1600px)·썸네일(640px) 사본을 준비한다. 사진이 아니거나 열 수 없으면 원본만.
export async function prepareFile(file) {
  const type = (file.type || "").toLowerCase();
  const isHeic = type === "image/heic" || type === "image/heif" || /\.hei[cf]$/i.test(file.name);
  if (!RESIZABLE.has(type) && !isHeic) return { file };
  let img;
  try {
    img = await loadImage(file);
  } catch {
    return { file };
  }
  let original = file;
  if (isHeic) {
    const jpeg = await encode(img, CONVERT_SIDE, "image/jpeg", 0.9);
    if (!jpeg) return { file };
    original = new File([jpeg], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  }
  const [preview, thumb] = await Promise.all([variant(img, PREVIEW_SIDE), variant(img, THUMB_SIDE)]);
  if (!preview || !thumb) return { file: original };
  return { file: original, preview, thumb, width: img.naturalWidth, height: img.naturalHeight };
}

// 진행률을 알려 주며 파일을 올린다 (fetch는 업로드 진행률을 알 수 없어 XHR을 쓴다)
export function uploadFile(prepared, onProgress) {
  const form = new FormData();
  form.append("file", prepared.file, prepared.file.name);
  if (prepared.preview) {
    const ext = prepared.preview.type === "image/webp" ? "webp" : "jpg";
    form.append("preview", prepared.preview, `preview.${ext}`);
    form.append("thumb", prepared.thumb, `thumb.${ext}`);
    form.append("width", String(prepared.width));
    form.append("height", String(prepared.height));
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/family/files");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data.file);
      else reject(new Error(data.error || `업로드 실패 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드하지 못했어요."));
    xhr.send(form);
  });
}

// ---------- 우리집 보드 ----------

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
// 월요일부터 보여 준다
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const NOTE_CATEGORIES = [
  ["contact", "🏥 병원·연락처"],
  ["school", "🏫 학교·학원"],
  ["home", "🏠 집 관리"],
  ["health", "💊 건강·약"],
  ["rules", "📜 가족 규칙"],
  ["etc", "📝 기타"],
];

export const DATE_KINDS = [
  ["birthday", "🎂", "생일"],
  ["anniversary", "💍", "기념일"],
  ["memorial", "🕯️", "제사·기일"],
  ["other", "📅", "기타"],
];

export const REPEATS = [
  ["none", "한 번"],
  ["weekly", "매주"],
  ["biweekly", "격주"],
  ["monthly", "매월"],
];

export function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function mondayOf(day) {
  const wd = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((wd + 6) % 7));
}

export function weekdayOf(day) {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function dDayLabel(n) {
  return n === 0 ? "오늘" : `D-${n}`;
}

// 몇 번째 생일·주년·기일인지
export function countLabel(kind, count) {
  if (!count || count < 1) return "";
  if (kind === "birthday") return `${count}번째 생일`;
  if (kind === "anniversary") return `${count}주년`;
  if (kind === "memorial") return `${count}주기`;
  return "";
}

export function repeatLabel(t) {
  const days = WEEK_ORDER.filter((d) => t.weekdays.includes(d)).map((d) => WEEKDAY_LABELS[d]).join("·");
  if (t.repeat === "weekly") return `매주 ${days}`;
  if (t.repeat === "biweekly") return `격주 ${days}`;
  if (t.repeat === "monthly") return `매월 ${t.monthDay}일`;
  return "";
}
