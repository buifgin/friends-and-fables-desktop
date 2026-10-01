# Bundled Windows translator

This runtime and the English–Russian model are shipped inside the Windows app. No packages or models are downloaded on the user's computer. Exact versions, source URLs, and SHA-256 hashes are in `manifest.json`.

- Python: Python Software Foundation License. Full notice: `LICENSE.txt`.
- CTranslate2: MIT. Full notice: `CTRANSLATE2-LICENSE.txt`.
- SentencePiece: Apache License 2.0. Full notice: `SENTENCEPIECE-LICENSE.txt`.
- NumPy and included libraries: BSD and other permissive licenses. Full notices in `Lib/site-packages/numpy-*.dist-info/` and `numpy.libs/`.
- PyYAML: MIT. Full notice in `Lib/site-packages/pyyaml-*.dist-info/`.
- Argos English–Russian model, package 1.9, model version 2.2: Aleksey Kutashov and Argos Open Technologies. MIT/CC0, using MIT here; `ARGOS-LICENSE.txt`. The provider confirms that the model binaries share this license in [argos-translate issue 533](https://github.com/argosopentech/argos-translate/issues/533). Training-data credits and sources are preserved verbatim in `model/README.md`.

The app's small service adapter is MIT, like the rest of Friends & Fables Desktop. The model is used through CTranslate2 and SentencePiece directly; LibreTranslate, Stanza, Torch, and their servers are not bundled.

The MSVC runtime files shipped by Python and NumPy are redistributed with the runtime. See [Microsoft redistribution terms](https://learn.microsoft.com/en-us/cpp/windows/redistributing-visual-cpp-files). The standard `msvcp140.dll` is an unchanged copy of NumPy’s bundled MSVC library.
