# Local Russian translation

The v0.2.1 prototype translates displayed website text into Russian. It starts disabled. Open **Translation → Translate into Russian**; use **Show original text** to restore the original display without reloading or contacting the model.

**Translation Settings…** controls machine-translated descriptions, a numeric local service port, names whose exact spelling should be preserved, and the cache. With descriptions disabled, the built-in interface dictionary still translates common labels and game terms. Russian passages, URLs, dice notation, and listed names are preserved. Short unknown labels and unknown headings stay original so names are not guessed. Editable fields, code, hidden content, and login forms are excluded; newly visible text is revisited. Text-node attributes and link destinations remain original. Text nodes over 4,000 characters stay original in this first version.

The bundled Appearance and Translation settings use a pre-built Russian interface when translation is enabled, including help text, color/picture dialogs, previews, and the pinned Appearance button. These labels never require the model. Both settings windows follow the selected app theme, including live theme changes without losing an unsaved settings draft. **Show original text** switches them back to English without resetting unsaved appearance choices.

The site sets `translate="no"` on its document to disable browser translation. The app’s explicit translation toggle overrides this page-wide flag. Individual `translate="no"` / `notranslate` blocks, editors, names, and login fields remain protected. Version 0.2.1 corrects the earlier behavior that skipped the entire website because of this flag.

## Start the local model

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

Use one setup per computer. **Check translator** reports whether the local service has an English → Russian model. Restart the standalone service with `docker start fables-translator`, or use Compose again for the repository setup. The Windows EXE needs its own local service on Windows. A bundled runtime that avoids Docker remains a later distribution step; these builds contain no translator/model files.

## Behavior and limits

The website keeps its sandbox and has no preload or application IPC API. An ordinary DOM helper collects eligible displayed text; the main process validates bounded batches and requests plain-text translations from numeric loopback. Requests have a hard deadline and response-size limit, use no website cookies, credentials, proxy, DNS, or redirects, and never go to a public translation API. Model output is assigned to text nodes, so returned markup cannot execute.

The helper keeps the original text and node identity. It restores text when disabled, when originals are selected, or when a surface becomes editable. Website updates invalidate older results, including streamed messages. No React event/message records are rewritten and no input/change events are dispatched.

Russian runs remain literal. Listed names, URLs, and dice use placeholders inside complete English sentences. Their spelling is restored only if the model preserves every placeholder exactly once; otherwise the original text remains. Common interface labels and a few standard saving-throw/check/damage/roll instructions use fixed Russian terminology.

Model results are cached in `translation-cache.json` inside the normal application user-data folder. Source keys are SHA256 hashes; cached translated text stays local. The cache is capped at 2,000 fragments and approximately 6 MiB. Translation preferences are separate from appearance/theme exports. **Clear translation cache** removes the saved entries.

If the service is unavailable, uncached prose stays original; dictionary labels and cached translations continue to work. The app retries conservatively. **Check translator** makes pending text eligible for an immediate retry after recovery.

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

The terminology sample uses local templates and makes no model request. These six short samples demonstrate feasibility, not a guarantee for long campaign messages. The mixed sample preserved `Привет, путник!` exactly; the name/dice sample preserved `Franz`, `Aria Moonwhisper`, and `1d20 + 5`.

Machine prose remains imperfect: the model translated “innkeeper” as “постоялец” in one sample. Names and complex grammar can also read awkwardly even when spelling is preserved. Use original-text display to check uncertain passages. Common RPG labels and supported instruction templates avoid those model errors, but actual campaign quality still needs user review.

## Verification

`npm test` runs core/client/cache tests, the appearance regression suite, an isolated Electron translation suite, and the themed/pinned Appearance panel suite. Tests cover the actual site-wide translation flags, home/game labels, theme synchronization and unsaved drafts, mixed Russian, protected names/URLs/dice, editable drafts, unchanged campaign records, original restoration, event listeners, late/streaming nodes, model failure/recovery, restart persistence, strict origins, restricted settings IPC, response limits, redirects, timeouts, and non-executable model output. CI also checks all three Electron suites against packaged resources.

References: [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/), [translation API](https://docs.libretranslate.com/api/operations/translate/), [v1.9.6 release](https://github.com/LibreTranslate/LibreTranslate/releases/tag/v1.9.6).
