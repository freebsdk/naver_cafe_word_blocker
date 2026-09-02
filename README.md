# Naver cafe blocker

Naver Cafe posts are hidden from the list page when either condition matches:

- The post title contains a saved blocked word.
- The writer nickname exactly matches a saved blocked author.

Member-level badges next to nicknames are ignored when matching authors.

## Install

1. Open `chrome://extensions`.
2. Enable developer mode.
3. Click "Load unpacked".
4. Select `D:\dev4\bdscafe_ext`.

## Use

Open the extension popup and choose a tab:

- `단어차단`: add a word or phrase contained in a post title.
- `작성자`: add the exact writer nickname to block.

Changes are applied to open Naver Cafe list pages immediately.
