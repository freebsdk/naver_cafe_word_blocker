const STORAGE_KEY = "blockedWords";

const form = document.querySelector("#blockForm");
const input = document.querySelector("#wordInput");
const list = document.querySelector("#wordList");
const emptyMessage = document.querySelector("#emptyMessage");

async function loadWords() {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: [] });
  return normalizeWords(result[STORAGE_KEY]);
}

async function saveWords(words) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalizeWords(words) });
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
    normalized.push(value);
  }

  return normalized;
}

function render(words) {
  list.replaceChildren();
  emptyMessage.hidden = words.length > 0;

  for (const word of words) {
    const item = document.createElement("li");
    item.className = "word-item";

    const text = document.createElement("span");
    text.className = "word-text";
    text.textContent = word;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `${word} 삭제`);
    remove.addEventListener("click", async () => {
      const current = await loadWords();
      const next = current.filter((itemWord) => itemWord !== word);
      await saveWords(next);
      render(next);
    });

    item.append(text, remove);
    list.append(item);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const word = input.value.trim();
  if (!word) {
    return;
  }

  const current = await loadWords();
  const exists = current.some(
    (item) => item.toLocaleLowerCase("ko-KR") === word.toLocaleLowerCase("ko-KR")
  );

  if (exists) {
    return;
  }

  const next = [...current, word];
  await saveWords(next);
  input.value = "";
  input.focus();
  render(next);
});

loadWords().then(render);
