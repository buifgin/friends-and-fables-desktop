// Reviewed, built-in English/Russian labels for bundled app settings.
// This never sends interface text to the story model or changes form values.
(() => {
  const russian = {
    'Appearance — Friends & Fables Desktop': 'Оформление — Friends & Fables Desktop',
    'Translation — Friends & Fables Desktop': 'Перевод — Friends & Fables Desktop',
    'Hex': 'HEX',
    'Appearance': 'Оформление', 'Appearance button': 'Кнопка оформления',
    'Make it yours.': 'Настройте под себя.', 'Set your theme, chat picture, cards, and dice.': 'Настройте тему, фон чата, карточки и кости.',
    'Appearance categories': 'Разделы оформления', 'Theme': 'Тема', 'Chat picture': 'Фон чата', 'Messages': 'Сообщения',
    'Context': 'Контекст', 'Events': 'События', 'Dice': 'Кости', 'Sharing': 'Обмен', 'App': 'Приложение',
    'Critical dice colors': 'Цвета критических бросков', 'Natural 20': 'Натуральная 20', 'Natural 1': 'Натуральная 1',
    'Resizable campaign map': 'Изменяемый размер карты кампании',
    'Enable /me and /gm commands': 'Включить команды /me и /gm',
    'Type /me for italic text or /gm to wrap your message in # marks. Enter or Format command prepares the draft for review; then send it normally.': 'Используйте /me для курсива или /gm для обрамления сообщения знаками #. Enter или кнопка оформления подготавливают текст для проверки; затем отправьте его обычным способом.',
    "Drag the map's lower edge to change its height. Expand it to resize both dimensions. Sizes are remembered for each campaign.": 'Перетаскивайте нижний край карты, чтобы изменить высоту. Разверните карту для изменения высоты и ширины. Размеры сохраняются отдельно для каждой кампании.',
    'Customize natural 20': 'Настроить натуральную 20', 'Customize natural 1': 'Настроить натуральную 1',
    'Preview result': 'Результат для предпросмотра', 'Normal roll (16)': 'Обычный бросок (16)',
    'Use separate face, edge, and number colors for finished D20 rolls of 20 or 1.': 'Выберите отдельные цвета граней, рёбер и чисел для завершённых бросков D20 с результатом 20 или 1.',
    'Background theme': 'Тема фона', 'Website default': 'Как на сайте', 'Original Friends & Fables colors': 'Исходные цвета Friends & Fables',
    'AMOLED black': 'Чёрная AMOLED', 'Pure black backgrounds and panels': 'Полностью чёрный фон и панели',
    'Soft black': 'Мягкая чёрная', 'Dark with subtle panel contrast': 'Тёмная тема с мягким контрастом панелей',
    'Light': 'Светлая', 'Soft white with dark text': 'Мягкий белый фон и тёмный текст',
    'Custom color': 'Свой цвет', 'Pick your own background': 'Выберите цвет фона', 'Background color': 'Цвет фона',
    'Choose a custom background color': 'Выберите свой цвет фона', 'Custom background hex color': 'HEX-код своего цвета фона',
    'Behind the campaign chat': 'Фон чата кампании',
    'Import a picture from your computer. It is saved locally for your desktop app. Use the background-image button at the top of the campaign to show or hide it.': 'Выберите изображение на компьютере. Оно сохранится локально в приложении. Кнопка фонового изображения вверху кампании позволяет показать или скрыть его.',
    'Choose picture…': 'Выбрать изображение…', 'Browse pictures…': 'Обзор изображений…', 'Remove picture': 'Убрать изображение',
    "Using the campaign's existing background.": 'Используется текущий фон кампании.', 'Picture fit': 'Размещение изображения',
    'Cover the chat area': 'Заполнить область чата', 'Show the whole picture': 'Показать целиком', 'Image blur': 'Размытие изображения',
    'Image opacity': 'Непрозрачность изображения', 'Overlay color': 'Цвет наложения', 'Overlay opacity': 'Непрозрачность наложения',
    'Try a black overlay with a little blur to keep the picture subtle. These effects apply to your uploaded chat picture; text stays sharp.': 'Чёрное наложение и лёгкое размытие сделают фон менее ярким. Эффекты применяются к выбранному фону чата; текст остаётся чётким.',
    'PNG, JPEG, or WebP · up to 20 MB and 16 million pixels. Animated WebP imports as a still picture.': 'PNG, JPEG или WebP · до 20 МБ и 16 миллионов пикселей. Из анимированного WebP сохраняется неподвижный кадр.',
    'Customize message backgrounds': 'Настроить фон сообщений',
    'Player styling also applies to campaign inputs and bottom buttons. Context has its own settings. GM styling includes battle summaries. Background opacity leaves text opaque.': 'Стиль игрока применяется также к полям ввода и нижним кнопкам кампании. Контекст настраивается отдельно. Стиль ведущего включает сводки боя. Непрозрачность фона не влияет на текст.',
    'Player messages & inputs': 'Сообщения игрока и поля ввода', 'Game master & NPC messages': 'Сообщения ведущего и НИП',
    'Automatic text color accounts for your theme and background opacity. Turn it off to choose readable text over a picture.': 'Автоматический цвет текста учитывает тему и непрозрачность фона. Отключите его, чтобы выбрать цвет для текста поверх изображения.',
    'Customize context panel & blocks': 'Настроить панель и блоки контекста',
    'Choose independent colors, opacity, and borders for each surface. Keep the expanded panel solid to prevent story text showing through. Category dots and usage bars keep their meaning.': 'Настройте цвет, непрозрачность и рамку каждого элемента. Сделайте раскрытую панель непрозрачной, чтобы текст истории не просвечивал. Цвета категорий и индикаторов использования сохраняются.',
    'Customize': 'Настроить', 'Expanded window': 'Раскрытая панель', 'Messages / block cards': 'Сообщения и карточки блоков',
    'Collapsed bar above input': 'Свёрнутая панель над вводом', 'Expanded context window': 'Раскрытая панель контекста',
    'Messages inside context': 'Сообщения внутри контекста', 'Collapsed context bar': 'Свёрнутая панель контекста',
    'Customize movement & action cards': 'Настроить карточки перемещений и действий',
    'Style the compact combat event cards, such as “Moves 5 feet south”, separately from story messages.': 'Настройте компактные карточки боевых событий, например «Перемещается на 5 футов к югу», отдельно от сообщений истории.',
    'Event cards': 'Карточки событий', 'Customize dice roll cards': 'Настроить карточки бросков',
    'Roll background & border': 'Фон и рамка броска', 'Use the current roll text color': 'Использовать текущий цвет текста броска',
    'Text beneath dice': 'Текст под костями',
    'Choose a separate color for calculations, success/failure results, and damage below the dice.': 'Выберите отдельный цвет для расчётов, результатов успеха или провала и урона под костями.',
    'Customize dice colors': 'Настроить цвета костей', 'Dice color presets': 'Готовые цвета костей',
    'Black': 'Чёрные', 'White': 'Белые', 'Purple': 'Фиолетовые', 'Faces': 'Грани', 'Edges': 'Рёбра', 'Numbers': 'Числа',
    'D4, D6, D8, D10, D12, and D20 keep their original shapes, results, and animations.': 'К4, К6, К8, К10, К12 и К20 сохраняют исходную форму, результаты и анимацию.',
    'Share a complete theme': 'Поделиться темой',
    'Export your current choices to a theme file for friends. Import a file to preview it, then apply. Login and campaign data are never part of a theme.': 'Сохраните настройки в файл темы и поделитесь с друзьями. Импортируйте файл для предварительного просмотра, затем примените. Данные входа и кампании не входят в тему.',
    'Include the selected chat picture': 'Включить выбранный фон чата', 'Export theme…': 'Экспорт темы…', 'Import theme…': 'Импорт темы…',
    'A theme without a picture keeps the recipient’s selected picture. Menu, floating-window, and pinned-panel preferences stay local.': 'Тема без изображения сохраняет выбранный фон получателя. Настройки меню, плавающего окна и закреплённой панели остаются локальными.',
    'Pin Appearance to the main interface': 'Закрепить «Оформление» в интерфейсе',
    'Add an Appearance button that opens these settings beside the game. Drag the panel’s right edge to resize it, including in fullscreen. Your panel width is remembered.': 'Кнопка «Оформление» открывает настройки рядом с игрой. Перетаскивайте правый край панели для изменения ширины, в том числе в полноэкранном режиме. Выбранная ширина сохраняется.',
    'Black Linux menu bar': 'Чёрная строка меню Linux',
    'Keep File, Edit, Appearance, Translation, View, and Window on a black bar.': 'Показывать меню File, Edit, Appearance, Translation, View и Window на чёрной панели.',
    'Floating Appearance window': 'Плавающее окно оформления',
    'On Hyprland, open Appearance as a floating window. Other Linux desktops use a dialog-window hint.': 'В Hyprland окно оформления открывается как плавающее. В других средах Linux используется тип диалогового окна.',
    'Menu bar customization is available on Linux.': 'Настройка строки меню доступна в Linux.',
    'Theme preview': 'Предпросмотр темы', 'PREVIEW': 'ПРЕДПРОСМОТР', 'GAME MASTER': 'ВЕДУЩИЙ', 'PLAYER': 'ИГРОК',
    'The road disappears into the forest.': 'Дорога скрывается в лесу.', 'I take a closer look.': 'Я присматриваюсь внимательнее.',
    'Collapsed bar · 9 Active / 0 Idle': 'Свёрнутая панель · 9 активных / 0 неактивных',
    'Context blocks · 9 Active / 0 Idle': 'Блоки контекста · 9 активных / 0 неактивных',
    'Keep the story consistent with the campaign.': 'Сохраняйте согласованность истории с кампанией.',
    'Player moves 5 feet south to (7, 8)': 'Игрок перемещается на 5 футов к югу в (7, 8)',
    'DEATH SAVE': 'СПАСБРОСОК ОТ СМЕРТИ', 'Dice color preview': 'Предпросмотр цвета костей', '16 = 16 · 16 Damage': '16 = 16 · 16 урона',
    'Message input preview…': 'Предпросмотр поля сообщения…', 'Spell': 'Заклинание', 'Manual': 'Вручную',
    'Undo last reset': 'Отменить сброс', 'Reset appearance': 'Сбросить оформление', 'Apply changes': 'Применить',
    'Loading preferences…': 'Загрузка настроек…', 'Background': 'Фон', 'Background opacity': 'Непрозрачность фона',
    'First color opacity': 'Непрозрачность первого цвета', 'Text & icons': 'Текст и значки', 'Automatic text color': 'Автоматический цвет текста',
    'Gradient & border': 'Градиент и рамка', 'Use a gradient': 'Использовать градиент', 'Second color': 'Второй цвет',
    'Direction': 'Направление', 'Second color opacity': 'Непрозрачность второго цвета', 'First color share': 'Доля первого цвета',
    "Each color has its own opacity. An even share blends across the whole surface; increase a color's share to keep it solid for longer.": 'Каждый цвет имеет свою непрозрачность. Равные доли дают плавный переход по всей поверхности. Увеличьте долю цвета, чтобы он занимал больше места без перехода.',
    'Show border': 'Показать рамку', 'Border style': 'Стиль рамки', 'Plain': 'Обычная', 'Ornate corners': 'Узорные углы',
    'Arcane diamonds': 'Магические ромбы', 'Runic corners': 'Рунические углы', 'Border color': 'Цвет рамки',
    'Border width': 'Толщина рамки', 'Corner radius': 'Радиус углов', 'Picture browser': 'Обзор изображений',
    'Close': 'Закрыть', 'Imported pictures': 'Импортированные', 'Selected folder': 'Выбранная папка',
    'Choose folder…': 'Выбрать папку…', 'Show more': 'Показать ещё',
    'PNG, JPEG, and WebP · choosing a folder picture copies it into the app library. The selected folder is remembered after restarts.': 'PNG, JPEG и WebP · выбранное изображение из папки копируется в библиотеку приложения. Папка сохраняется после перезапуска.',
    'Choose color': 'Выберите цвет', 'Hue': 'Тон', 'Saturation': 'Насыщенность', 'Lightness': 'Светлота',
    'Cancel': 'Отмена', 'Use color': 'Выбрать цвет', 'Close panel': 'Закрыть панель',
    'Resize appearance panel': 'Изменить ширину панели оформления', 'Open appearance settings': 'Открыть настройки оформления',
    'Choose your settings, then apply them.': 'Выберите настройки и примените их.',
    'Preview ready. Apply to change the app.': 'Предпросмотр готов. Примените изменения.', 'Applying appearance…': 'Применение оформления…',
    'Appearance applied and saved for next time.': 'Оформление применено и сохранено.',
    'Appearance reset. Undo last reset restores your choices and picture.': 'Оформление сброшено. Кнопка отмены восстановит настройки и изображение.',
    'Previous appearance and picture restored.': 'Предыдущее оформление и изображение восстановлены.',
    'Theme exported. Share the file with your friends.': 'Тема экспортирована. Поделитесь файлом с друзьями.',
    'Export canceled.': 'Экспорт отменён.', 'Theme imported into preview. Apply changes to use it.': 'Тема импортирована в предпросмотр. Примените изменения.',
    'Import canceled.': 'Импорт отменён.', 'Picture imported. Apply to use it behind campaign chat.': 'Изображение импортировано. Примените его для фона чата.',
    'Picture removed from preview. Apply to restore the campaign background.': 'Изображение убрано из предпросмотра. Примените изменения для возврата фона кампании.',
    'Dice colors previewed. Apply to save.': 'Цвета костей показаны в предпросмотре. Примените для сохранения.',
    'Choose a folder to browse its pictures.': 'Выберите папку для просмотра изображений.',
    'Picture cannot be read or exceeds the import limits.': 'Изображение недоступно или превышает ограничения импорта.',
    'Picture selected. Apply changes to use it.': 'Изображение выбрано. Примените изменения.', 'Loading pictures…': 'Загрузка изображений…',
    'Folder unavailable. Choose another folder, or browse imported pictures.': 'Папка недоступна. Выберите другую или откройте импортированные изображения.',
    'Could not load preferences. Close this window and try again.': 'Не удалось загрузить настройки. Закройте окно и попробуйте снова.',
    'Read in Russian.': 'Читайте на русском.', 'Translate displayed English text locally. Russian passages stay as written.': 'Переводите отображаемый английский текст локально. Русские фрагменты сохраняются без изменений.',
    'English → Russian': 'Английский → Русский', 'Translate into Russian': 'Переводить на русский', 'Show original text': 'Показывать исходный текст',
    'Translate descriptions and story text': 'Переводить описания и историю',
    'Common interface labels and game terms use a built-in dictionary. Descriptions use your local translation service. Turn descriptions off for dictionary-only translation.': 'Подписи интерфейса и игровые термины используют встроенный словарь. Описания переводит локальный сервис. Отключите перевод описаний, чтобы использовать только словарь.',
    'Keep these names unchanged': 'Сохранять эти имена', 'One name per line': 'Одно имя в строке',
    'Add character and place names here to preserve their spelling in translated text. Names may otherwise be transliterated by the model.': 'Укажите имена персонажей и названия мест для сохранения их написания. Иначе модель может транслитерировать их.',
    'Local service port': 'Порт локального сервиса',
    'The app connects only to 127.0.0.1 on this computer. Translation starts disabled. The model is a separate service; ordinary app use does not need it.': 'Приложение подключается только к 127.0.0.1 на этом компьютере. Изначально перевод отключён. Модель работает в отдельном сервисе; для обычной игры он не нужен.',
    'Check translator': 'Проверить переводчик', 'Clear translation cache': 'Очистить кэш перевода',
    'Checking local service…': 'Проверка локального сервиса…', 'Apply translation settings': 'Применить настройки перевода',
    'Translation → Show original text': 'Translation → Show original text',
    'Typed messages, editable fields, link targets, and campaign records are left unchanged. Translation affects the text displayed in this app. Use': 'Вводимые сообщения, поля редактирования, адреса ссылок и данные кампании сохраняются. Перевод меняет только отображаемый текст. Используйте',
    'to switch back instantly.': 'для мгновенного возврата к оригиналу.',
    'English → Russian model is ready.': 'Модель перевода с английского на русский готова.',
    'The local service needs an English → Russian model.': 'Локальному сервису нужна модель перевода с английского на русский.',
    'Local service unavailable. The dictionary and cached translations still work.': 'Локальный сервис недоступен. Словарь и кэшированные переводы продолжают работать.',
    'The included translator could not start. The dictionary and cached translations still work.': 'Не удалось запустить встроенный переводчик. Словарь и кэшированные переводы продолжают работать.',
    'The included translator starts when translation is enabled.': 'Встроенный переводчик запускается при включении перевода.',
    'The translator and English → Russian model are included. They start automatically on this computer; no separate install or download is needed.': 'Переводчик и модель английский → русский включены в приложение. Они запускаются автоматически на этом компьютере; отдельная установка или загрузка не нужна.',
    'Interface labels and D&D terms use the built-in glossary immediately. Longer text uses the local model and cache. Turn descriptions off for glossary-only translation.': 'Подписи интерфейса и термины D&D мгновенно переводятся по встроенному глоссарию. Длинный текст использует локальную модель и кэш. Отключите описания для перевода только по глоссарию.',
    'Unable to check the local service.': 'Не удалось проверить локальный сервис.',
    'Translation settings applied.': 'Настройки перевода применены.', 'Translation cache cleared.': 'Кэш перевода очищен.',
    'Changes stay local to this app.': 'Изменения сохраняются только в этом приложении.',
  };
  let locale = 'en';
  const originals = new WeakMap();
  const attributes = new WeakMap();
  function translate(value) {
    if (locale !== 'ru') return value;
    const core = value.trim();
    let translated = russian[core];
    if (!translated) {
      let match;
      if ((match = core.match(/^(\d+) cached translation fragments\.$/))) translated = `Фрагментов в кэше: ${match[1]}.`;
      else if ((match = core.match(/^(\d+) imported pictures · newest first$/))) translated = `Импортировано изображений: ${match[1]} · сначала новые`;
      else if ((match = core.match(/^(.*) · (\d+) pictures$/))) translated = `${match[1]} · изображений: ${match[2]}`;
      else if ((match = core.match(/^English → Russian is ready at 127\.0\.0\.1:(\d+)\.$/))) translated = `Перевод с английского на русский готов: 127.0.0.1:${match[1]}.`;
      else if ((match = core.match(/^Could not apply changes: (.*)$/))) translated = `Не удалось применить изменения: ${match[1]}`;
    }
    return translated ? value.slice(0, value.indexOf(core)) + translated + value.slice(value.indexOf(core) + core.length) : value;
  }
  function render() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest('script,style,textarea,input,output,[data-no-localize],.picture-choice')) continue;
      const previous = originals.get(node);
      const original = previous && node.data === previous.rendered ? previous.original : node.data;
      const rendered = translate(original);
      originals.set(node, { original, rendered });
      if (node.data !== rendered) node.data = rendered;
    }
    for (const element of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
      const saved = attributes.get(element) ?? new Map();
      for (const name of ['aria-label', 'title', 'placeholder']) {
        if (!element.hasAttribute(name)) continue;
        const current = element.getAttribute(name), previous = saved.get(name);
        const original = previous && current === previous.rendered ? previous.original : current;
        const rendered = translate(original); saved.set(name, { original, rendered });
        if (rendered !== current) element.setAttribute(name, rendered);
      }
      attributes.set(element, saved);
    }
  }
  window.settingsLocale = { source(element, name) {
    if (name) return attributes.get(element)?.get(name)?.original ?? element.getAttribute(name);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let result = '';
    while (walker.nextNode()) result += originals.get(walker.currentNode)?.original ?? walker.currentNode.data;
    return result;
  }, set(next) { locale = next === 'ru' ? 'ru' : 'en'; document.documentElement.lang = locale; render(); }, text: translate };
  const observer = new MutationObserver(render);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label','title','placeholder'] });
})();
