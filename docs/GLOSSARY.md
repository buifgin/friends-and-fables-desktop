# English–Russian D&D glossary

Version 1 contains 540 D&D term names and 74 additional interface labels/help strings, alongside the app’s existing navigation, abilities, skills, and alignment dictionary. Source: `src/russian-glossary.ts`.

The app uses fixed translations for navigation, account menus, character tabs, conditions, damage types, resources, feats, spell schools, class features, equipment, and many cantrips and level 1–3 spells. Numeric labels retain their numbers: `Second Wind:1/2` becomes `Второе дыхание:1/2`, and `Level 5 Drow Fighter (Spellblade)` becomes `Уровень 5 Дроу Воин (Клинок заклинаний)`.

| English | Russian |
| --- | --- |
| Spellcasting | Использование заклинаний |
| Cantrip | Заговор |
| Spellcasting ability | Базовая характеристика заклинаний |
| Spellcasting focus | Магическая фокусировка |
| Second Wind | Второе дыхание |
| Action Surge | Всплеск действий |
| Innate Sorcery | Врождённое чародейство |
| Prone | Сбитый с ног |
| Necrotic | Некротическая энергия |
| Spellbook | Книга заклинаний |

Inside prose, specialized multiword terms are protected and replaced with their canonical Russian names. Ambiguous single words such as “light,” “friends,” and “charmed” retain their ordinary meaning in machine translation. Listed character/place names take priority over glossary terms. The model must retain every protected marker exactly once; failed marker validation keeps the original passage. Glossary phrases use canonical naming rather than automatic grammatical inflection, so surrounding prose may still need review.

The entries were curated for the app, checking 5e terminology against the references suggested in the README:

- [Wizards of the Coast SRD](https://www.dndbeyond.com/srd): English rules terminology, including the revised 5e vocabulary. The glossary also supports common 2014 names still used by campaigns.
- [D&D.su — Spellcasting](https://dnd.su/articles/mechanics/157-spellcasting/), [Sorcerer](https://dnd.su/class/91-sorcerer/), and [Sleep](https://www.dnd.su/spells/98-sleep/): community Russian terminology. Reference pages were used to check term names; complete rule passages are not embedded.
- [BG3 Wiki — Action Surge](https://bg3.wiki/wiki/Action_Surge): feature-name/context cross-check. BG3 changes to rules are not imported into the app.

Interface help text is independently translated from the app and the supplied screenshots. This is an unofficial glossary, not an official Russian localization. Full descriptions remain local machine translations.

## SRD attribution

This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Changes: selected English term names were translated into Russian and combined with independently written interface translations; rule descriptions are not reproduced.
