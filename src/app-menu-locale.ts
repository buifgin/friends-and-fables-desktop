import type { MenuItemConstructorOptions } from 'electron';

const RUSSIAN: Record<string, string> = {
  'File':'Файл', 'Edit':'Правка', 'Appearance':'Оформление', 'Translation':'Перевод', 'View':'Вид', 'Window':'Окно',
  'Music':'Музыка', 'Music Player…':'Музыкальный проигрыватель…',
  'Saved /sp Instructions…':'Сохранённые инструкции /sp…',
  'Undo':'Отменить', 'Redo':'Повторить', 'Cut':'Вырезать', 'Copy':'Копировать', 'Paste':'Вставить', 'Select All':'Выделить всё',
  'Friends & Fables Home':'Главная Friends & Fables', 'Open in Browser':'Открыть в браузере', 'Close Window':'Закрыть окно',
  'Quit':'Выход', 'Minimize':'Свернуть', 'Close':'Закрыть', 'Customize Appearance…':'Настроить оформление…',
  'Translate into Russian':'Переводить на русский', 'Show original text':'Показать оригинал', 'Translation Settings…':'Настройки перевода…',
  'Reload':'Обновить', 'Force Reload':'Обновить без кэша', 'Developer Tools':'Инструменты разработчика',
  'Reset Zoom':'Сбросить масштаб', 'Zoom In':'Увеличить масштаб', 'Zoom Out':'Уменьшить масштаб',
  'Toggle Fullscreen (Alt+Enter)':'Полноэкранный режим (Alt+Enter)', 'Retry':'Повторить',
  'Friends & Fables could not be opened.':'Не удалось открыть Friends & Fables.',
  'Check your internet connection and try again.':'Проверьте подключение к интернету и попробуйте ещё раз.',
};
export function appText(text: string, locale: 'en' | 'ru'): string { return locale === 'ru' ? RUSSIAN[text] ?? text : text; }
export function localizeMenu(items: MenuItemConstructorOptions[], locale: 'en' | 'ru'): MenuItemConstructorOptions[] {
  return items.map(item => ({ ...item, ...(item.label ? { label: appText(item.label, locale) } : {}),
    ...(Array.isArray(item.submenu) ? { submenu: localizeMenu(item.submenu, locale) } : {}) }));
}
