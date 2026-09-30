export interface TranslationSettings {
  enabled: boolean;
  showOriginal: boolean;
  translateDescriptions: boolean;
  port: number;
  preservedNames: string[];
}
export const DEFAULT_TRANSLATION: TranslationSettings = {
  enabled: false, showOriginal: false, translateDescriptions: true, port: 5000,
  preservedNames: ['Friends & Fables', 'Franz'],
};
export function validateTranslation(raw: unknown): TranslationSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid translation preferences.');
  const value = raw as Record<string, unknown>;
  for (const name of ['enabled', 'showOriginal', 'translateDescriptions']) {
    if (typeof value[name] !== 'boolean') throw new Error('Invalid translation switch.');
  }
  if (!Number.isInteger(value.port) || Number(value.port) < 1 || Number(value.port) > 65535) throw new Error('Choose a local port between 1 and 65535.');
  if (!Array.isArray(value.preservedNames) || value.preservedNames.length > 30
    || value.preservedNames.some(name => typeof name !== 'string' || !name.trim() || name.length > 80 || /[\r\n\u0000-\u001f]/.test(name))) throw new Error('Keep up to 30 names, each on its own line (80 characters maximum).');
  return { enabled: value.enabled as boolean, showOriginal: value.showOriginal as boolean,
    translateDescriptions: value.translateDescriptions as boolean, port: value.port as number,
    preservedNames: [...new Set((value.preservedNames as string[]).map(name => name.trim()))] };
}

// Common interface labels use consistent RPG terminology without a service.
export const RUSSIAN_DICTIONARY: Record<string, string> = {
  'home':'Главная', 'play':'Играть', 'campaign':'Кампания', 'campaigns':'Кампании', 'characters':'Персонажи',
  'character':'Персонаж', 'character sheet':'Лист персонажа', 'inventory':'Инвентарь', 'equipment':'Снаряжение',
  'spells':'Заклинания', 'spell':'Заклинание', 'abilities':'Характеристики', 'skills':'Навыки',
  'strength':'Сила', 'dexterity':'Ловкость', 'constitution':'Телосложение', 'intelligence':'Интеллект',
  'wisdom':'Мудрость', 'charisma':'Харизма', 'saving throws':'Спасброски', 'saving throw':'Спасбросок',
  'strength saving throw':'Спасбросок Силы', 'dexterity saving throw':'Спасбросок Ловкости',
  'constitution saving throw':'Спасбросок Телосложения', 'intelligence saving throw':'Спасбросок Интеллекта',
  'wisdom saving throw':'Спасбросок Мудрости', 'charisma saving throw':'Спасбросок Харизмы',
  'ability check':'Проверка характеристики', 'skill check':'Проверка навыка', 'attack roll':'Бросок атаки',
  'death save':'Спасбросок от смерти', 'death saving throw':'Спасбросок от смерти',
  'hit points':'Очки здоровья', 'max hp':'Максимум ОЗ', 'temporary hp':'Временные ОЗ', 'hp':'ОЗ',
  'armor class':'Класс доспеха', 'ac':'КД', 'initiative':'Инициатива', 'speed':'Скорость',
  'proficiency bonus':'Бонус мастерства', 'inspiration':'Вдохновение', 'advantage':'Преимущество',
  'disadvantage':'Помеха', 'short rest':'Короткий отдых', 'long rest':'Продолжительный отдых',
  'damage':'Урон', 'healing':'Лечение', 'success':'Успех', 'failure':'Провал', 'critical hit':'Критическое попадание',
  'combat':'Бой', 'action':'Действие', 'bonus action':'Бонусное действие', 'reaction':'Реакция',
  'roll dice':'Бросить кости', 'dice':'Кости', 'roll':'Бросить', 'manual':'Вручную',
  'context':'Контекст', 'working context':'Рабочий контекст', 'thoughts':'Мысли', 'game master':'Мастер игры',
  'description':'Описание', 'background':'Предыстория', 'appearance':'Внешность', 'personality':'Характер',
  'quests':'Задания', 'quest':'Задание', 'journal':'Журнал', 'locations':'Места', 'location':'Место',
  'map':'Карта', 'world':'Мир', 'worlds':'Миры', 'notes':'Заметки', 'settings':'Настройки',
  'search':'Поиск', 'save':'Сохранить', 'cancel':'Отмена', 'close':'Закрыть', 'delete':'Удалить',
  'edit':'Редактировать', 'add':'Добавить', 'remove':'Удалить', 'back':'Назад', 'next':'Далее',
  'continue':'Продолжить', 'send':'Отправить', 'loading...':'Загрузка…', 'loading…':'Загрузка…',
  'create':'Создать', 'discover':'Обзор', 'workshop':'Мастерская', 'image studio':'Студия изображений',
  'updates':'Обновления', 'bug report':'Сообщить об ошибке', 'learn more':'Подробнее',
  'recent campaigns':'Недавние кампании', 'new discovery':'Новое в обзоре', 'contest':'Конкурс',
  'stats':'Характеристики', 'bonuses':'Бонусы', 'level':'Уровень', 'xp':'Опыт', 'pb':'БМ',
  'str':'СИЛ', 'dex':'ЛОВ', 'con':'ТЕЛ', 'int':'ИНТ', 'wis':'МДР', 'cha':'ХАР',
  'sorcery points':'Очки чародейства', 'spell slots':'Ячейки заклинаний', 'adventure mode':'Режим приключения',
  'active':'Активные', 'idle':'Неактивные', 'active /':'активных /', 'idle /':'неактивных /',
  'fighter':'Воин', 'rogue':'Плут', 'wizard':'Волшебник', 'sorcerer':'Чародей', 'cleric':'Жрец',
  'druid':'Друид', 'barbarian':'Варвар', 'bard':'Бард', 'monk':'Монах', 'paladin':'Паладин',
  'ranger':'Следопыт', 'warlock':'Колдун', 'human':'Человек', 'elf':'Эльф', 'dwarf':'Дварф',
  'lawful good':'Законно-добрый', 'neutral good':'Нейтрально-добрый', 'chaotic good':'Хаотично-добрый',
  'lawful neutral':'Законно-нейтральный', 'true neutral':'Истинно нейтральный', 'chaotic neutral':'Хаотично-нейтральный',
  'lawful evil':'Законно-злой', 'neutral evil':'Нейтрально-злой', 'chaotic evil':'Хаотично-злой',
  'acrobatics':'Акробатика', 'acrobatics check':'Проверка Акробатики',
  'animal handling':'Уход за животными', 'animal handling check':'Проверка Ухода за животными',
  'arcana':'Магия', 'arcana check':'Проверка Магии', 'athletics':'Атлетика', 'athletics check':'Проверка Атлетики',
  'deception':'Обман', 'deception check':'Проверка Обмана', 'history':'История', 'history check':'Проверка Истории',
  'insight':'Проницательность', 'insight check':'Проверка Проницательности',
  'intimidation':'Запугивание', 'intimidation check':'Проверка Запугивания',
  'investigation':'Анализ', 'investigation check':'Проверка Анализа', 'medicine':'Медицина', 'medicine check':'Проверка Медицины',
  'nature':'Природа', 'nature check':'Проверка Природы', 'perception':'Внимательность', 'perception check':'Проверка Внимательности',
  'performance':'Выступление', 'performance check':'Проверка Выступления',
  'persuasion':'Убеждение', 'persuasion check':'Проверка Убеждения', 'religion':'Религия', 'religion check':'Проверка Религии',
  'sleight of hand':'Ловкость рук', 'sleight of hand check':'Проверка Ловкости рук',
  'stealth':'Скрытность', 'stealth check':'Проверка Скрытности', 'survival':'Выживание', 'survival check':'Проверка Выживания',
  'strength check':'Проверка Силы', 'dexterity check':'Проверка Ловкости', 'constitution check':'Проверка Телосложения',
  'intelligence check':'Проверка Интеллекта', 'wisdom check':'Проверка Мудрости', 'charisma check':'Проверка Харизмы',
};
export interface TranslationPart {
  text: string; translate: boolean; request?: string; protected?: { token: string; text: string }[]; local?: string;
}
function gameInstruction(text: string): string | undefined {
  const ability = text.match(/^(?:make|roll) (?:an? )?(strength|dexterity|constitution|intelligence|wisdom|charisma) (saving throw|check)([.!]?)$/i);
  const genitive: Record<string, string> = { strength: 'Силы', dexterity: 'Ловкости', constitution: 'Телосложения', intelligence: 'Интеллекта', wisdom: 'Мудрости', charisma: 'Харизмы' };
  if (ability) return `Совершите ${ability[2].toLowerCase() === 'check' ? 'проверку' : 'спасбросок'} ${genitive[ability[1].toLowerCase()]}${ability[3]}`;
  const damage = text.match(/^On (?:a )?failure, take (\d+) points? of (fire|cold|acid|lightning|thunder|poison|psychic|necrotic|radiant|force|slashing|piercing|bludgeoning) damage([.!]?)$/i);
  const types: Record<string, string> = { fire: 'огнём', cold: 'холодом', acid: 'кислотой', lightning: 'электричеством', thunder: 'звуком', poison: 'ядом', psychic: 'психической энергией', necrotic: 'некротической энергией', radiant: 'излучением', force: 'силовым полем', slashing: 'рубящего урона', piercing: 'колющего урона', bludgeoning: 'дробящего урона' };
  if (damage) return `При провале получите ${damage[1]} ${/slashing|piercing|bludgeoning/i.test(damage[2]) ? types[damage[2].toLowerCase()] : 'урона ' + types[damage[2].toLowerCase()]}${damage[3]}`;
  const dice = text.match(/^Roll (\d*d(?:4|6|8|10|12|20|100)(?:\s*[+-]\s*\d+)?)([.!]?)$/i);
  if (dice) return `Бросьте ${dice[1]}${dice[2]}`;
  return undefined;
}
const markerPattern = /ZXQ\d+ZXQ/g;
export function validateTranslationMarkers(request: string, translated: string): void {
  const before = request.match(markerPattern) ?? [], after = translated.match(markerPattern) ?? [];
  if (before.length !== after.length || before.some(token => after.filter(value => value === token).length !== 1)) throw new Error('The model did not preserve protected text.');
}
export function renderTranslation(part: TranslationPart, translated?: string): string {
  if (part.local !== undefined) return part.local;
  if (!part.translate) return part.text;
  if (translated === undefined) throw new Error('Missing translation.');
  validateTranslationMarkers(part.request ?? part.text, translated);
  for (const replacement of part.protected ?? []) translated = translated.replaceAll(replacement.token, replacement.text);
  return translated;
}

// Russian runs remain literal. Names, URLs, and dice use validated placeholders
// inside complete English sentences, preserving spelling without losing context.
export function translationPlan(text: string, names: string[] = []): TranslationPart[] {
  const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const protectedNames = names.filter(Boolean).sort((a, b) => b.length - a.length)
    .map(name => `(?<![\\p{L}\\p{N}_])${escape(name)}(?![\\p{L}\\p{N}_])`);
  const protectedPattern = new RegExp([
    'https?://[^\\s<>]+', '\\b\\d*d(?:4|6|8|10|12|20|100)(?:\\s*[+-]\\s*\\d+)?\\b', ...protectedNames,
  ].join('|'), 'giu');
  if (/ZXQ\d+ZXQ/.test(text)) return [{ text, translate: false }];
  const replacements = new Map<string, string>();
  const masked = text.replace(protectedPattern, value => {
    const token = `ZXQ${replacements.size}ZXQ`; replacements.set(token, value); return token;
  });
  const original = (value: string): string => value.replace(markerPattern, token => replacements.get(token) ?? token);
  const russian = /[\p{Script=Cyrillic}][\p{Script=Cyrillic}\p{M}\p{N}\s.,!?;:—–«»"'()\-]*/gu;
  const parts: TranslationPart[] = [];
  const literal = (value: string): void => { if (value) parts.push({ text: original(value), translate: false }); };
  function english(value: string): void {
    for (const piece of value.match(/[^.!?\n]+[.!?]*|[.!?\n]+/g) ?? []) {
      const tokens = piece.match(/\s+|\S+/g) ?? [];
      let chunk = '';
      const flush = (): void => {
        const core = chunk.trim();
        if (!core) { literal(chunk); chunk = ''; return; }
        const start = chunk.indexOf(core);
        literal(chunk.slice(0, start));
        const protectedText = (core.match(markerPattern) ?? []).map(token => ({ token, text: replacements.get(token)! }));
        const plain = original(core);
        const local = gameInstruction(plain);
        const content = core.replace(markerPattern, '');
        parts.push({ text: plain, translate: local === undefined && /[A-Za-z]/.test(content),
          request: core, protected: protectedText, ...(local === undefined ? {} : { local }) });
        literal(chunk.slice(start + core.length)); chunk = '';
      };
      for (const token of tokens) {
        if (chunk.length + token.length > 1200) flush();
        if (token.length > 1200) literal(token); else chunk += token;
      }
      flush();
    }
  }
  let position = 0;
  for (const match of masked.matchAll(russian)) {
    english(masked.slice(position, match.index)); literal(match[0]); position = match.index! + match[0].length;
  }
  english(masked.slice(position));
  return parts;
}
