# Local Russian translation

Version 0.5.0 translates displayed website text and application menus into Russian. It starts disabled. Open **Translation → Translate into Russian**; use **Show original text** to restore the original display without reloading or contacting the model.

**Translation Settings…** controls machine-translated descriptions, a numeric local service port on Linux, names whose exact spelling should be preserved, and the cache. With descriptions disabled, the built-in D&D glossary still translates common labels and game terms. Russian passages, URLs, dice notation, and listed names are preserved. Short unknown labels and headings that look like names stay original; descriptive headings can use the model. Editable fields, code, hidden content, and login forms are excluded; newly visible text is revisited. Displayed `placeholder` and `data-placeholder` hints are translated without changing typed values. Titles, ARIA selectors, link destinations, login hints, and campaign records remain original. Text nodes up to 16,000 characters are segmented into bounded model batches.

The bundled Appearance and Translation settings use a pre-built Russian interface when translation is enabled, including help text, color/picture dialogs, previews, and the pinned Appearance button. These labels never require the model. Both settings windows follow the selected app theme, including live theme changes without losing an unsaved settings draft. **Show original text** switches them back to English without resetting unsaved appearance choices.

The site sets `translate="no"` on its document to disable browser translation. The app’s explicit translation toggle overrides this page-wide flag. Individual `translate="no"` / `notranslate` blocks, editors, names, and login fields remain protected. Version 0.2.1 corrected the earlier behavior that skipped the entire website because of this flag. Version 0.3.0 also ignores `aria-hidden` accessibility masking: opening a Radix popup leaves the visible background translated, even when it becomes inert. Actually hidden content remains excluded. Neutral portal menus follow the app theme, and custom dice palettes retain priority.

## Windows: translator included

The portable Windows x64 EXE includes embedded Python 3.14.8, CTranslate2 4.8.2, SentencePiece 0.2.2, and the Argos English–Russian 1.9 model. No Python, Docker, translator installation, or model download is required on the user's computer. Enable translation to start it automatically. The service warms up in the background; dictionary/glossary labels never wait for model loading.

The app owns the hidden Python child. It binds a random numeric loopback port and requires a fresh private token on every request. Browser-origin requests are rejected. Only the main process knows the endpoint and token; the website and settings renderer receive neither. Disabling model translation or closing the app stops the child; a parent-pipe watchdog also stops it after a parent crash. The app stores preferences/cache in the normal user-data directory; the embedded resources are never modified.

Build-time downloads are SHA-256 pinned in `scripts/windows-translator-lock.json`. `npm run dist:windows` verifies/prepares the runtime in `build/translator` and includes it as `resources/translator` outside ASAR. The package includes upstream licenses, model credits, and a per-file manifest. See [third-party notices](../translator/THIRD-PARTY-NOTICES.md).

## Linux: start the local model

Install Docker with Compose on the operating system where the app runs. From the repository directory:

```sh
docker compose -f compose.translate.yaml up -d
docker compose -f compose.translate.yaml ps
```

The service binds only to `127.0.0.1:5000`, loads English/Russian models, and stores them in a persistent Docker volume. Initial model downloads need internet. Translation works offline afterward; Friends & Fables still needs internet. There is no automatic Docker startup from the app.

For an app user without the source checkout, the same pinned service can be started with:

```sh
docker run -d --name fables-translator --init -p 127.0.0.1:5000:5000 -e LT_HOST=0.0.0.0 -e LT_LOAD_ONLY=en,ru -e LT_THREADS=2 -v fables-translation-models:/home/libretranslate/.local libretranslate/libretranslate:v1.9.6@sha256:1de2d7056bb8ad607a412f4563d9abe324ff632b43b5be9428bcc8e213aebb32
```

Use one setup per computer. **Check translator** reports whether the local service has an English → Russian model. Restart the standalone service with `docker start fables-translator`, or use Compose again for the repository setup. This setup applies to Linux. The Windows EXE uses its included private service instead.

## Behavior and limits

The website keeps its sandbox and has no preload or application IPC API. An ordinary DOM helper collects eligible displayed text; the main process validates bounded batches and requests plain-text translations from numeric loopback. Requests have a hard deadline and response-size limit, use no website cookies/credentials, proxy, DNS, or redirects; the included Windows service uses only its private app-generated token, and never go to a public translation API. Model output is assigned to text nodes, so returned markup cannot execute.

The helper keeps the original text and node identity. It restores text when disabled, when originals are selected, or when a surface becomes editable. Website updates invalidate older results, including streamed messages. No React event/message records are rewritten and no input/change events are dispatched.

Russian runs remain literal. Listed names, URLs, and dice use placeholders inside complete English sentences. Their spelling is restored only if the model preserves every placeholder exactly once; otherwise the original text remains. Over 2,600 dictionary entries, including shared character/campaign controls and standard saving-throw/check/damage/roll instructions, use fixed Russian terminology. Dice bonuses use «Умение», AC uses «КБ / Класс брони», and the service narrator uses «Франц», even with the old preserved-name default. Official model names retain their spelling. Split XP counters, distance/weight labels, and voice descriptions also use local templates. Specialized terms inside prose use protected glossary markers. See [glossary coverage and references](GLOSSARY.md).

The DOM reuses translations immediately when React renders the same original text again. Completed sentences settle for 80 ms; other streamed changes settle for 180 ms. The main process polls every 50 ms and sends up to four sentence fragments / 2,400 characters per model request. Paragraphs share these batches, with visible text taking priority over off-screen content. Cached sentences appear before inference starts, and completed sentences appear while remaining text keeps its original spelling. Long pages no longer wait for all paragraphs to finish before displaying results.

A small «Перевод: completed / total» badge appears during work, and dotted underlines mark only untranslated sentence ranges. Already translated text, Russian runs, protected names, URLs, email addresses, and dice are excluded from those ranges. Counts represent text nodes, rather than sentences or a time estimate. The badge disappears when work finishes or the service fails; original-text display removes it and restores the text. New prose still depends on CPU/model inference time; batching reduces the time to first displayed results, not the amount of inference needed for the entire page.

Model results are cached in `translation-cache.json` inside the normal application user-data folder. Source keys are SHA256 hashes; cached translated text stays local. The cache is capped at 2,000 fragments and approximately 6 MiB. Translation preferences are separate from appearance/theme exports. **Clear translation cache** removes the saved entries.

Enable **Hide text until translated** to conceal pending prose with animated dots. A block appears after its entire translation is complete, without exposing intermediate English or partial results. Glossary labels are processed before the next paint, and the main website view waits for its first scan on full navigation. Names and editable drafts retain their original content. Disabling the option returns to progressive display. If the translator is unavailable, pending blocks keep their dots; turn on **Show original text** to review the source.

With the default progressive display, if the service is unavailable, uncached prose stays original; dictionary labels and cached translations continue to work. The app retries conservatively. **Check translator** makes pending text eligible for an immediate retry after recovery.

## Evaluation on this computer

Tested service: LibreTranslate v1.9.6, pinned Docker digest. Installed Argos packages: en→ru 1.9 and ru→en 1.9. The container used about 406 MiB after loading the models on this Arch machine with roughly 16 GiB RAM. Models were already installed in the project volume; this was not a first-install download measurement.

Small, handwritten samples, measured with `npm run benchmark:translation`:

| Sample | Service time (ms) | App cache lookup/render (ms) |
| --- | ---: | ---: |
| prose | 252 | 0.169 |
| NPC | 383 | 0.085 |
| terminology | 0 | 0.004 |
| mixed | 117 | 0.031 |
| names and dice | 145 | 0.037 |
| quality check | 129 | 0.024 |

The terminology sample uses local templates and makes no model request. These six short samples demonstrate feasibility, not a guarantee for long campaign messages. The mixed sample preserved `Привет, путник!` exactly; the historical name/dice sample preserved `Franz`, `Aria Moonwhisper`, and `1d20 + 5`. From 0.4.0, the service narrator is consistently displayed as «Франц».

For 0.5.0, eight handwritten synthetic paragraphs (32 sentences) were also compared on the same local LibreTranslate service. Waiting for the complete page took 3,715 ms before displaying any result. The progressive scheduler displayed its first batch after 436 ms and completed all paragraphs after 3,885 ms. This measures the scheduling/model path after warm-up, excluding DOM settling, polling, and cold model startup. It demonstrates earlier display, rather than faster total inference; hardware and text length still matter.

Machine prose remains imperfect: the model translated “innkeeper” as “постоялец” in one sample. Names and complex grammar can also read awkwardly even when spelling is preserved. Use original-text display to check uncertain passages. Common RPG labels and supported instruction templates avoid those model errors, but actual campaign quality still needs user review.

## Verification

`npm test` runs glossary/core/client/cache and bundled-service lifecycle tests, the appearance regression suite, an isolated Electron translation suite, the themed/pinned Appearance panel suite, battle/world map resizing and movement, and real Tiptap message-command checks. Tests cover the actual site-wide translation flags, home/game labels, theme synchronization and unsaved drafts, mixed Russian, protected names/URLs/dice, editable drafts, unchanged campaign records, original restoration, event listeners, late/streaming nodes, partial sentence display with a deliberately held response, paragraph fairness, progress marks, model failure/recovery, restart persistence, strict origins, restricted settings IPC, response limits, redirects, timeouts, and non-executable model output. CI also checks all five Electron suites against packaged resources and runs `npm run test:bundled-model` against the real included Windows runtime/model. `python3 -B tests/translator-protocol.test.py` exercises the Python HTTP adapter with a harmless fixture, including auth, origins, bounds, and parent EOF.

References: [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/), [translation API](https://docs.libretranslate.com/api/operations/translate/), [v1.9.6 release](https://github.com/LibreTranslate/LibreTranslate/releases/tag/v1.9.6).

The shared dictionary also covers campaign/discovery lists, workshop categories, image studio controls, account and notification settings, credit history, subscription periods, and sidebar account menus. Tooltips and accessibility labels use local translations only. Composer placeholder hints are localized without changing the editable draft. Character counters use «символов» and preserve their parentheses; context counts and split stat-adjustment headings are handled as complete grammatical labels. Email addresses are protected literal records.
