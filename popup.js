const sections = [
  {
    storageKey: "blockedWords",
    form: document.querySelector("#wordForm"),
    input: document.querySelector("#wordInput"),
    list: document.querySelector("#wordList"),
    emptyMessage: document.querySelector("#wordEmptyMessage")
  },
  {
    storageKey: "blockedAuthors",
    form: document.querySelector("#authorForm"),
    input: document.querySelector("#authorInput"),
    list: document.querySelector("#authorList"),
    emptyMessage: document.querySelector("#authorEmptyMessage")
  }
];

const tabs = [...document.querySelectorAll("[role='tab']")];

async function loadValues(storageKey) {
  const result = await chrome.storage.sync.get({ [storageKey]: [] });
  return normalizeValues(result[storageKey]);
}

async function saveValues(storageKey, values) {
  await chrome.storage.sync.set({ [storageKey]: normalizeValues(values) });
}

function normalizeValues(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const item of values) {
    const value = String(item).trim();
    const key = value.toLocaleLowerCase("ko-KR");

    if (!value || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(value);
  }

  return normalized;
}

function render(section, values) {
  section.list.replaceChildren();
  section.emptyMessage.hidden = values.length > 0;

  for (const value of values) {
    const item = document.createElement("li");
    item.className = "block-item";

    const text = document.createElement("span");
    text.className = "block-text";
    text.textContent = value;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `${value} 삭제`);
    remove.addEventListener("click", async () => {
      const current = await loadValues(section.storageKey);
      const targetKey = value.toLocaleLowerCase("ko-KR");
      const next = current.filter(
        (itemValue) => itemValue.toLocaleLowerCase("ko-KR") !== targetKey
      );
      await saveValues(section.storageKey, next);
      render(section, next);
    });

    item.append(text, remove);
    section.list.append(item);
  }
}

function activateTab(nextTab, focusTab = false) {
  for (const tab of tabs) {
    const isSelected = tab === nextTab;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
    document.querySelector(`#${tab.dataset.panel}`).hidden = !isSelected;
  }

  if (focusTab) {
    nextTab.focus();
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    activateTab(tabs[nextIndex], true);
  });
}

for (const section of sections) {
  section.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const value = section.input.value.trim();
    if (!value) {
      return;
    }

    const current = await loadValues(section.storageKey);
    const valueKey = value.toLocaleLowerCase("ko-KR");
    const exists = current.some(
      (item) => item.toLocaleLowerCase("ko-KR") === valueKey
    );

    if (exists) {
      section.input.select();
      return;
    }

    const next = [...current, value];
    await saveValues(section.storageKey, next);
    section.input.value = "";
    section.input.focus();
    render(section, next);
  });
}

Promise.all(
  sections.map(async (section) => {
    render(section, await loadValues(section.storageKey));
  })
);
