import { DND_GLOSSARY, INTERFACE_GLOSSARY, PROSE_GLOSSARY, PROSE_TITLE_GLOSSARY } from './russian-glossary';
import { SHARED_INTERFACE_GLOSSARY } from './interface-russian';

export interface TranslationSettings {
  enabled: boolean;
  showOriginal: boolean;
  translateDescriptions: boolean;
  port: number;
  preservedNames: string[];
}
export const DEFAULT_TRANSLATION: TranslationSettings = {
  enabled: false, showOriginal: false, translateDescriptions: true, port: 5000,
  preservedNames: ['Friends & Fables'],
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
  ...DND_GLOSSARY, ...INTERFACE_GLOSSARY,
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
  'armor class':'Класс брони', 'ac':'КБ', 'initiative':'Инициатива', 'speed':'Скорость',
  'proficiency bonus':'Бонус умения', 'inspiration':'Вдохновение', 'advantage':'Преимущество',
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
  'stats':'Характеристики', 'bonuses':'Бонусы', 'level':'Уровень', 'xp':'Опыт', 'pb':'БУ',
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
  ...SHARED_INTERFACE_GLOSSARY,
};
// Serialized into the renderer along with the dictionary, so these labels and
// counters never wait for the model. Original whitespace and numbers survive.
export function localTranslation(text: string, dictionary: Record<string,string>): string | undefined {
  const lookup = (key: string): string | undefined => Object.hasOwn(dictionary,key) ? dictionary[key] : undefined;
  const normalized = text.replace(/\s+/g,' ').replace(/[’‘]/g,"'").trim().toLowerCase();
  const exact = lookup(normalized) ?? lookup(normalized.replace(/…/g,'...'));
  if (exact !== undefined) return text.slice(0,text.indexOf(text.trim())) + exact + text.slice(text.indexOf(text.trim())+text.trim().length);
  const prefix = text.match(/^(\s*)(.*?)(\s*:\s*[+\-\d][\d\s,./+\-]*\s*)$/);
  if (prefix && lookup(prefix[2].trim().toLowerCase())) return prefix[1]+lookup(prefix[2].trim().toLowerCase())+prefix[3];
  const colon = text.match(/^(\s*)(.*?)(\s*:\s*)$/);
  if (colon && lookup(colon[2].trim().toLowerCase())) return colon[1]+lookup(colon[2].trim().toLowerCase())+colon[3];
  const decorated = text.match(/^(\s*)(.*?)(\s*\*|\.\.\.|…|[.!?])(\s*)$/);
  if (decorated && lookup(decorated[2].trim().toLowerCase())) return decorated[1]+lookup(decorated[2].trim().toLowerCase())+decorated[3]+decorated[4];
  const remaining = text.match(/^(\s*)\(\s*(\d+)\s+characters? remaining\s*\)(\s*)$/i);
  if (remaining) return `${remaining[1]}(осталось символов: ${remaining[2]})${remaining[3]}`;
  const contextCount = text.match(/^(\s*)(\()?\s*(\d+)\s+active\s*[,/]\s*(\d+)\s+idle\s*(\))?(\s*)$/i);
  if (contextCount) return `${contextCount[1]}${contextCount[2]??''}${contextCount[3]} активных, ${contextCount[4]} неактивных${contextCount[5]??''}${contextCount[6]}`;
  const configure = text.match(/^(\s*)Configure\s+(Flat Adjustment|Override|Modifier)(\s*)$/i);
  if (configure) return `${configure[1]}Настроить: ${lookup(configure[2].toLowerCase())}${configure[3]}`;
  const transactions = text.match(/^(\s*)([\d,]+)\s+total transactions(\s*)$/i);
  if (transactions) return `${transactions[1]}Всего операций: ${transactions[2]}${transactions[3]}`;
  const bonusCredits = text.match(/^(\s*)([+\d,]+)\s+Bonus(\s*)$/i);
  if (bonusCredits) return `${bonusCredits[1]}${bonusCredits[2]} бонусных${bonusCredits[3]}`;
  const date = text.match(/^(\s*)(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})(\s*)$/i);
  if (date) {
    const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    const english=['january','february','march','april','may','june','july','august','september','october','november','december'];
    return `${date[1]}${date[3]} ${months[english.indexOf(date[2].toLowerCase())]} ${date[4]}${date[5]}`;
  }
  const xp = text.match(/^(\s*)([\d,]+)\s*XP\s+until\s+level\s+(\d+)(\s*)$/i);
  if (xp) return `${xp[1]}${xp[2]} опыта до уровня ${xp[3]}${xp[4]}`;
  const units = text.match(/^(\s*)([\d.,]+(?:\s*\/\s*[\d.,]+)?)\s*(ft\.?|lbs?\.?)(\s*)$/i);
  if (units) return `${units[1]}${units[2]} ${/^ft/i.test(units[3])?'фт.':'фунт.'}${units[4]}`;
  const voice = text.match(/^(\s*)([A-Za-z][A-Za-z -]+) \((American|British|Portuguese|Spanish|Japanese|Chinese|Italian|French|Indian) (Male|Female)\)(\s*)$/i);
  if (voice) {
    const accents: Record<string,string>={american:'американский',british:'британский',portuguese:'португальский',spanish:'испанский',japanese:'японский',chinese:'китайский',italian:'итальянский',french:'французский',indian:'индийский'};
    return `${voice[1]}${/^franz$/i.test(voice[2])?'Франц':voice[2]} (${accents[voice[3].toLowerCase()]}, ${/^male$/i.test(voice[4])?'мужской':'женский'} голос)${voice[5]}`;
  }
  const credits = text.match(/^(\s*)(\d+)\s+(credits?|turns?)(\s*\/\s*turn)?(\s*)$/i);
  if (credits) {
    const n=Number(credits[2]), forms=/^credit/i.test(credits[3])?['кредит','кредита','кредитов']:['ход','хода','ходов'];
    const word=n%100>=11&&n%100<=14?forms[2]:n%10===1?forms[0]:n%10>=2&&n%10<=4?forms[1]:forms[2];
    return `${credits[1]}${credits[2]} ${word}${credits[4]?' / ход':''}${credits[5]}`;
  }
  const counter = text.match(/^(\s*)(\d+)\s+(Topic Researched|Block Created|Memory Saved|Active|Idle)(\s*(?:\/\s*)?)$/i);
  if (counter) return `${counter[1]}${counter[2]} ${dictionary[counter[3].toLowerCase()]}${counter[4]}`;
  const battle = text.match(/^(\s*)Battle lasted\s+(\d+)\s+turns?([.!]?)(\s*)$/i);
  if (battle) return `${battle[1]}Битва продолжалась ${battle[2]} ${localTranslation(battle[2]+' turns',dictionary)!.split(' ').slice(1).join(' ')}${battle[3]}${battle[4]}`;
  const turns = text.match(/^(\s*)turns?(\s*)$/i);
  if (turns) return turns[1]+'ходов'+turns[2];
  const metric = text.match(/^(\s*)(Damage Dealt|Healing Done|Distance Moved)(\s*:\s*)(\d+)(\s*(?:ft)?[.!]?)(\s*)$/i);
  if (metric) return metric[1]+lookup(metric[2].toLowerCase())+metric[3]+metric[4]+metric[5].replace(/ft/i,'фт.')+metric[6];
  const gained = text.match(/^(\s*)(found|gained|acquired|bought|looted|crafted|gifted|awarded)(\s+\d+\s*)(\s*)$/i);
  if (gained) return gained[1]+lookup(gained[2].toLowerCase())+gained[3]+gained[4];
  const itemEvent = text.match(/^(\s*)(.{1,80}?)\s+(found|gained|acquired|bought|looted|crafted|gifted|awarded)\s+(\d+)\s+(.{1,512}?)(\s*)$/i);
  if (itemEvent) return `${itemEvent[1]}${itemEvent[2]} ${lookup(itemEvent[3].toLowerCase())} ${itemEvent[4]} ${lookup(itemEvent[5].toLowerCase())??itemEvent[5]}${itemEvent[6]}`;
  const instructions = text.match(/^(\s*)Custom Instructions(\s*\(\s*\d+\s*\/\s*\d+\s*\))(\s*)$/i);
  if (instructions) return instructions[1]+lookup('custom instructions')+instructions[2]+instructions[3];
  const slot = text.match(/^(\s*)Level\s+(\d+)\s+spell slot\s+(consumed|restored)([.!]?)(\s*)$/i);
  if (slot) return `${slot[1]}Ячейка заклинания ${slot[2]}-го уровня ${/^consumed$/i.test(slot[3])?'использована':'восстановлена'}${slot[4]}${slot[5]}`;
  const recovered = text.match(/^(\s*)([\d,]+)\s+(HP Healed|HP Recovered|Damage)([.!]?)(\s*)$/i);
  if (recovered) return `${recovered[1]}${recovered[2]} ${lookup(recovered[3].toLowerCase())}${recovered[4]}${recovered[5]}`;
  const baseRoll = text.match(/^(\s*)Base Roll\s*\((advantage|disadvantage)\)(\s*)$/i);
  if (baseRoll) return `${baseRoll[1]}${lookup('base roll')} (${lookup(baseRoll[2].toLowerCase())})${baseRoll[3]}`;
  const vantage = text.match(/^(\s*)\((advantage|disadvantage)\)(\s*)$/i);
  if (vantage) return `${vantage[1]}(${lookup(vantage[2].toLowerCase())})${vantage[3]}`;
  const level = text.match(/^(\s*)Level\s+(\d+)(.*)$/i);
  if (level) {
    let rest = level[3];
    const terms = Object.keys(dictionary).filter(term=>term.length>2).sort((a,b)=>b.length-a.length)
      .map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    if (terms.length) rest=rest.replace(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${terms.join('|')})(?![\\p{L}\\p{N}_])`,'giu'),term=>dictionary[term.toLowerCase()]);
    return `${level[1]}Уровень ${level[2]}${rest}`;
  }
  // Dice bonuses are often one composite text node or several fragments.
  // Translate only known mechanical terms, preserving numbers and punctuation.
  const bonus = text.match(/^(\s*)(Bonuses:\s*)?((?:[+\-]?\d+\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Proficiency|Expertise|Modifier))(?:\s*[,.]\s*[+\-]?\d+\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Proficiency|Expertise|Modifier))*)([.]?\s*)$/i);
  if(bonus) return bonus[1]+(bonus[2]?bonus[2].replace(/Bonuses/i,lookup('bonuses')!):'')+bonus[3].replace(/[A-Za-z]+/g,term=>lookup(term.toLowerCase())!)+bonus[4];
  const composer = text.match(/^(.*?)\s+says or does(?:\.\.\.|…)(\s*)$/i);
  if(composer) return `${composer[1]} говорит или делает…${composer[2]}`;
  return undefined;
}
export interface TranslationPart {
  text: string; translate: boolean; request?: string; protected?: { token: string; text: string }[]; local?: string; untranslated?: { start: number; end: number }[];
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
  // Tool-call dumps are technical records rather than game prose.
  if (/DSML|<\|[^>]*\|>|"(?:tool_calls|function_call)"\s*:/.test(text)) return [{text,translate:false}];
  const local = localTranslation(text,RUSSIAN_DICTIONARY);
  if (local !== undefined && (text.trim().toLowerCase()==='franz' || !names.some(name=>name.toLowerCase()===text.trim().toLowerCase()))) return [{text,translate:false,local}];
  const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const protectedNames = [...new Set([...names,'Franz','Friends & Fables','DeepSeek V4 Flash','Gemini 3.1 Pro','Grok 4.7','GLM-5','Hy-3','Fenix','OpenAI','OpenRouter','Groq'])].filter(Boolean).sort((a, b) => b.length - a.length)
    .map(name => `(?<![\\p{L}\\p{N}_])${escape(name)}(?![\\p{L}\\p{N}_])`);
  const protectedPattern = new RegExp([
    'https?://[^\\s<>]+', "[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+", '\\b\\d*d(?:4|6|8|10|12|20|100)(?:\\s*[+-]\\s*\\d+)?\\b', ...protectedNames,
  ].join('|'), 'giu');
  if (/ZXQ\d+ZXQ/.test(text)) return [{ text, translate: false }];
  const replacements = new Map<string, {original:string; rendered:string}>();
  let masked = text.replace(protectedPattern, value => {
    const token = `ZXQ${replacements.size}ZXQ`; replacements.set(token, {original:value,rendered:value.toLowerCase()==='franz'?'Франц':value}); return token;
  });
  const terms = Object.keys(PROSE_GLOSSARY).sort((a,b)=>b.length-a.length).map(value=>escape(value).replaceAll("'","['’‘]"));
  masked = masked.replace(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${terms.join('|')})(?![\\p{L}\\p{N}_])`,'giu'), value => {
    const token=`ZXQ${replacements.size}ZXQ`; replacements.set(token,{original:value,rendered:PROSE_GLOSSARY[value.toLowerCase().replace(/[’‘]/g,"'")]}); return token;
  });
  masked = masked.replace(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${Object.keys(PROSE_TITLE_GLOSSARY).map(escape).join('|')})(?![\\p{L}\\p{N}_])`,'gu'), value => {
    const token=`ZXQ${replacements.size}ZXQ`; replacements.set(token,{original:value,rendered:PROSE_TITLE_GLOSSARY[value]}); return token;
  });
  const original = (value: string): string => value.replace(markerPattern, token => replacements.get(token)?.original ?? token);
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
        const protectedText = (core.match(markerPattern) ?? []).map(token => ({ token, text: replacements.get(token)!.rendered }));
        const plain = original(core);
        const local = gameInstruction(plain);
        const content = core.replace(markerPattern, '');
        const translate = local === undefined && /[A-Za-z]/.test(content);
        const renderedLocal = local ?? (!translate && protectedText.length
          ? core.replace(markerPattern, token => replacements.get(token)!.rendered) : undefined);
        // Map only unprotected source spans, so progress dots never cover names,
        // addresses, dice, canonical terms, or already translated Russian runs.
        const untranslated: {start:number;end:number}[]=[];
        let sourceOffset=0, requestOffset=0;
        for (const marker of core.matchAll(markerPattern)) {
          const span=core.slice(requestOffset,marker.index);
          if (/[A-Za-z]/.test(span)) untranslated.push({start:sourceOffset,end:sourceOffset+span.length});
          sourceOffset+=span.length+replacements.get(marker[0])!.original.length;
          requestOffset=marker.index!+marker[0].length;
        }
        const tail=core.slice(requestOffset);
        if (/[A-Za-z]/.test(tail)) untranslated.push({start:sourceOffset,end:sourceOffset+tail.length});
        parts.push({ text: plain, translate, request: core, protected: protectedText, untranslated,
          ...(renderedLocal === undefined ? {} : { local: renderedLocal }) });
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
