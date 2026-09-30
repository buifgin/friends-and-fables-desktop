# Friends & Fables Desktop

An unofficial desktop wrapper for [Friends & Fables](https://play.fables.gg/), targeting Windows and Arch Linux, including Wayland and Hyprland.

This repository currently contains the project plan and a local translation service configuration. The Electron app is not implemented yet.

## Initial scope

- Display the existing Friends & Fables website and preserve login between launches.
- Offer theme presets and a color picker for background customization, with saved settings and a reset option.
- Translate English menus, descriptions, and other displayed text into Russian using a local translation engine.
- Preserve content already written in Russian, including player and GM messages.
- Cache translations and provide a way to view the original text.
- Apply changes locally to the displayed page, without changing campaign data or typed messages.

## Planned stack

- Electron, TypeScript, and Electron Forge for the desktop app.
- CSS for themes.
- LibreTranslate with its Argos translation engine for local English-to-Russian translation.
- Local storage for settings and the translation cache.

For development, the translation service runs separately from Electron. Calls to it will go through the app's main process, while the website remains sandboxed. Packaging and automatically managing the translation engine will be evaluated before distributing the app.

Translation can work offline after its models are installed. Friends & Fables itself still requires internet access.

## Try local translation

Install Docker and Docker Compose and start the Docker daemon. On Arch Linux, the packages are `docker` and `docker-compose`. Windows development can use Docker Desktop with Linux containers.

From the repository root, run:

```sh
docker compose -f compose.translate.yaml up -d
docker compose -f compose.translate.yaml logs -f translator
```

The first launch downloads the container image and the English/Russian models. Wait for the service to finish starting. Model data is kept in a named Docker volume and reused between launches.

Test the service from another terminal:

```sh
curl http://127.0.0.1:5000/translate \
  -H 'Content-Type: application/json' \
  -d '{"q":"The wizard enters the tavern.","source":"en","target":"ru","format":"text"}'
```

The JSON response should contain `translatedText`. You can also open `http://127.0.0.1:5000` to try the translator's web interface. No API key is required for this development configuration.

Stop the service with:

```sh
docker compose -f compose.translate.yaml down
```

The configuration exposes the service only on the host's loopback address. It uses the upstream `latest` image for initial experimentation; a tested image version will be pinned before release.

See the [roadmap](docs/ROADMAP.md) for the implementation order.

## References

- [Electron Forge](https://www.electronforge.io/)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/)
- [LibreTranslate API](https://docs.libretranslate.com/guides/api_usage/)

This project is independent of the Friends & Fables service. A project license has not been selected yet.
