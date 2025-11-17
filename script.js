document.addEventListener('DOMContentLoaded', () => {
    const terminal = document.getElementById('terminal');
    const output = document.getElementById('output');
    const input = document.getElementById('input');
    const prompt = document.getElementById('prompt');

    // --- State & Config ---
    let commandHistory = [];
    let historyIndex = -1;
    let state = {
        lang: { from: 'uk', to: 'en' },
        theme: localStorage.getItem('tcli-theme') || 'default',
        myStats: JSON.parse(localStorage.getItem('Translation-myStats')) || { translations: 0 },
        translationHistory: JSON.parse(localStorage.getItem('TranslationHistory')) || [],
    };
    const languages = { "en": "English", "uk": "Ukrainian", "pl": "Polish", "de": "German", "fr": "French", "es": "Spanish", "it": "Italian", "ja": "Japanese", "ko": "Korean", "zh": "Chinese" };
    const themes = { 'default': 'Green', 'amber': 'Amber', 'ice': 'Ice Blue' };

    // --- Core Functions ---
    const print = (html, type = '') => {
        const line = document.createElement('div');
        line.className = `output-line ${type}`;
        line.innerHTML = html;
        output.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
    };

    const saveState = () => {
        localStorage.setItem('tcli-theme', state.theme);
        localStorage.setItem('tcli-myStats', JSON.stringify(state.myStats));
        localStorage.setItem('tcli-translationHistory', JSON.stringify(state.translationHistory));
    };

    const updatePrompt = () => {
        prompt.textContent = `[${state.lang.from} > ${state.lang.to}] $ `;
    };

    const applyTheme = (themeName) => {
        document.body.dataset.theme = themeName;
        state.theme = themeName;
    };

    // --- Command Processor ---
    const processCommand = async (cmd) => {
        const parts = cmd.split(' ').filter(p => p);
        const command = parts[0];
        const args = parts.slice(1);

        switch (command) {
            case '/help':
                print(`<strong>Доступні команди:</strong>
/lang [з] > [на]  - Встановити мови (напр. /lang uk > en)
/swap              - Поміняти мови місцями
/history           - Показати історію перекладів
/stats             - Показати вашу статистику
/clear             - Очистити екран
/help              - Показати це повідомлення`);
                break;

            case '/lang':
                const langMatch = args.join(' ').match(/(\w{2,3})\s*>\s*(\w{2,3})/);
                if (langMatch && languages[langMatch[1]] && languages[langMatch[2]]) {
                    state.lang.from = langMatch[1];
                    state.lang.to = langMatch[2];
                    updatePrompt();
                    print(`Мови встановлено: <strong>${languages[state.lang.from]}</strong> -> <strong>${languages[state.lang.to]}</strong>`);
                } else {
                    print(`Помилка: Неправильний формат або невідомі мови. Приклад: /lang uk > en`, 'error');
                }
                break;

            case '/swap':
                [state.lang.from, state.lang.to] = [state.lang.to, state.lang.from];
                updatePrompt();
                print(`Мови поміняно місцями: <strong>${languages[state.lang.from]}</strong> -> <strong>${languages[state.lang.to]}</strong>`);
                break;

            case '/theme':
                if (args[0] && themes[args[0]]) {
                    applyTheme(args[0]);
                    print(`Тему змінено на: <strong>${themes[args[0]]}</strong>`);
                } else {
                    print(`Помилка: тема не знайдена. Доступні: ${Object.keys(themes).join(', ')}`, 'error');
                }
                break;

            case '/history':
                if (state.translationHistory.length === 0) {
                    print('Історія перекладів порожня.', 'info');
                } else {
                    print('<strong>Історія перекладів:</strong>');
                    [...state.translationHistory].reverse().forEach((item, i) => {
                        print(`  <strong class="info">${i+1}. [${item.fromLang} > ${item.toLang}]</strong> "${item.fromText}" -> "${item.toText}"`);
                    });
                }
                break;

            case '/stats':
                print(`<strong>Особиста статистика:</strong>
  - Перекладено слів/фраз: <strong>${state.myStats.translations}</strong>
  - Записів в історії: <strong>${state.translationHistory.length}</strong>`);
                break;

            case '/clear':
                output.innerHTML = '';
                break;

            default:
                print(`Помилка: команда "${command}" не знайдена. Введіть /help для списку команд.`, 'error');
        }
    };
    
    // --- Translation Handler ---
    const handleTranslation = async (text) => {
        print(`> ${text}`, 'info'); // Echo user input
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${state.lang.from}|${state.lang.to}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            const translatedText = data.responseData.translatedText;
            
            print(`<strong>${translatedText}</strong>`, 'response');

            // Update stats and history
            state.myStats.translations++;
            state.translationHistory.push({ fromLang: state.lang.from, toLang: state.lang.to, fromText: text, toText: translatedText });
            if(state.translationHistory.length > 50) state.translationHistory.shift(); // Keep history at 50 max

        } catch (error) {
            print('Помилка з\'єднання з сервісом перекладу.', 'error');
        }
    };

    const handleInput = (e) => {
        if (e.key === 'Enter' && input.value.trim() !== '') {
            const value = input.value.trim();
            print(`${prompt.textContent}${value}`, 'command');
            commandHistory.unshift(value);
            historyIndex = -1;

            if (value.startsWith('/')) {
                processCommand(value);
            } else {
                handleTranslation(value);
            }

            input.value = '';
            saveState();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                input.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                input.value = commandHistory[historyIndex];
            } else {
                historyIndex = -1;
                input.value = '';
            }
        }
    };

    // --- Initialization ---
    const init = () => {
        // Boot sequence
        setTimeout(() => print('Booting DS Translator V 0.9...'), 200);
        setTimeout(() => print('Connecting to translation matrix... <strong style="color: limegreen;">OK</strong>'), 800);
        setTimeout(() => print('Loading user profile... <strong style="color: limegreen;">OK</strong>'), 1200);
        setTimeout(() => {
            print(`Вітаємо! Введіть текст для перекладу або <strong>/help</strong> для списку команд.`);
            input.focus();
        }, 1500);

        applyTheme(state.theme);
        updatePrompt();
        input.addEventListener('keydown', handleInput);
        terminal.addEventListener('click', () => input.focus());
    };

    init();
});