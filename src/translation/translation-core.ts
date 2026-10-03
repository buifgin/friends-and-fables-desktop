import { DND_GLOSSARY, INTERFACE_GLOSSARY, PROSE_GLOSSARY, PROSE_TITLE_GLOSSARY } from './russian-glossary';
import { SHARED_INTERFACE_GLOSSARY } from './interface-russian';

export interface TranslationSettings {
  enabled: boolean;
  showOriginal: boolean;
  hideUntranslated: boolean;
  dynamicTranslationLayout: boolean;
  translateDescriptions: boolean;
  port: number;
  preservedNames: string[];
}
export const DEFAULT_TRANSLATION: TranslationSettings = {
  enabled: false, showOriginal: false, hideUntranslated: false, dynamicTranslationLayout: false, translateDescriptions: true, port: 5000,
  preservedNames: ['Friends & Fables'],
};
export function validateTranslation(raw: unknown): TranslationSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid translation preferences.');
  const value = raw as Record<string, unknown>;
  for (const name of ['enabled', 'showOriginal', 'translateDescriptions']) {
    if (typeof value[name] !== 'boolean') throw new Error('Invalid translation switch.');
  }
  if (['hideUntranslated','dynamicTranslationLayout'].some(name=>value[name] !== undefined && typeof value[name] !== 'boolean')) throw new Error('Invalid translation switch.');
  if (!Number.isInteger(value.port) || Number(value.port) < 1 || Number(value.port) > 65535) throw new Error('Choose a local port between 1 and 65535.');
  if (!Array.isArray(value.preservedNames) || value.preservedNames.length > 30
    || value.preservedNames.some(name => typeof name !== 'string' || !name.trim() || name.length > 80 || /[\r\n\u0000-\u001f]/.test(name))) throw new Error('Keep up to 30 names, each on its own line (80 characters maximum).');
  return { enabled: value.enabled as boolean, showOriginal: value.showOriginal as boolean, hideUntranslated: value.hideUntranslated === true, dynamicTranslationLayout: value.dynamicTranslationLayout === true,
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
  'strength saving throw':'Спасбросок силы', 'dexterity saving throw':'Спасбросок ловкости',
  'constitution saving throw':'Спасбросок телосложения', 'intelligence saving throw':'Спасбросок интеллекта',
  'wisdom saving throw':'Спасбросок мудрости', 'charisma saving throw':'Спасбросок харизмы',
  'ability checks':'Проверки характеристик', 'skill checks':'Проверки навыков', 'ability check':'Проверка характеристики', 'skill check':'Проверка навыка', 'attack roll':'Бросок атаки',
  'death save':'Спасбросок от смерти', 'death saving throw':'Спасбросок от смерти',
  'hit points':'Очки здоровья', 'max hp':'Максимум ОЗ', 'temporary hp':'Временные ОЗ', 'hp':'ОЗ',
  'armor class':'Класс брони', 'ac':'КБ', 'initiative':'Инициатива', 'speed':'Скорость',
  'proficiency bonus':'Бонус умения', 'inspiration':'Вдохновение', 'advantage':'Преимущество',
  'disadvantage':'Помеха', 'short rest':'Короткий отдых', 'long rest':'Продолжительный отдых',
  'damage':'Урон', 'healing':'Лечение', 'success':'Успех', 'failure':'Провал', 'critical hit':'Критическое попадание',
  'combat':'Бой', 'action':'Действие', 'bonus action':'Бонусное действие', 'reaction':'Реакция',
  'attacks':'Атаки', 'skills & attacks':'Навыки и атаки', 'skills and attacks':'Навыки и атаки', 'attack':'Атака',
  'roll dice':'Бросить кости', 'dice':'Кости', 'roll':'Бросок', 'manual':'Вручную',
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
  'acrobatics':'Акробатика', 'acrobatics check':'Проверка акробатики',
  'animal handling':'Уход за животными', 'animal handling check':'Проверка ухода за животными',
  'arcana':'Магия', 'arcana check':'Проверка магии', 'athletics':'Атлетика', 'athletics check':'Проверка атлетики',
  'deception':'Обман', 'deception check':'Проверка обмана', 'history':'История', 'history check':'Проверка истории',
  'insight':'Проницательность', 'insight check':'Проверка проницательности',
  'intimidation':'Запугивание', 'intimidation check':'Проверка запугивания',
  'investigation':'Анализ', 'investigation check':'Проверка анализа', 'medicine':'Медицина', 'medicine check':'Проверка медицины',
  'nature':'Природа', 'nature check':'Проверка природы', 'perception':'Внимательность', 'perception check':'Проверка внимательности',
  'performance':'Выступление', 'performance check':'Проверка выступления',
  'persuasion':'Убеждение', 'persuasion check':'Проверка убеждения', 'religion':'Религия', 'religion check':'Проверка религии',
  'sleight of hand':'Ловкость рук', 'sleight of hand check':'Проверка ловкости рук',
  'stealth':'Скрытность', 'stealth check':'Проверка скрытности', 'survival':'Выживание', 'survival check':'Проверка выживания',
  'strength check':'Проверка силы', 'dexterity check':'Проверка ловкости', 'constitution check':'Проверка телосложения',
  'intelligence check':'Проверка интеллекта', 'wisdom check':'Проверка мудрости', 'charisma check':'Проверка харизмы',
  ...SHARED_INTERFACE_GLOSSARY,
  'copy event id':'Копировать ID события', 'exclude here':'Исключить здесь',
  'collapse all':'Свернуть все', 'expand all':'Развернуть все',
  'entity':'Сущности', 'entities':'Сущности', 'encounter':'Бой',
  'unscathed':'Невредим', 'minor injuries':'Лёгкие травмы', 'injured':'Ранен',
  'moderately injured':'Ранен', 'seriously injured':'Тяжело ранен', 'severely injured':'Тяжело ранен',
  'critical injuries':'Критические травмы', 'critically injured':'При смерти', 'near death':'При смерти',
  'healthy':'Здоров', 'dead':'Мёртв', 'defeated':'Повержен',
  'end turn':'Завершить ход', 'run turn':'Разыграть ход', 'skip turn':'Пропустить ход',
  'hide input':'Скрыть поле ввода', 'show input':'Показать поле ввода',
  'expand message input':'Развернуть поле сообщения', 'collapse message input':'Свернуть поле сообщения',
  'lbs':'фунт.', 'lb':'фунт.', 'enlarge':'Увеличение', 'reduce':'Уменьшение',
  'franz is':'Франц', 'franz is...':'Франц обдумывает ответ…',
  'thinking':'обдумывает ответ', 'thinking...':'обдумывает ответ…',
  'starting an encounter':'начинает бой', 'starting an encounter...':'начинает бой…',

};
// Serialized into the renderer along with the dictionary, so these labels and
// counters never wait for the model. Original whitespace and numbers survive.
export function localTranslation(text: string, dictionary: Record<string,string>): string | undefined {
  const lookup = (key: string): string | undefined => Object.hasOwn(dictionary,key) ? dictionary[key] : undefined;
  const casing=(source:string,value:string):string=>{
    const first=source.match(/[A-Za-z]/)?.[0];
    if(/^\d*d(?:4|6|8|10|12|20|100)$/i.test(source.trim()))return value;
    if(!first || /^Франц(?!\p{L})/u.test(value) || /^[А-ЯЁ]{2,}(?!\p{L})/u.test(value))return value;
    return value.replace(/^(\s*)(\p{L})/u,(_,space,letter)=>space+(first===first.toLowerCase()?letter.toLocaleLowerCase('ru'):letter.toLocaleUpperCase('ru')));
  };
  const normalized = text.replace(/\s+/g,' ').replace(/[’‘]/g,"'").trim().toLowerCase();
  const exact = lookup(normalized) ?? lookup(normalized.replace(/…/g,'...'));
  if (exact !== undefined) return text.slice(0,text.indexOf(text.trim())) + casing(text.trim(),exact) + text.slice(text.indexOf(text.trim())+text.trim().length);
  const wrapped = text.match(/^(\s*[.·:;!?]+\s*)(.*?)(\s*[.·:;!?]*\s*)$/);
  if (wrapped && lookup(wrapped[2].trim().toLowerCase())) return wrapped[1]+casing(wrapped[2],lookup(wrapped[2].trim().toLowerCase())!)+wrapped[3];
  const save = text.match(/^(\s*)(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Save(\s*)$/i);
  if (save) return save[1]+lookup(save[2].toLowerCase()+' saving throw')+save[3];
  const difficulty = text.match(/^(\s*)DC(\s+\d+)(\s*)$/i);
  if (difficulty) return difficulty[1]+'Сл'+difficulty[2]+difficulty[3];
  const prefix = text.match(/^(\s*)(.*?)(\s*:\s*[+\-\d][\d\s,./+\-]*\s*)$/);
  if (prefix && lookup(prefix[2].trim().toLowerCase())) return prefix[1]+lookup(prefix[2].trim().toLowerCase())+prefix[3];
  const colon = text.match(/^(\s*)(.*?)(\s*:\s*)$/);
  if (colon && lookup(colon[2].trim().toLowerCase())) return colon[1]+lookup(colon[2].trim().toLowerCase())+colon[3];
  const decorated = text.match(/^(\s*)(.*?)(\s*\*|\.\.\.|…|[.!?])(\s*)$/);
  if (decorated && lookup(decorated[2].trim().toLowerCase())) return decorated[1]+lookup(decorated[2].trim().toLowerCase())+decorated[3]+decorated[4];
  const yourTurn=text.match(/^(\s*)Your turn,\s*(.*?)(\s*)$/i);
  if(yourTurn)return `${yourTurn[1]}Ваш ход,${yourTurn[2]?' '+yourTurn[2]:''}${yourTurn[3]}`;
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
  const socialCount = text.match(/^(\s*)([\d,.]+)\s+(Followers|Following)(\s*)$/i);
  if (socialCount) {
    const count=Number(socialCount[2].replace(/[,.]/g,'')),forms=/followers/i.test(socialCount[3])?['подписчик','подписчика','подписчиков']:['подписка','подписки','подписок'];
    const word=count%100>=11&&count%100<=14?forms[2]:count%10===1?forms[0]:count%10>=2&&count%10<=4?forms[1]:forms[2];
    return `${socialCount[1]}${socialCount[2]} ${word}${socialCount[4]}`;
  }
  const receivedCredits = text.match(/^(\s*)You received ([\d,]+) bonus credits from your subscription!?(\s*)$/i);
  if (receivedCredits) return `${receivedCredits[1]}По вашей подписке начислено ${receivedCredits[2]} бонусных кредитов!${receivedCredits[3]}`;
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
  const pluralWord=(n:number,forms:[string,string,string]):string=>n%100>=11&&n%100<=14?forms[2]:n%10===1?forms[0]:n%10>=2&&n%10<=4?forms[1]:forms[2];
  const age=text.match(/^(\s*)(\d+)\s+(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago(\s*)$/i);
  if(age){const n=Number(age[2]),unit=age[3].toLowerCase().replace(/s$/,'');const forms:Record<string,[string,string,string]>={second:['секунду назад','секунды назад','секунд назад'],minute:['минуту назад','минуты назад','минут назад'],hour:['час назад','часа назад','часов назад'],day:['день назад','дня назад','дней назад'],week:['неделю назад','недели назад','недель назад'],month:['месяц назад','месяца назад','месяцев назад'],year:['год назад','года назад','лет назад']};return `${age[1]}${age[2]} ${pluralWord(n,forms[unit])}${age[4]}`;}
  const voice = text.match(/^(\s*)([A-Za-z][A-Za-z -]+) \((American|British|Portuguese|Spanish|Japanese|Chinese|Italian|French|Indian) (Male|Female)\)(\s*)$/i);
  if (voice) {
    const accents: Record<string,string>={american:'американский',british:'британский',portuguese:'португальский',spanish:'испанский',japanese:'японский',chinese:'китайский',italian:'итальянский',french:'французский',indian:'индийский'};
    return `${voice[1]}${/^franz$/i.test(voice[2])?'Франц':voice[2]} (${accents[voice[3].toLowerCase()]}, ${/^male$/i.test(voice[4])?'мужской':'женский'} голос)${voice[5]}`;
  }
  const credits = text.match(/^(\s*)(\d+)\s+(credits?|turns?)(\s*\+)?(\s*\/\s*turn)?(\s*)$/i);
  if (credits) {
    const n=Number(credits[2]), forms=/^credit/i.test(credits[3])?['кредит','кредита','кредитов']:['ход','хода','ходов'];
    const word=n%100>=11&&n%100<=14?forms[2]:n%10===1?forms[0]:n%10>=2&&n%10<=4?forms[1]:forms[2];
    return `${credits[1]}${credits[2]} ${word}${credits[4]?' +':''}${credits[5]?' / ход':''}${credits[6]}`;
  }
  const researched=text.match(/^(\s*)([\d,]+)\s+(Topics? Researched)(\s*)$/i);
  if(researched){const n=Number(researched[2].replace(/,/g,''));return `${researched[1]}${researched[2]} ${pluralWord(n,['тема исследована','темы исследованы','тем исследовано'])}${researched[4]}`;}
  const blocks=text.match(/^(\s*)([\d,]+)\s+(Blocks? Created)(\s*)$/i);
  if(blocks){const n=Number(blocks[2].replace(/,/g,''));return `${blocks[1]}${blocks[2]} ${pluralWord(n,['блок создан','блока создано','блоков создано'])}${blocks[4]}`;}
  const researchAndBlocks=text.match(/^(\s*)([\d,]+)\s+Topics? Researched\s+([\d,]+)\s+Blocks? Created(\s*)$/i);
  if(researchAndBlocks){const topics=Number(researchAndBlocks[2].replace(/,/g,'')),blocksCount=Number(researchAndBlocks[3].replace(/,/g,''));return `${researchAndBlocks[1]}${researchAndBlocks[2]} ${pluralWord(topics,['тема исследована','темы исследованы','тем исследовано'])}, ${researchAndBlocks[3]} ${pluralWord(blocksCount,['блок создан','блока создано','блоков создано'])}${researchAndBlocks[4]}`;}
  const memories=text.match(/^(\s*)([\d,]+)\s+Memor(?:y|ies) Saved(\s*)$/i);
  if(memories)return `${memories[1]}${memories[2]} ${pluralWord(Number(memories[2].replace(/,/g,'')),['воспоминание сохранено','воспоминания сохранены','воспоминаний сохранено'])}${memories[3]}`;
  const counter = text.match(/^(\s*)(\d+)\s+(Memory Saved|Active|Idle)(\s*(?:\/\s*)?)$/i);
  if (counter) return `${counter[1]}${counter[2]} ${dictionary[counter[3].toLowerCase()]}${counter[4]}`;
  const battle = text.match(/^(\s*)Battle lasted\s+(\d+)\s+turns?([.!]?)(\s*)$/i);
  if (battle) return `${battle[1]}Битва продолжалась ${battle[2]} ${localTranslation(battle[2]+' turns',dictionary)!.split(' ').slice(1).join(' ')}${battle[3]}${battle[4]}`;
  const turnLabel = text.match(/^(\s*)(End|Waiting for|Run|Skip)\s+(.{1,100}?)(?:['’]s\s*|['’]\s*)?Turn([.!]?)(\s*)$/i);
  if (turnLabel) {
    const name=turnLabel[3].replace(/['’]s?\s*$/i,'').trim();
    const verbs:Record<string,string>={end:'Завершить ход', 'waiting for':'Ожидание хода',run:'Разыграть ход',skip:'Пропустить ход'};
    return turnLabel[1]+verbs[turnLabel[2].toLowerCase()]+' '+name+turnLabel[4]+turnLabel[5];
  }
  const executor=text.match(/^(\s*)Executor\s*:\s*(Encounter|Adventure)(\s*)$/i);
  if(executor)return executor[1]+'Исполнитель: '+(/^encounter$/i.test(executor[2])?'бой':'приключение')+executor[3];
  const thinking=text.match(/^(\s*)(Franz|Франц)\s+(is thinking|is imagining|is envisioning|is starting (?:an? )?encounter|is starting combat|is generating)(?:\.\.\.|…)?(\s*)$/i);
  if(thinking)return thinking[1]+'Франц '+(/starting/i.test(thinking[3])?'начинает бой':/generating/i.test(thinking[3])?'готовит ответ':'обдумывает ответ')+'…'+thinking[4];
  const hp=text.match(/^(\s*)([+−\-]?[\d.,]+)\s*HP(\s*)$/i);
  if(hp)return hp[1]+hp[2]+' ОЗ'+hp[3];
  const preview=text.match(/^(\s*)Preview:\s*(\d*d(?:100|20|12|10|8|6|4)(?:\s*[+−-]\s*\d+)?)(\s+)(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)(\s*)$/i);
  if(preview){const labels:Record<string,string>={acid:'кислотный',bludgeoning:'дробящий',cold:'холодовой',fire:'огненный',force:'силовой',lightning:'электрический',necrotic:'некротический',piercing:'колющий',poison:'ядовитый',psychic:'психический',radiant:'лучистый',slashing:'рубящий',thunder:'звуковой'};return `${preview[1]}Предпросмотр: ${preview[2].replace(/d/gi,'к')}${preview[3]}${labels[preview[4].toLowerCase()]}${preview[5]}`;}
  const die=text.match(/^(\s*)(Roll\s+)?(\d*d(?:100|20|12|10|8|6|4)(?:\s*[+−-]\s*(?:\d*d(?:100|20|12|10|8|6|4)|\d+))*)(\s*)$/i);
  if(die)return die[1]+(die[2]?'Бросить ':'')+die[3].replace(/d/gi,'к')+die[4];
  const cast=text.match(/^(\s*)(.{1,100}?)\s+cast(?:s)?\s+(.+?)(?:\s+\(Level\s+(\d+)\))?(\s*)$/i);
  if(cast&&lookup(cast[3].toLowerCase()))return cast[1]+cast[2]+' использует '+lookup(cast[3].toLowerCase())+(cast[4]?' (уровень '+cast[4]+')':'')+cast[5];
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
  const movement=text.match(/^(\s*)(.+?)\s+traveled\s+([\d.,]+)\s+KM\s+(North|South|East|West)(?:\s+(East|West))?([.!]?)(\s*)$/i);
  if(movement){const dir=(movement[4]+' '+(movement[5]??'')).trim().toLowerCase();const directions:Record<string,string>={north:'север',south:'юг',east:'восток',west:'запад','north east':'северо-восток','north west':'северо-запад','south east':'юго-восток','south west':'юго-запад'};const numericCharacters=movement[2].match(/^(\d+)\s+characters?$/i);const n=numericCharacters?Number(numericCharacters[1]):0;const singular=n===1;const characters=numericCharacters?`${numericCharacters[1]} ${pluralWord(n,['персонаж','персонажа','персонажей'])}`:movement[2].replace(/,\s+and\s+/i,' и ');return `${movement[1]}${characters} ${singular?'переместился':'переместились'} на ${movement[3]} км на ${directions[dir]}${movement[6]}${movement[7]}`;}
  const xpEach=text.match(/^(\s*)(.+?)\s+(?:gains?|receives?|earned|получает|получают)\s+([\d,]+)\s+(?:XP|опыта)\s+(?:each|каждый)([.!]?)(\s*)$/i);
  if(xpEach)return `${xpEach[1]}${xpEach[2]} получают ${xpEach[3]} опыта каждый${xpEach[4]}${xpEach[5]}`;
  const reduced=text.match(/^(\s*)(.+?)\s+was reduced to\s+([\d,]+)\s+HP([.!]?)(\s*)$/i);
  if(reduced)return `${reduced[1]}${reduced[2]}: ОЗ снижено до ${reduced[3]}${reduced[4]}${reduced[5]}`;
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
  if(bonus) {
    const genitive:Record<string,string>={strength:'силы',dexterity:'ловкости',constitution:'телосложения',intelligence:'интеллекта',wisdom:'мудрости',charisma:'харизмы'};
    const terms=bonus[3].replace(/[A-Za-z]+/g,term=>{
      const translated=genitive[term.toLowerCase()]??lookup(term.toLowerCase())!;
      return /^[A-Z]/.test(term)?translated[0].toLocaleUpperCase('ru')+translated.slice(1):translated[0].toLocaleLowerCase('ru')+translated.slice(1);
    });
    return bonus[1]+(bonus[2]?bonus[2].replace(/Bonuses/i,lookup('bonuses')!):'')+terms+bonus[4];
  }
  const composer = text.match(/^(.*?)\s+says or does(?:\.\.\.|…)(\s*)$/i);
  if(composer) return `${composer[1]} говорит или делает…${composer[2]}`;
  return undefined;
}
export interface TranslationPart {
  text: string; translate: boolean; request?: string; protected?: { token: string; text: string }[]; local?: string; untranslated?: { start: number; end: number }[];
}
function gameInstruction(text: string): string | undefined {
  const ability = text.match(/^(?:make|roll) (?:an? )?(strength|dexterity|constitution|intelligence|wisdom|charisma) (saving throw|check)([.!]?)$/i);
  const genitive: Record<string, string> = { strength: 'силы', dexterity: 'ловкости', constitution: 'телосложения', intelligence: 'интеллекта', wisdom: 'мудрости', charisma: 'харизмы' };
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

// Pending prose uses the same canonical placeholders as completed translation.
// Offsets refer to this preview, whose Russian terms can differ in length.
export function renderPendingTranslation(part: TranslationPart): {text:string;pending:{start:number;end:number}[]} {
  if (!part.translate) return {text:renderTranslation(part),pending:[]};
  const source=part.request??part.text;
  const replacements=new Map((part.protected??[]).map(value=>[value.token,value.text]));
  let text='',offset=0;
  const pending:{start:number;end:number}[]=[];
  const append=(span:string):void=>{
    const start=text.length;text+=span;
    if (/[A-Za-z]/.test(span)) pending.push({start,end:text.length});
  };
  for (const marker of source.matchAll(markerPattern)) {
    append(source.slice(offset,marker.index));
    text+=replacements.get(marker[0])??marker[0];offset=marker.index!+marker[0].length;
  }
  append(source.slice(offset));
  return {text,pending};
}

// Russian runs remain literal. Names, URLs, and dice use validated placeholders
// inside complete English sentences, preserving spelling without losing context.
export function translationPlan(text: string, names: string[] = []): TranslationPart[] {
  // Tool-call dumps are technical records rather than game prose.
  if (/\[\[\/?FF-SP:1\]\]|DSML|<\|[^>]*\|>|"(?:tool_calls|function_call)"\s*:/.test(text)) return [{text,translate:false}];
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
  // Keep the common resistance construction together so the type list can use
  // the dative required by Russian "сопротивление чему?" grammar.
  const damageTypePattern='acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder';
  const resistanceList=new RegExp(`\\b(resistance)\\s+to\\s+((?:(?:${damageTypePattern})\\s*,\\s*(?:and\\s+)?){1,}(?:${damageTypePattern}))\\s+damage\\b`,'giu');
  const dativeDamageTypes:Record<string,string>={acid:'кислотному',bludgeoning:'дробящему',cold:'холодовому',fire:'огненному',force:'силовому',lightning:'электрическому',necrotic:'некротическому',piercing:'колющему',poison:'ядовитому',psychic:'психическому',radiant:'лучистому',slashing:'рубящему',thunder:'звуковому'};
  masked=masked.replace(resistanceList,(_match,resistance:string,list:string)=>{
    const forms=list.replace(new RegExp(`\\b(${damageTypePattern})\\b`,'giu'),(value:string)=>{
      const dative=dativeDamageTypes[value.toLowerCase()];return value[0]===value[0].toLowerCase()?dative:dative[0].toLocaleUpperCase('ru')+dative.slice(1);
    }).replace(/\band\b/giu,'и').replace(/,\s*и(?=\s)/u,' и');
    const phrase=`${resistance[0]===resistance[0].toLowerCase()?'с':'С'}опротивление ${forms} урону`;
    const token=`ZXQ${replacements.size}ZXQ`;replacements.set(token,{original:_match,rendered:phrase});return token;
  });
  // In a comma-separated mechanics list, bare damage-type words are canonical
  // terms even when only the final item carries the word "damage".
  const damageTypes:Record<string,string>={acid:'кислотный',bludgeoning:'дробящий',cold:'холодовой',fire:'огненный',force:'силовой',lightning:'электрический',necrotic:'некротический',piercing:'колющий',poison:'ядовитый',psychic:'психический',radiant:'лучистый',slashing:'рубящий',thunder:'звуковой'};
  const damageList = new RegExp(`\\b(?:(?:${damageTypePattern})\\s*,\\s*(?:and\\s+)?){1,}(?:${damageTypePattern})\\s+damage\\b`,'giu');
  masked = masked.replace(damageList, list => list.replace(/\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\b/giu, value => {
    const lower=value.toLowerCase(), rendered=damageTypes[lower];
    const cased=value[0]===value[0].toLowerCase()?rendered:rendered[0].toLocaleUpperCase('ru')+rendered.slice(1);
    const token=`ZXQ${replacements.size}ZXQ`;replacements.set(token,{original:value,rendered:cased});return token;
  }));
  const terms = Object.keys(PROSE_GLOSSARY).sort((a,b)=>b.length-a.length).map(value=>escape(value).replaceAll("'","['’‘]"));
  masked = masked.replace(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${terms.join('|')})(?![\\p{L}\\p{N}_])`,'giu'), (value) => {
    let rendered=PROSE_GLOSSARY[value.toLowerCase().replace(/[’‘]/g,"'")];
    rendered=rendered.replace(/^(\s*)(\p{L})/u,(_,space,letter)=>space+(value[0]===value[0].toLowerCase()?letter.toLocaleLowerCase('ru'):letter.toLocaleUpperCase('ru')));
    const token=`ZXQ${replacements.size}ZXQ`; replacements.set(token,{original:value,rendered}); return token;
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
