import assert from "node:assert/strict";
import test from "node:test";
import { lockScroll, unlockScroll } from "../lib/scrollLock.js";

test("scrollLock: browser environment mockup - locks and restores html/body overflow", () => {
  // Mock window & document
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  const mockHtml = { style: { overflow: "" }, clientWidth: 1000 };
  const mockBody = { style: { overflow: "", paddingRight: "" } };

  globalThis.window = { innerWidth: 1015 };
  globalThis.document = {
    documentElement: mockHtml,
    body: mockBody,
  };

  try {
    // 1) First lock
    const release1 = lockScroll();
    assert.equal(mockHtml.style.overflow, "hidden");
    assert.equal(mockBody.style.overflow, "hidden");
    assert.equal(mockBody.style.paddingRight, "15px"); // 1015 - 1000 = 15px scrollbar width compensation

    // 2) Nested lock (second modal/popup opens)
    const release2 = lockScroll();
    assert.equal(mockHtml.style.overflow, "hidden");
    assert.equal(mockBody.style.overflow, "hidden");

    // 3) Releasing one nested lock keeps background locked
    release2();
    assert.equal(mockHtml.style.overflow, "hidden");
    assert.equal(mockBody.style.overflow, "hidden");
    assert.equal(mockBody.style.paddingRight, "15px");

    // 4) Releasing the final lock restores original styles
    release1();
    assert.equal(mockHtml.style.overflow, "");
    assert.equal(mockBody.style.overflow, "");
    assert.equal(mockBody.style.paddingRight, "");
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

test("scrollLock: idempotent release handling", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  const mockHtml = { style: { overflow: "visible" }, clientWidth: 1000 };
  const mockBody = { style: { overflow: "auto", paddingRight: "0px" } };

  globalThis.window = { innerWidth: 1000 };
  globalThis.document = {
    documentElement: mockHtml,
    body: mockBody,
  };

  try {
    const release = lockScroll();
    assert.equal(mockHtml.style.overflow, "hidden");
    assert.equal(mockBody.style.overflow, "hidden");

    // Double release should not error or underflow count
    release();
    release();
    assert.equal(mockHtml.style.overflow, "visible");
    assert.equal(mockBody.style.overflow, "auto");
    assert.equal(mockBody.style.paddingRight, "0px");
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
