const STORAGE_KEY = "blockedWords";
const HIDDEN_ATTR = "data-naver-cafe-blocked";

let blockedWords = [];
let scanTimer = 0;

init();

async function init() {
  blockedWords = await loadWords();
  scanSoon();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[STORAGE_KEY]) {
      return;
    }

    blockedWords = normalizeWords(changes[STORAGE_KEY].newValue);
    revealPreviouslyHidden();
    scanSoon();
  });

  const observer = new MutationObserver(() => scanSoon());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

async function loadWords() {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: [] });
  return normalizeWords(result[STORAGE_KEY]);
}

function normalizeWords(words) {
  if (!Array.isArray(words)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const word of words) {
    const value = String(word).trim();
    const key = value.toLocaleLowerCase("ko-KR");

    if (!value || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}

function scanSoon() {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(hideMatchingPosts, 120);
}

function hideMatchingPosts() {
  if (blockedWords.length === 0) {
    revealPreviouslyHidden();
    return;
  }

  const links = [...document.querySelectorAll("a")].filter(isPostLinkCandidate);

  for (const link of links) {
    const container = findPostContainer(link);
    if (!container || container.getAttribute(HIDDEN_ATTR) === "true") {
      continue;
    }

    const text = getComparableText(container);
    if (blockedWords.some((word) => text.includes(word))) {
      container.setAttribute(HIDDEN_ATTR, "true");
      container.style.setProperty("display", "none", "important");
    }
  }
}

function isPostLinkCandidate(link) {
  const text = link.innerText.trim();
  const href = link.href || "";

  if (text.length < 2) {
    return false;
  }

  return (
    href.includes("/articles/") ||
    href.includes("articleid=") ||
    link.closest("li, tr, [role='listitem']") !== null
  );
}

function findPostContainer(link) {
  const preferred = link.closest([
    "li",
    "tr",
    "[role='listitem']",
    "[class*='ArticleItem']",
    "[class*='article_item']",
    "[class*='PostItem']",
    "[class*='post_item']",
    "[class*='BoardItem']",
    "[class*='board_item']"
  ].join(","));

  if (isReasonablePostContainer(preferred)) {
    return preferred;
  }

  let current = link.parentElement;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (isReasonablePostContainer(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function isReasonablePostContainer(element) {
  if (!element || element === document.body || element === document.documentElement) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const text = element.innerText?.trim() || "";

  return text.length >= 2 && rect.height > 8 && rect.height < 220 && rect.width > 120;
}

function getComparableText(element) {
  return (element.innerText || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("ko-KR");
}

function revealPreviouslyHidden() {
  for (const element of document.querySelectorAll(`[${HIDDEN_ATTR}='true']`)) {
    element.removeAttribute(HIDDEN_ATTR);
    element.style.removeProperty("display");
  }
}
