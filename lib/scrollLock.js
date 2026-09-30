// 팝업, 모달, 이미지 라이트박스가 열렸을 때 뒷배경 페이지 스크롤을 완전히 차단하고,
// 닫혔을 때 원래 스크롤 상태로 복원하는 유틸리티.

let lockCount = 0;
let prevBodyOverflow = "";
let prevHtmlOverflow = "";
let prevBodyPaddingRight = "";

export function lockScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  lockCount++;
  if (lockCount === 1) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    prevBodyOverflow = document.body.style.overflow;
    prevHtmlOverflow = document.documentElement.style.overflow;
    prevBodyPaddingRight = document.body.style.paddingRight;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // 데스크톱에서 스크롤바가 사라지면서 콘텐츠가 우측으로 튀는 현상 방지
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    unlockScroll();
  };
}

export function unlockScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = prevBodyOverflow;
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.style.paddingRight = prevBodyPaddingRight;
  }
}
