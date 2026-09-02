const WORD_STORAGE_KEY = "blockedWords";
const AUTHOR_STORAGE_KEY = "blockedAuthors";
const HIDDEN_ATTR = "data-naver-cafe-blocked";

let blockedWords = [];
let blockedAuthors = [];
let scanTimer = 0;

init();

async function init() {
  const blockedEntries = await loadBlockedEntries();
  blockedWords = blockedEntries.words;
  blockedAuthors = blockedEntries.authors;
  scanSoon();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName !== "sync" ||
      (!changes[WORD_STORAGE_KEY] && !changes[AUTHOR_STORAGE_KEY])
    ) {
      return;
    }

    if (changes[WORD_STORAGE_KEY]) {
      blockedWords = normalizeEntries(changes[WORD_STORAGE_KEY].newValue);
    }

    if (changes[AUTHOR_STORAGE_KEY]) {
      blockedAuthors = normalizeEntries(changes[AUTHOR_STORAGE_KEY].newValue);
    }

    revealPreviouslyHidden();
    scanSoon();
  });

  const observer = new MutationObserver(() => scanSoon());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

async function loadBlockedEntries() {
  const result = await chrome.storage.sync.get({
    [WORD_STORAGE_KEY]: [],
    [AUTHOR_STORAGE_KEY]: []
  });

  return {
    words: normalizeEntries(result[WORD_STORAGE_KEY]),
    authors: normalizeEntries(result[AUTHOR_STORAGE_KEY])
  };
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const entry of entries) {
    const value = String(entry).trim();
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
  if (blockedWords.length === 0 && blockedAuthors.length === 0) {
    revealPreviouslyHidden();
    return;
  }

  const links = [...document.querySelectorAll("a")].filter(isPostLinkCandidate);
  const processedContainers = new Set();

  for (const link of links) {
    const container = findPostContainer(link);
    if (
      !container ||
      processedContainers.has(container) ||
      container.getAttribute(HIDDEN_ATTR) === "true"
    ) {
      continue;
    }

    processedContainers.add(container);

    const title = getComparableText(link);
    const author = getAuthorName(container);
    const isBlockedByWord = blockedWords.some((word) => title.includes(word));
    const isBlockedByAuthor = blockedAuthors.some(
      (blockedAuthor) => author === blockedAuthor
    );

    if (isBlockedByWord || isBlockedByAuthor) {
      container.setAttribute(HIDDEN_ATTR, "true");
      container.style.setProperty("display", "none", "important");
    }
  }
}

function isPostLinkCandidate(link) {
  const text = link.innerText.trim();
  const href = link.href || "";

  if (
    text.length < 2 ||
    link.matches(".cmt, [class*='comment'], [class*='Comment']") ||
    href.includes("commentFocus=true")
  ) {
    return false;
  }

  return (
    href.includes("/articles/") ||
    href.includes("articleid=")
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

function getAuthorName(container) {
  const nickname = container.querySelector([
    ".ArticleBoardWriterInfo .nickname",
    ".nick_btn .nickname",
    "[class*='WriterInfo'] .nickname",
    "[class*='writer_info'] .nickname"
  ].join(","));

  // Read only the nickname element. The sibling level icon and its
  // screen-reader text (for example, "멤버등급 : VIP회원") are excluded.
  return nickname ? getComparableText(nickname) : "";
}

function revealPreviouslyHidden() {
  for (const element of document.querySelectorAll(`[${HIDDEN_ATTR}='true']`)) {
    element.removeAttribute(HIDDEN_ATTR);
    element.style.removeProperty("display");
  }
}
