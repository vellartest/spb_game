// ================= CANVAS =================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let viewWidth = 640, viewHeight = 360, scale = 1;

function resize() {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight * 0.68;
    scale = Math.max(1, Math.min(Math.floor(maxW / 480), Math.floor(maxH / 320)));
    viewWidth = Math.floor(maxW / scale);
    viewHeight = Math.floor(maxH / scale);
    canvas.width = viewWidth;
    canvas.height = viewHeight;
    canvas.style.width = (viewWidth * scale) + 'px';
    canvas.style.height = (viewHeight * scale) + 'px';
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ================= СОСТОЯНИЕ =================
const GROUND_Y = 300;

const state = {
    money: 500,
    rep: 0,
    energy: 100,
    day: 1,
    phase: 'start',
    flags: {},
    quest: 'Поговорить с ноутбуком',
    location: 'room',
    lastMusicDay: 0
};

const player = {
    x: 100, y: GROUND_Y - 32,
    w: 22, h: 32, vx: 0, vy: 0,
    speed: 2.4, facing: 1, onGround: true,
    walkFrame: 0, walkTimer: 0,
    actionTimer: 0, invulnTimer: 0,
    stepTimer: 0
};

const keys = { left: false, right: false };

// ================= ЛОКАЦИИ =================
const locations = {
    room: {
        name: 'Комната в общежитии',
        width: 1200,
        bgType: 'room',
        music: 'spb',
        platforms: [
            { x: 0, y: GROUND_Y, w: 1200, h: 60 },
            { x: 480, y: GROUND_Y - 70, w: 100, h: 12 },
            { x: 800, y: GROUND_Y - 120, w: 120, h: 12 }
        ],
        objects: [
            { x: 200, y: GROUND_Y - 40, w: 40, h: 40, type: 'computer', name: '💻 Ноутбук',
              dialogue: ['Старый ноутбук. Может, помайнить крипту?'],
              action: 'scene_crypto_start', needs: {} },
            { x: 600, y: GROUND_Y - 60, w: 50, h: 60, type: 'poster', name: '📈 Плакат',
              dialogue: ['График биткоина. Если бы я купил его в 2010...'],
              action: 'poster', needs: {} },
            { x: 400, y: GROUND_Y - 50, w: 40, h: 50, type: 'bed', name: '🛏️ Кровать',
              dialogue: ['Пора отдохнуть. Восстановит энергию и начнёт новый день.'],
              action: 'sleep', needs: {} },
            { x: 1050, y: GROUND_Y - 40, w: 40, h: 60, type: 'door', name: '🚪 На улицу',
              dialogue: ['Выйти на Невский проспект.'],
              action: 'goto_spb', needs: {} }
        ]
    },
    spb: {
        name: 'Невский проспект',
        width: 2400,
        bgType: 'city',
        music: 'spb',
        platforms: [{ x: 0, y: GROUND_Y, w: 2400, h: 60 }],
        objects: [
            { x: 250, y: GROUND_Y - 60, w: 40, h: 60, type: 'npc', name: '🎸 Музыкант',
              dialogue: ['Эй, парень! Хочешь подзаработать? Помоги выступить!'],
              action: 'scene_street_music', needs: {} },
            { x: 600, y: GROUND_Y - 60, w: 40, h: 60, type: 'npc', name: '💼 Инвестор',
              dialogue: ['Есть идея для стартапа. Вложи 500₽ — расскажу.'],
              action: 'scene_investor', needs: {} },
            { x: 1000, y: GROUND_Y - 60, w: 40, h: 60, type: 'npc', name: '🪙 Трейдер',
              dialogue: ['Новый токен! 100x за неделю! Рискнёшь?'],
              action: 'scene_crypto_trade', needs: {} },
            { x: 1400, y: GROUND_Y - 60, w: 50, h: 60, type: 'door', name: '☕ Кафе',
              dialogue: ['Уютное кафе. Здесь собираются стартаперы.'],
              action: 'goto_cafe', needs: {} },
            { x: 1800, y: GROUND_Y - 60, w: 50, h: 60, type: 'door', name: '🏢 Бизнес-центр',
              dialogue: ['Огромное здание. Здесь делают деньги.'],
              action: 'goto_business', needs: { rep: 15 } },
            { x: 2200, y: GROUND_Y - 40, w: 40, h: 60, type: 'door', name: '🏠 Домой',
              dialogue: ['Вернуться в общежитие.'],
              action: 'goto_room', needs: {} }
        ]
    },
    cafe: {
        name: 'Кафе «Пушкинъ»',
        width: 1200,
        bgType: 'cafe',
        music: 'cafe',
        platforms: [{ x: 0, y: GROUND_Y, w: 1200, h: 60 }],
        objects: [
            { x: 300, y: GROUND_Y - 60, w: 40, h: 60, type: 'npc', name: '🧑‍💼 Стартапер',
              dialogue: ['Ищу технического партнёра. Ты умеешь кодить?'],
              action: 'scene_startup_pitch', needs: { rep: 10 } },
            { x: 700, y: GROUND_Y - 60, w: 40, h: 60, type: 'npc', name: '👩‍💻 Программистка',
              dialogue: ['Могу помочь с кодом, если будет идея.'],
              action: 'scene_hire_dev', needs: {} },
            { x: 1050, y: GROUND_Y - 40, w: 40, h: 60, type: 'door', name: '🚪 На улицу',
              dialogue: ['Выйти из кафе.'],
              action: 'goto_spb', needs: {} }
        ]
    },
    business: {
        name: 'Бизнес-центр',
        width: 1600,
        bgType: 'office',
        music: 'business',
        platforms: [{ x: 0, y: GROUND_Y, w: 1600, h: 60 }],
        objects: [
            { x: 400, y: GROUND_Y - 60, w: 40, h: 60, type: 'npc', name: '🤝 Партнёр',
              dialogue: ['Ваша идея интересна. Обсудим сотрудничество.'],
              action: 'scene_partner', needs: { rep: 25 } },
            { x: 900, y: GROUND_Y - 60, w: 40, h: 60, type: 'npc', name: '👔 Инвестор-ангел',
              dialogue: ['Готов вложить, если покажете результаты.'],
              action: 'scene_angel', needs: { rep: 50 } },
            { x: 1200, y: GROUND_Y - 60, w: 50, h: 60, type: 'npc', name: '🚀 Запуск',
              dialogue: ['Команда готова. Пора запускать первую версию.'],
              action: 'scene_launch', needs: {}, visibleWhen: 'angel_done' },
            { x: 1450, y: GROUND_Y - 60, w: 50, h: 60, type: 'npc', name: '🚨 Кризис',
              dialogue: ['Что-то пошло не так. Нужно принять решение.'],
              action: 'scene_crisis', needs: {}, visibleWhen: 'launch_done' },
            { x: 1300, y: GROUND_Y - 60, w: 50, h: 60, type: 'door', name: '🌃 Крыша',
              dialogue: ['Подняться на крышу. Говорят, там отличный вид.'],
              action: 'goto_roof', needs: { rep: 70 } },
            { x: 100, y: GROUND_Y - 40, w: 40, h: 60, type: 'door', name: '🚪 На улицу',
              dialogue: ['Выйти из здания.'],
              action: 'goto_spb', needs: {} }
        ]
    },
    roof: {
        name: 'Крыша бизнес-центра',
        width: 1000,
        bgType: 'rooftop',
        music: 'rooftop',
        platforms: [{ x: 0, y: GROUND_Y, w: 1000, h: 60 }],
        objects: [
            { x: 500, y: GROUND_Y - 60, w: 40, h: 60, type: 'npc', name: '🌅 Закат',
              dialogue: ['Время принять главное решение в жизни.'],
              action: 'scene_finale', needs: {}, visibleWhen: 'crisis_done' },
            { x: 100, y: GROUND_Y - 40, w: 40, h: 60, type: 'door', name: '⬇️ Вниз',
              dialogue: ['Спуститься обратно.'],
              action: 'goto_business', needs: {} }
        ]
    }
};

let currentLocationKey = 'room';
let world = locations[currentLocationKey];
let camera = { x: 0 };

// ================= ПРОЛОГ =================
const PROLOGUE = [
    { text: 'Ты — молодой парень из провинции.', portrait: '🧑', bg: 'linear-gradient(180deg,#1a1a3e,#4a3a6e)' },
    { text: 'В кармане — 500 рублей, в голове — миллион идей.', portrait: '🧑', bg: 'linear-gradient(180deg,#1a1a3e,#4a3a6e)' },
    { text: 'Билет в один конец до Санкт-Петербурга.', portrait: '🚂', bg: 'linear-gradient(180deg,#2a1a3e,#6e3a5e)' },
    { text: 'Питер встречает туманом и дождём.', portrait: '🌫️', bg: 'linear-gradient(180deg,#2a3a4e,#4a5a6e)' },
    { text: 'Ты снимаешь крохотную комнату в общежитии.', portrait: '🏚️', bg: 'linear-gradient(180deg,#1a1a2e,#3a2a3e)' },
    { text: 'Теперь всё зависит только от тебя.', portrait: '🧑', bg: 'linear-gradient(180deg,#1a1a2e,#3a2a3e)' },
    { text: 'Заработай денег. Стань успешным.', portrait: '💰', bg: 'linear-gradient(180deg,#2a2a1e,#6e5a2e)' }
];

// ================= СЮЖЕТНЫЕ СЦЕНЫ =================
// cost — сколько нужно и списывается
// reward — сколько прибавляется В КОНЦЕ сцены
const STORY_SCENES = {
    scene_crypto_start: {
        once: true,
        lines: [
            { text: 'Ты открываешь ноутбук и заходишь на крипто-биржу.', portrait: '💻' },
            { text: 'Курсы скачут вверх и вниз, как бешеные.', portrait: '📈' },
            { text: 'Ты покупаешь на все 500 рублей.', portrait: '🪙' },
            { text: 'Прошло три часа. Ты заработал первые 700 рублей!', portrait: '💰' }
        ],
        cost: 500,
        reward: { money: 700 },
        nextQuest: 'Поговорить с уличным музыкантом'
    },
    scene_street_music: {
        energyCost: 10,
        // НЕ once — можно фармить, но без повторов подряд
        lines: [
            { text: 'Ты присоединяешься к уличному музыканту.', portrait: '🎸' },
            { text: 'Играете несколько часов у метро.', portrait: '🎶' },
            { text: 'Прохожие бросают монеты в шляпу.', portrait: '💰' },
            { text: 'Заработано 150₽ и +5 репутации!', portrait: '⭐' }
        ],
        reward: { money: 150, rep: 5 },
        nextQuest: 'Найти инвестора на Невском'
    },
    scene_investor: {
        energyCost: 8,
        once: true,
        lines: [
            { text: 'Инвестор рассказывает про стартап доставки.', portrait: '💼' },
            { text: 'Ты вкладываешь 500 рублей.', portrait: '💸' },
            { text: 'Через неделю — первый доход!', portrait: '📈' },
            { text: 'Заработано 800₽ и +10 репутации!', portrait: '🎉' }
        ],
        reward: { money: 800, rep: 10 },
        cost: 500,
        nextQuest: 'Проверить крипто-трейдера'
    },
    scene_crypto_trade: {
        energyCost: 12,
        once: true,
        lines: [
            { text: 'Ты покупаешь новый токен на 1000₽.', portrait: '🪙' },
            { text: 'Курс летит вверх... затем падает...', portrait: '📉' },
            { text: 'Но ты вовремя продаёшь!', portrait: '💰' },
            { text: 'Прибыль 1200₽ и +15 репутации!', portrait: '🚀' }
        ],
        reward: { money: 1200, rep: 15 },
        cost: 1000,
        nextQuest: 'Зайти в кафе «Пушкинъ»'
    },
    scene_startup_pitch: {
        energyCost: 6,
        once: true,
        lines: [
            { text: 'Стартапер рассказывает про приложение доставки.', portrait: '🧑‍💼' },
            { text: 'Ему нужен технический партнёр. Как строить компанию?', portrait: '💻', choices: [
                { text: '🛡️ Делать ставку на надёжность и честность', action: 'choice_reliable' },
                { text: '⚡ Расти максимально быстро и агрессивно', action: 'choice_aggressive' }
            ]}
        ],
        reward: { rep: 25 },
        nextQuest: 'Найти программиста в кафе'
    },
    scene_hire_dev: {
        energyCost: 10,
        once: true,
        lines: [
            { text: 'Программистка согласна помочь за 1000₽.', portrait: '👩‍💻' },
            { text: 'Вы начинаете писать код.', portrait: '⌨️' },
            { text: 'Через неделю — рабочий прототип!', portrait: '📱' },
            { text: '+30 репутации! Теперь у вас команда.', portrait: '⭐' }
        ],
        reward: { rep: 30 },
        cost: 1000,
        nextQuest: 'Найти партнёра в бизнес-центре'
    },
    scene_partner: {
        energyCost: 8,
        once: true,
        lines: [
            { text: 'Ты встречаешься с потенциальным партнёром.', portrait: '🤝' },
            { text: 'Обсуждаете совместный проект.', portrait: '💼' },
            { text: 'Партнёр соглашается вложиться!', portrait: '💵' },
            { text: '+2000₽ и +20 репутации!', portrait: '🎊' }
        ],
        reward: { money: 2000, rep: 20 },
        nextQuest: 'Найти инвестора-ангела'
    },
    scene_angel: {
        energyCost: 10,
        once: true,
        lines: [
            { text: 'Инвестор-ангел изучает твой проект.', portrait: '👔' },
            { text: 'Он впечатлён результатами.', portrait: '📊' },
            { text: 'Подписан контракт на крупную сумму!', portrait: '📝' },
            { text: '+5000₽ и +30 репутации!', portrait: '🏆' }
        ],
        reward: { money: 5000, rep: 30 },
        nextQuest: 'Запустить первую версию проекта'
    },
    scene_launch: {
        energyCost: 12,
        once: true,
        lines: [
            { text: 'Команда собрана. Первая версия приложения готова.', portrait: '📱' },
            { text: 'Теперь нужно решить, как запускать проект.', portrait: '🚀', choices: [
                { text: '📣 Громкая рекламная кампания — рискнуть всем', action: 'choice_launch_big' },
                { text: '🧪 Тихий запуск — сначала проверить сервис', action: 'choice_launch_safe' }
            ]}
        ],
        reward: { money: 1500, rep: 10 },
        nextQuest: 'Пережить первый кризис'
    },
    scene_crisis: {
        energyCost: 10,
        once: true,
        lines: [
            { text: 'В день запуска сервер перегружен. Клиенты жалуются.', portrait: '🚨' },
            { text: 'Команда ждёт твоего решения.', portrait: '👥', choices: [
                { text: '🔍 Открыто признать проблему и всё исправить', action: 'choice_crisis_open' },
                { text: '💼 Скрыть проблему и продолжить рекламу', action: 'choice_crisis_hide' }
            ]}
        ],
        reward: { rep: 10 },
        nextQuest: 'Подняться на крышу и принять решение'
    },
    scene_finale: {
        once: true,
        lines: [
            { text: 'Ты стоишь на крыше бизнес-центра.', portrait: '🌃' },
            { text: 'Питер раскинулся внизу — весь в огнях.', portrait: '🌆' },
            { text: 'Всего за несколько дней ты прошёл путь от новичка до основателя стартапа.', portrait: '🧑' },
            { text: 'Последний вопрос — что ты сделаешь с компанией?', portrait: '🤔', choices: [
                { text: '💰 Продать компанию и получить огромную сумму', action: 'ending_rich' },
                { text: '🌱 Остаться и строить компанию дальше', action: 'ending_wise' },
                { text: '🤝 Отдать часть компании команде и расти вместе', action: 'ending_team' }
            ]}
        ]
    },
    ending_rich: {
        once: true,
        lines: [
            { text: 'Ты продаёшь стартап крупной корпорации.', portrait: '💼' },
            { text: 'На счёт приходит сумма с шестью нулями.', portrait: '💰' },
            { text: 'Ты обеспечил себя и семью на годы вперёд.', portrait: '🏦' },
            { text: '🏆 ФИНАЛ: Богатый и успешный!', portrait: '💎', win: 'rich' }
        ],
        reward: { money: 100000 }
    },
    ending_wise: {
        once: true,
        lines: [
            { text: 'Ты отказываешься от продажи.', portrait: '🌱' },
            { text: 'Вместо этого — развиваешь продукт.', portrait: '📈' },
            { text: 'Через год твоим приложением пользуются миллионы.', portrait: '🌍' },
            { text: '🏆 ФИНАЛ: Мудрый основатель!', portrait: '🌟', win: 'wise' }
        ],
        reward: { money: 50000, rep: 100 }
    },
    ending_team: {
        once: true,
        lines: [
            { text: 'Ты делишь доли с людьми, которые прошли этот путь вместе с тобой.', portrait: '🤝' },
            { text: 'Команда получает мотивацию, а сервис продолжает расти.', portrait: '🚀' },
            { text: 'Через год вы открываете офисы в нескольких городах.', portrait: '🏙️' },
            { text: '🏆 ФИНАЛ: Основатель команды!', portrait: '👥', win: 'team' }
        ],
        reward: { money: 70000, rep: 150 }
    }
};

// ================= UI ЭЛЕМЕНТЫ =================
const cutsceneEl = document.getElementById('cutscene');
const cutsceneBgEl = document.getElementById('cutscene-bg');
const cutsceneTextEl = document.getElementById('cutscene-text');
const cutscenePortraitEl = document.getElementById('cutscene-portrait');
const cutsceneNextBtn = document.getElementById('cutscene-next');
const dialogueEl = document.getElementById('dialogue');
const dialogueNameEl = document.getElementById('dialogue-name');
const dialogueTextEl = document.getElementById('dialogue-text');
const dialogueNextBtn = document.getElementById('dialogue-next');
const hintEl = document.getElementById('hint');
const moneyEl = document.getElementById('money');
const repEl = document.getElementById('rep');
const energyEl = document.getElementById('energy');
const dayEl = document.getElementById('day');
const locationEl = document.getElementById('location');
const questEl = document.getElementById('quest');
const btnInteract = document.getElementById('btn-interact');
const btnAction = document.getElementById('btn-action');
const chapterEl = document.getElementById('chapter-screen');
const chapterTitleEl = document.getElementById('chapter-title');
const chapterSubEl = document.getElementById('chapter-subtitle');
const endEl = document.getElementById('end-screen');
const endTitleEl = document.getElementById('end-title');
const endTextEl = document.getElementById('end-text');
const startScreen = document.getElementById('start-screen');

let cutsceneLines = [];
let cutsceneIdx = 0;
let cutsceneAfter = null;
let cutsceneIsPrologue = false;
let cutsceneRewardApplied = false;   // защита от повторного применения награды

let dialogueActive = false;
let dialogueObject = null;
let dialogueIdx = 0;

let typingTimer = null;

function typeText(el, text, speed = 25, cb) {
    el.textContent = '';
    let i = 0;
    if (typingTimer) clearInterval(typingTimer);
    typingTimer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text[i++];
            if (i % 3 === 0) AudioSys.play('type');
        } else {
            clearInterval(typingTimer);
            typingTimer = null;
            cb && cb();
        }
    }, speed);
}

function applyReward(reward) {
    if (!reward) return;
    if (reward.money) {
        state.money += reward.money;
        if (reward.money > 0) AudioSys.play('coin');
    }
    if (reward.rep) state.rep += reward.rep;
    updateHUD();
    console.log('💰 Reward applied:', reward, '→ Money:', state.money, 'Rep:', state.rep);
}

// ================= КАТ-СЦЕНЫ =================
function showCutscene(lines, after, isPrologue = false, reward = null, nextQuest = null) {
    state.phase = 'cutscene';
    cutsceneLines = lines.map(l => ({ ...l }));
    cutsceneIdx = 0;
    cutsceneAfter = after;
    cutsceneIsPrologue = isPrologue;
    cutsceneRewardApplied = false;

    // Сохраняем награду и квест — применим ТОЛЬКО ОДИН РАЗ в самом конце
    cutsceneEl._pendingReward = reward;
    cutsceneEl._pendingQuest = nextQuest;

    cutsceneEl.classList.remove('hidden');
    startScreen.classList.add('hidden');
    AudioSys.playMusic('cutscene');
    showCutsceneLine();
}

function showCutsceneLine() {
    const line = cutsceneLines[cutsceneIdx];
    if (!line) return endCutscene();

    if (line.bg) {
        cutsceneBgEl.style.background = line.bg;
        cutsceneBgEl.style.backgroundSize = 'cover';
        cutsceneBgEl.classList.remove('visible');
        requestAnimationFrame(() => cutsceneBgEl.classList.add('visible'));
    }

    cutscenePortraitEl.textContent = line.portrait || '🧑';
    if (line.choices && cutsceneTextEl.textContent === line.text) {
        // Уже показали строку целиком через «Пропустить» — не запускаем печать заново.
    } else {
        typeText(cutsceneTextEl, line.text, 22);
    }
    AudioSys.play('scene');
    if (line.win) state.flags.winType = line.win;

    const choices = line.choices;
    const oldChoices = cutsceneEl.querySelector('#cutscene-choices');
    if (oldChoices) oldChoices.remove();

    if (choices) {
        cutsceneNextBtn.classList.add('hidden');
        const showChoices = () => {
            if (typingTimer) {
                setTimeout(showChoices, 40);
                return;
            }
            const wrap = document.createElement('div');
            wrap.id = 'cutscene-choices';
            wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px;width:90%;max-width:700px;z-index:3;';
            choices.forEach(ch => {
                const b = document.createElement('button');
                b.textContent = ch.text;
                b.style.cssText = 'background:rgba(255,204,85,0.15);border:2px solid #ffcc55;color:#fff;font-family:inherit;font-size:13px;padding:10px;border-radius:4px;cursor:pointer;';
                b.onclick = () => chooseCutsceneOption(ch.action);
                wrap.appendChild(b);
            });
            cutsceneEl.appendChild(wrap);
        };
        showChoices();
    } else {
        cutsceneNextBtn.classList.remove('hidden');
    }
}
function chooseCutsceneOption(action) {
    AudioSys.play('click');
    const cont = cutsceneEl.querySelector('#cutscene-choices');
    if (cont) cont.remove();

    const handlers = {
        choice_reliable: () => { state.flags.reliable = true; state.rep += 5; showToast('Надёжность: +5 репутации'); return 'scene_hire_dev'; },
        choice_aggressive: () => { state.flags.aggressive = true; state.money += 500; showToast('Быстрый рост: +500₽'); return 'scene_hire_dev'; },
        choice_launch_big: () => { state.flags.bigLaunch = true; state.money = Math.max(0, state.money - 700); showToast('Рекламный рывок: -700₽'); return 'scene_crisis'; },
        choice_launch_safe: () => { state.flags.safeLaunch = true; state.rep += 8; showToast('Тестовый запуск: +8 репутации'); return 'scene_crisis'; },
        choice_crisis_open: () => { state.flags.openCrisis = true; state.rep += 20; showToast('Честность: +20 репутации'); return null; },
        choice_crisis_hide: () => { state.flags.hiddenCrisis = true; state.rep = Math.max(0, state.rep - 10); showToast('Скрытие проблемы: -10 репутации'); return null; }
    };

    if (action === 'ending_rich' || action === 'ending_wise' || action === 'ending_team') {
        state.flags.scene_finale_done = true;
        const scene = STORY_SCENES[action];
        cutsceneEl.classList.add('hidden');
        cutsceneNextBtn.classList.remove('hidden');
        saveGame();
        setTimeout(() => showCutscene(scene.lines, null, false, scene.reward, null), 250);
        return;
    }

    const handler = handlers[action];
    if (!handler) return;

    // Выбор завершает текущую сцену, поэтому её награда/квест тоже должны примениться.
    if (!cutsceneRewardApplied) {
        const pendingReward = cutsceneEl._pendingReward;
        const pendingQuest = cutsceneEl._pendingQuest;
        if (pendingReward) applyReward(pendingReward);
        if (pendingQuest) {
            state.quest = pendingQuest;
            updateQuest();
        }
        cutsceneRewardApplied = true;
        cutsceneEl._pendingReward = null;
        cutsceneEl._pendingQuest = null;
    }

    const next = handler();
    updateHUD();
    saveGame();
    cutsceneEl.classList.add('hidden');
    cutsceneNextBtn.classList.remove('hidden');
    state.phase = 'game';

    if (next) {
        setTimeout(() => {
            const scene = STORY_SCENES[next];
            if (scene) showCutscene(scene.lines, null, false, scene.reward, scene.nextQuest);
        }, 300);
    }
}
function nextCutscene() {
    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
        cutsceneTextEl.textContent = cutsceneLines[cutsceneIdx].text;
        return;
    }
    cutsceneIdx++;
    if (cutsceneIdx >= cutsceneLines.length) {
        endCutscene();
    } else {
        showCutsceneLine();
    }
}

function endCutscene() {
    // Применяем награду РОВНО ОДИН РАЗ
    if (!cutsceneRewardApplied) {
        const reward = cutsceneEl._pendingReward;
        const nextQuest = cutsceneEl._pendingQuest;
        if (reward) {
            applyReward(reward);
            console.log('✅ Награда применена в конце сцены:', reward);
        }
        if (nextQuest) {
            state.quest = nextQuest;
            updateQuest();
        }
        cutsceneRewardApplied = true;
        cutsceneEl._pendingReward = null;
        cutsceneEl._pendingQuest = null;
    }

    cutsceneEl.classList.add('hidden');
    const oldChoices = cutsceneEl.querySelector('#cutscene-choices');
    if (oldChoices) oldChoices.remove();
    cutsceneNextBtn.classList.remove('hidden');

    if (cutsceneIsPrologue) {
        showChapter('Глава 1', 'Первые деньги', () => {
            state.phase = 'game';
            switchLocation('room');
        });
        return;
    }

    if (state.flags.winType) {
        showEnd(state.flags.winType);
        return;
    }

    if (cutsceneAfter) {
        const cb = cutsceneAfter;
        cutsceneAfter = null;
        cb();
    }
    state.phase = 'game';
    updateHUD();
}

// ================= ГЛАВЫ И ФИНАЛ =================
function showChapter(title, subtitle, cb) {
    state.phase = 'chapter';
    chapterTitleEl.textContent = title;
    chapterSubEl.textContent = subtitle;
    chapterEl.classList.remove('hidden');
    AudioSys.play('chapter');
    setTimeout(() => {
        chapterEl.classList.add('hidden');
        cb && cb();
    }, 2200);
}

function showEnd(type) {
    state.phase = 'end';
    AudioSys.playMusic('victory');
    AudioSys.play('win');
    if (type === 'wise') {
        endTitleEl.textContent = '🌟 Мудрый основатель!';
        endTextEl.textContent = 'Денег: ' + state.money + '₽\nРепутация: ' + state.rep + '\nДней прошло: ' + state.day + '\n\nТы выбрал путь созидания. Твой стартап изменил мир доставки в России. Ты — легенда.';
    } else {
        endTitleEl.textContent = '💎 Богатый и успешный!';
        endTextEl.textContent = 'Денег: ' + state.money + '₽\nРепутация: ' + state.rep + '\nДней прошло: ' + state.day + '\n\nТы продал стартап за миллионы. Твоя семья обеспечена. Ты добился того, о чём мечтал в провинции.';
    }
    endEl.classList.remove('hidden');
}

// ================= ДИАЛОГ =================
function startDialogue(obj) {
    dialogueObject = obj;
    dialogueIdx = 0;
    dialogueActive = true;
    dialogueEl.classList.remove('hidden');
    dialogueNextBtn.classList.remove('hidden');
    showDialogueLine();
    AudioSys.play('interact');
}

function showDialogueLine() {
    const text = dialogueObject.dialogue[dialogueIdx];
    dialogueNameEl.textContent = dialogueObject.name || '';
    typeText(dialogueTextEl, text, 20);
}

function nextDialogue() {
    if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
        dialogueTextEl.textContent = dialogueObject.dialogue[dialogueIdx];
        return;
    }
    dialogueIdx++;
    if (dialogueIdx >= dialogueObject.dialogue.length) {
        endDialogue();
    } else {
        showDialogueLine();
    }
}

function endDialogue() {
    const obj = dialogueObject;
    dialogueActive = false;
    dialogueObject = null;
    dialogueEl.classList.add('hidden');

    // === Переходы между локациями ===
    if (obj.action === 'goto_spb')      { switchLocation('spb'); return; }
    if (obj.action === 'goto_room')     { switchLocation('room'); return; }
    if (obj.action === 'goto_cafe')     { switchLocation('cafe'); return; }
    if (obj.action === 'goto_business') { switchLocation('business'); return; }
    if (obj.action === 'goto_roof')     { switchLocation('roof'); return; }

    // === Простые действия ===
    if (obj.action === 'poster') {
        if (state.flags.posterDay === state.day) {
            showToast('Сегодня ты уже изучал график. Отдохни до завтра.');
            return;
        }
        if (state.energy < 2) { showToast('Слишком устал. Поспи.'); return; }
        state.energy -= 2;
        state.flags.posterDay = state.day;
        AudioSys.play('coin');
        state.rep += 1;
        updateHUD(); saveGame();
        showToast('+1 репутация');
        return;
    }

    if (obj.action === 'sleep') {
        state.day++;
        state.energy = 100;
        state.flags.posterDay = null;
        updateHUD(); saveGame();
        AudioSys.play('success');
        showChapter('День ' + state.day, 'Новое утро', () => {
            state.phase = 'game';
        });
        return;
    }

    // === Сюжетные сцены ===
    const scene = STORY_SCENES[obj.action];
    if (!scene) return;

    // Проверка одноразовости
    if (scene.once && state.flags[obj.action + '_done']) {
        AudioSys.play('fail');
        showToast('Это задание уже выполнено');
        return;
    }

    // Проверка требований объекта (needs)
    const needs = obj.needs || {};
    if (needs.money && state.money < needs.money) {
        AudioSys.play('fail');
        showToast('Нужно ' + needs.money + '₽!');
        return;
    }
    if (needs.rep && state.rep < needs.rep) {
        AudioSys.play('fail');
        showToast('Нужно ' + needs.rep + ' репутации!');
        return;
    }

    // Энергия — ресурс действий, восстанавливается во сне.
    const energyCost = scene.energyCost || 0;
    if (energyCost && state.energy < energyCost) {
        AudioSys.play('fail');
        showToast('Не хватает энергии! Отдохни в комнате.');
        return;
    }
    // Проверка и списание cost
    if (scene.cost) {
        if (state.money < scene.cost) {
            AudioSys.play('fail');
            showToast('Не хватает денег! Нужно ' + scene.cost + '₽');
            return;
        }
        state.money -= scene.cost;
        updateHUD();
        console.log('💸 Списано:', scene.cost, '→ Money:', state.money);
    }
    if (energyCost) state.energy -= energyCost;

    // Одноразовая сцена отмечается выполненной после запуска.
    // Финал — только после выбора, иначе «Пропустить» мог создать soft-lock.
    if (scene.once && obj.action !== 'scene_finale') state.flags[obj.action + '_done'] = true;

    // Показываем кат-сцену с наградой и квестом
    const linesCopy = scene.lines.map(l => ({ ...l }));
    showCutscene(linesCopy, null, false, scene.reward, scene.nextQuest);
}

// ================= ЛОКАЦИИ =================
function switchLocation(key) {
    if (!locations[key]) return;
    currentLocationKey = key;
    world = locations[key];
    state.location = world.name;
    locationEl.textContent = world.name;

    player.x = 100;
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    camera.x = 0;

    AudioSys.playMusic(world.music);
    AudioSys.play('click');

    updateHUD();
    saveGame();
}

// ================= УПРАВЛЕНИЕ =================
function bindButton(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (e) => { e.preventDefault(); el.classList.add('pressed'); onDown && onDown(); };
    const up = (e) => { e.preventDefault(); el.classList.remove('pressed'); onUp && onUp(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
}

bindButton('btn-left', () => keys.left = true, () => keys.left = false);
bindButton('btn-right', () => keys.right = true, () => keys.right = false);
bindButton('btn-action', () => tryAction());
bindButton('btn-interact', () => tryInteract());

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); tryInteract(); }
    if (e.key === ' ') { e.preventDefault(); tryAction(); }
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
});

dialogueNextBtn.addEventListener('click', nextDialogue);
cutsceneNextBtn.addEventListener('click', nextCutscene);
document.getElementById('cutscene-skip').addEventListener('click', () => {
    const line = cutsceneLines[cutsceneIdx];
    if (line && line.choices) {
        if (typingTimer) {
            clearInterval(typingTimer);
            typingTimer = null;
            cutsceneTextEl.textContent = line.text;
        }
        showCutsceneLine();
        return;
    }
    if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
    endCutscene();
});

document.getElementById('btn-sound').addEventListener('click', (e) => {
    AudioSys.init();
    AudioSys.resume();
    const m = AudioSys.toggleMute();
    e.target.textContent = m ? '🔇' : '🔊';
});

document.getElementById('btn-start').addEventListener('click', () => {
    AudioSys.init();
    AudioSys.resume();
    AudioSys.play('click');
    if (localStorage.getItem(SAVE_KEY)) {
        const loaded = loadGame();
        if (loaded) {
            startScreen.classList.add('hidden');
            state.phase = 'game';
            return;
        }
    }
    startScreen.classList.add('hidden');
    state.money = 500;
    state.rep = 0;
    state.energy = 100;
    state.day = 1;
    state.flags = {};
    state.quest = 'Поговорить с ноутбуком';
    state.location = 'room';
    state.lastMusicDay = 0;
    currentLocationKey = 'room';
    world = locations.room;
    player.x = 100;
    player.y = GROUND_Y - player.h;
    updateHUD();
    updateQuest();
    deleteSave();
    showCutscene(PROLOGUE.map(l => ({ ...l })), null, true);
});

document.getElementById('btn-restart').addEventListener('click', () => {
    deleteSave();
    location.reload();
});

// ================= ВЗАИМОДЕЙСТВИЕ =================
function getNearbyObject() {
    const reach = 45;
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    for (const obj of world.objects) {
        if (obj.visibleWhen && !state.flags[obj.visibleWhen]) continue;
        const ocx = obj.x + obj.w / 2;
        const ocy = obj.y + obj.h / 2;
        if (Math.abs(pcx - ocx) < reach + obj.w / 2 && Math.abs(pcy - ocy) < 70) return obj;
    }
    return null;
}

function tryInteract() {
    AudioSys.init(); AudioSys.resume();
    if (state.phase !== 'game') return;
    if (dialogueActive) { nextDialogue(); return; }
    const obj = getNearbyObject();
    if (obj) startDialogue(obj);
}

function tryAction() {
    AudioSys.init(); AudioSys.resume();
    if (state.phase !== 'game') return;
    if (dialogueActive) { nextDialogue(); return; }
    player.actionTimer = 20;
    const obj = getNearbyObject();
    if (obj) startDialogue(obj);
}

// ================= ТОСТЫ И HUD =================
function showToast(msg) {
    hintEl.textContent = msg;
    hintEl.style.color = '#ff7777';
    setTimeout(() => {
        hintEl.style.color = '#ffff88';
        hintEl.textContent = '';
    }, 1800);
}

function updateHUD() {
    moneyEl.textContent = state.money;
    repEl.textContent = state.rep;
    energyEl.textContent = state.energy;
    dayEl.textContent = state.day;
}

function updateQuest() {
    if (questEl) questEl.textContent = '📋 ' + state.quest;
}

// ================= ОБНОВЛЕНИЕ =================
function update(dt) {
    if (state.phase !== 'game') return;
    if (dialogueActive) return;

    player.vx = 0;
    if (keys.left)  { player.vx = -player.speed; player.facing = -1; }
    if (keys.right) { player.vx =  player.speed; player.facing = 1; }

    if (player.vx !== 0 && player.onGround) {
        player.walkTimer++;
        if (player.walkTimer > 6) {
            player.walkTimer = 0;
            player.walkFrame = (player.walkFrame + 1) % 2;
        }
        player.stepTimer++;
        if (player.stepTimer > 18) {
            player.stepTimer = 0;
            AudioSys.play('step');
        }
    } else {
        player.walkFrame = 0;
    }

    player.x += player.vx;
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > world.width) player.x = world.width - player.w;

    player.vy += 0.55;
    if (player.vy > 12) player.vy = 12;
    const prevY = player.y;
    player.y += player.vy;
    player.onGround = false;

    for (const p of world.platforms) {
        if (player.x + player.w > p.x && player.x < p.x + p.w) {
            if (player.vy >= 0 && prevY + player.h <= p.y + 2 && player.y + player.h >= p.y) {
                player.y = p.y - player.h;
                player.vy = 0;
                player.onGround = true;
            }
        }
    }

    if (player.y > viewHeight + 100) {
        player.x = 100;
        player.y = GROUND_Y - player.h;
        player.vy = 0;
    }

    if (player.actionTimer > 0) player.actionTimer--;
    if (player.invulnTimer > 0) player.invulnTimer--;

    const targetCamX = player.x + player.w / 2 - viewWidth / 2;
    camera.x += (targetCamX - camera.x) * 0.12;
    camera.x = Math.max(0, Math.min(world.width - viewWidth, camera.x));

    const near = getNearbyObject();
    if (near) {
        btnInteract.classList.remove('hidden');
        hintEl.textContent = '✋ ' + near.name;
    } else {
        btnInteract.classList.add('hidden');
        if (!hintEl.textContent || hintEl.textContent.startsWith('✋')) {
            hintEl.textContent = '';
        }
    }
}

// ================= РИСОВАНИЕ =================
let time = 0;
let rainDrops = [];
for (let i = 0; i < 60; i++) {
    rainDrops.push({ x: Math.random() * 800, y: Math.random() * 400, s: 2 + Math.random() * 3 });
}

function drawBackground() {
    const bgType = world.bgType;

    if (bgType === 'room') {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, viewWidth, viewHeight);
        ctx.fillStyle = '#22223e';
        for (let x = 0; x < viewWidth; x += 32) ctx.fillRect(x, 0, 1, GROUND_Y);
        const wx = 400 - camera.x;
        ctx.fillStyle = '#0a1a3e';
        ctx.fillRect(wx, 60, 120, 100);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 20; i++) ctx.fillRect(wx + (i * 13) % 110 + 5, 65 + (i * 17) % 90, 1, 1);
        ctx.fillStyle = '#ffffcc';
        ctx.beginPath(); ctx.arc(wx + 90, 90, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3;
        ctx.strokeRect(wx, 60, 120, 100);
        ctx.beginPath();
        ctx.moveTo(wx + 60, 60); ctx.lineTo(wx + 60, 160);
        ctx.moveTo(wx, 110); ctx.lineTo(wx + 120, 110);
        ctx.stroke();
    } else if (bgType === 'city') {
        const grad = ctx.createLinearGradient(0, 0, 0, viewHeight);
        grad.addColorStop(0, '#1a1230'); grad.addColorStop(0.6, '#2a1a4e'); grad.addColorStop(1, '#4a2a5e');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, viewWidth, viewHeight);

        for (let i = 0; i < 60; i++) {
            const sx = Math.floor((i * 137 + camera.x * 0.1) % (viewWidth + 40) - 20);
            const sy = (i * 71) % (viewHeight * 0.5);
            const tw = 0.5 + 0.5 * Math.sin(time * 0.05 + i);
            ctx.fillStyle = 'rgba(255,255,255,' + tw + ')';
            ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
        }
        const moonX = Math.floor(viewWidth - 90 - camera.x * 0.05);
        ctx.fillStyle = '#ffffcc'; ctx.beginPath(); ctx.arc(moonX, 45, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1a4e'; ctx.beginPath(); ctx.arc(moonX - 7, 42, 20, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#0f0f2e';
        for (let i = 0; i < 20; i++) {
            const bx = Math.floor(i * 180 - camera.x * 0.3);
            const bh = 80 + (i * 37) % 100;
            ctx.fillRect(bx, GROUND_Y - bh, 100, bh);
            ctx.fillStyle = '#3a3a6e';
            for (let wy = GROUND_Y - bh + 10; wy < GROUND_Y - 10; wy += 15)
                for (let wx = bx + 8; wx < bx + 90; wx += 16)
                    if ((wx + wy) % 3 !== 0) ctx.fillRect(Math.floor(wx), Math.floor(wy), 6, 8);
            ctx.fillStyle = '#0f0f2e';
        }
        ctx.fillStyle = '#1a0f2e';
        for (let i = 0; i < 25; i++) {
            const bx = Math.floor(i * 140 - camera.x * 0.55);
            const bh = 120 + (i * 53) % 90;
            ctx.fillRect(bx, GROUND_Y - bh, 90, bh);
            ctx.fillStyle = '#5a5a8e';
            for (let wy = GROUND_Y - bh + 10; wy < GROUND_Y - 10; wy += 18)
                for (let wx = bx + 10; wx < bx + 80; wx += 20)
                    if (((wx * 3 + wy + i) % 5) > 2) ctx.fillRect(Math.floor(wx), Math.floor(wy), 8, 10);
            ctx.fillStyle = '#1a0f2e';
        }
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.35)';
        ctx.lineWidth = 1;
        for (const drop of rainDrops) {
            const x = Math.floor((drop.x + camera.x * 0.5 + time * 2) % (viewWidth + 40) - 20);
            const y = (drop.y + time * 8) % viewHeight;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + drop.s * 3); ctx.stroke();
        }
    } else if (bgType === 'cafe') {
        const grad = ctx.createLinearGradient(0, 0, 0, viewHeight);
        grad.addColorStop(0, '#3a1e1e'); grad.addColorStop(1, '#5a3a2a');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, viewWidth, viewHeight);

        for (let i = 0; i < 8; i++) {
            const lx = i * 150 - camera.x * 0.3 + 60;
            const ly = 30 + Math.sin(time * 0.03 + i) * 3;
            ctx.fillStyle = 'rgba(255, 220, 120, 0.3)';
            ctx.beginPath(); ctx.arc(lx, ly, 25, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffdd80';
            ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#3a1a0a';
        for (let i = 0; i < 6; i++) {
            const tx = i * 220 - camera.x * 0.7 + 100;
            ctx.fillRect(tx, GROUND_Y - 30, 60, 6);
            ctx.fillRect(tx + 26, GROUND_Y - 24, 8, 24);
        }
    } else if (bgType === 'office') {
        const grad = ctx.createLinearGradient(0, 0, 0, viewHeight);
        grad.addColorStop(0, '#0a1a2e'); grad.addColorStop(1, '#1a2a4e');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, viewWidth, viewHeight);
        for (let i = 0; i < 10; i++) {
            const wx = i * 200 - camera.x * 0.4;
            ctx.fillStyle = '#3a4a6e'; ctx.fillRect(wx, 60, 140, 180);
            ctx.fillStyle = '#1a2a4e';
            for (let j = 0; j < 8; j++) ctx.fillRect(wx + 10 + j * 15, 180, 10, 40);
            ctx.fillStyle = '#ffcc55';
            for (let j = 0; j < 8; j++)
                for (let k = 0; k < 3; k++)
                    if ((i + j + k) % 2) ctx.fillRect(wx + 15 + j * 15, 190 + k * 10, 3, 3);
            ctx.strokeStyle = '#5a6a8e'; ctx.lineWidth = 2;
            ctx.strokeRect(wx, 60, 140, 180);
        }
    } else if (bgType === 'rooftop') {
        const grad = ctx.createLinearGradient(0, 0, 0, viewHeight);
        grad.addColorStop(0, '#ff7a3a'); grad.addColorStop(0.4, '#c04a6e'); grad.addColorStop(1, '#4a1a4e');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, viewWidth, viewHeight);

        const sunX = viewWidth * 0.7 - camera.x * 0.1;
        const sunY = 100 + Math.sin(time * 0.02) * 5;
        ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
        ctx.beginPath(); ctx.arc(sunX, sunY, 60, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffdd80';
        ctx.beginPath(); ctx.arc(sunX, sunY, 30, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#2a0f2e';
        for (let i = 0; i < 30; i++) {
            const bx = i * 90 - camera.x * 0.5;
            const bh = 60 + (i * 47) % 80;
            ctx.fillRect(bx, GROUND_Y - bh, 70, bh);
            ctx.fillStyle = '#ffcc55';
            for (let wy = GROUND_Y - bh + 8; wy < GROUND_Y - 6; wy += 12)
                for (let wx = bx + 6; wx < bx + 60; wx += 12)
                    if ((wx + wy + i) % 3 === 0) ctx.fillRect(wx, wy, 3, 4);
            ctx.fillStyle = '#2a0f2e';
        }
    }

    const vig = ctx.createRadialGradient(viewWidth/2, viewHeight/2, viewHeight * 0.4,
                                          viewWidth/2, viewHeight/2, viewHeight * 0.9);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
}

function drawPlatform(p) {
    const x = Math.floor(p.x - camera.x);
    const y = Math.floor(p.y);
    if (x + p.w < 0 || x > viewWidth) return;
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x, y, p.w, p.h);
    ctx.fillStyle = '#5a7a3a'; ctx.fillRect(x, y, p.w, 5);
    ctx.fillStyle = '#7a9a4a'; ctx.fillRect(x, y, p.w, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < p.w / 16; i++) {
        ctx.fillRect(x + i * 16 + 4, y + 12, 3, 3);
        ctx.fillRect(x + i * 16 + 10, y + 22, 3, 3);
    }
}

function drawObject(obj) {
    if (obj.visibleWhen && !state.flags[obj.visibleWhen]) return;
    const x = Math.floor(obj.x - camera.x);
    const y = Math.floor(obj.y);
    if (x + obj.w < 0 || x > viewWidth) return;
    const bob = Math.sin(time * 0.05 + obj.x * 0.1) * 2;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x + obj.w / 2, y + obj.h + 2, obj.w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (obj.type === 'computer') {
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 4, y + 28, obj.w + 8, 12);
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x, y + 6, obj.w, 24);
        ctx.fillStyle = '#1a4a1a'; ctx.fillRect(x + 3, y + 9, obj.w - 6, 18);
        ctx.fillStyle = '#7aff7a';
        for (let i = 0; i < 5; i++) ctx.fillRect(x + 5, y + 11 + i * 3, 6 + (i * 3) % 10, 1);
    } else if (obj.type === 'poster') {
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y + 8, obj.w, obj.h - 8);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 3, y + 11, obj.w - 6, obj.h - 14);
        ctx.strokeStyle = '#7aff7a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 5, y + obj.h - 8);
        for (let i = 0; i < 8; i++)
            ctx.lineTo(x + 5 + i * (obj.w - 10) / 7, y + obj.h - 8 - (i * 4 + (i % 2 ? 8 : 0)));
        ctx.stroke();
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('₿', x + obj.w - 14, y + 20);
    } else if (obj.type === 'bed') {
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x, y + 20, obj.w + 10, obj.h - 20);
        ctx.fillStyle = '#cd5a7a'; ctx.fillRect(x, y + 10, obj.w + 10, 12);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 6, 14, 6);
        ctx.fillStyle = '#ffcc55';
        ctx.font = '12px serif';
        ctx.fillText('💤', x + obj.w / 2, y - 4 + bob);
    } else if (obj.type === 'door') {
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x, y, obj.w, obj.h);
        ctx.fillStyle = '#3a2a10'; ctx.fillRect(x + 3, y + 3, obj.w - 6, obj.h - 6);
        ctx.fillStyle = '#ffcc55'; ctx.fillRect(x + obj.w - 8, y + obj.h / 2 - 2, 3, 4);
        ctx.fillStyle = '#7aff7a'; ctx.fillRect(x + 6, y + 8, obj.w - 12, 3);
    } else if (obj.type === 'npc') {
        const cx = x + obj.w / 2;
        const color = obj.name.indexOf('музыкант') >= 0 ? '#cd5a7a' :
                      obj.name.indexOf('Инвестор') >= 0 ? '#2a4a7a' :
                      obj.name.indexOf('трейдер') >= 0 ? '#cd8a2a' :
                      obj.name.indexOf('Партнёр') >= 0 ? '#3a8a4a' :
                      obj.name.indexOf('Стартапер') >= 0 ? '#6a5a3a' :
                      obj.name.indexOf('Программистка') >= 0 ? '#7a4a8a' :
                      obj.name.indexOf('Закат') >= 0 ? '#ffaa3a' : '#6a3a8a';
        ctx.fillStyle = color; ctx.fillRect(cx - 8, y + 18, 16, 30);
        ctx.fillStyle = '#e0b080'; ctx.fillRect(cx - 7, y + 8, 14, 12);
        ctx.fillStyle = '#000';
        ctx.fillRect(cx - 4, y + 13, 2, 2);
        ctx.fillRect(cx + 2, y + 13, 2, 2);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(cx - 7, y + 48, 6, 10);
        ctx.fillRect(cx + 1, y + 48, 6, 10);
        ctx.font = '16px serif'; ctx.textAlign = 'center';
        ctx.fillText(obj.name.split(' ')[0], cx, y - 5 + bob);
        ctx.textAlign = 'left';
    }
}

function drawPlayer() {
    const x = Math.floor(player.x - camera.x);
    const y = Math.floor(player.y);
    if (x + player.w < 0 || x > viewWidth) return;
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer / 3) % 2 === 0) return;

    const bob = player.walkFrame === 1 ? 1 : 0;
    const cx = x + player.w / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(cx, y + player.h + 2, 12, 3, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#2a3a5a';
    if (player.walkFrame === 1) {
        ctx.fillRect(x + 4, y + 24, 6, 8);
        ctx.fillRect(x + 13, y + 22, 6, 10);
    } else {
        ctx.fillRect(x + 4, y + 22, 6, 10);
        ctx.fillRect(x + 13, y + 24, 6, 8);
    }
    ctx.fillStyle = '#5a7acd'; ctx.fillRect(x + 3, y + 10 + bob, 17, 14);
    ctx.fillStyle = '#e0b080';
    ctx.fillRect(x + 1, y + 12 + bob, 3, 8);
    ctx.fillRect(x + 19, y + 12 + bob, 3, 8);
    ctx.fillRect(x + 5, y + 2 + bob, 13, 10);
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(x + 4, y + 1 + bob, 15, 4);
    ctx.fillRect(x + 4, y + 2 + bob, 2, 4);
    ctx.fillStyle = '#000';
    if (player.facing > 0) ctx.fillRect(x + 13, y + 6 + bob, 2, 2);
    else ctx.fillRect(x + 9, y + 6 + bob, 2, 2);

    if (player.actionTimer > 0) {
        const p = 1 - player.actionTimer / 20;
        ctx.strokeStyle = 'rgba(255, 255, 100, ' + (1 - p) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, y + 10, 10 + p * 25, 0, Math.PI * 2); ctx.stroke();
    }
}

function render() {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    drawBackground();
    for (const p of world.platforms) drawPlatform(p);
    for (const obj of world.objects) drawObject(obj);
    drawPlayer();
}

// ================= СОХРАНЕНИЕ =================
const SAVE_KEY = 'spb_game_save_v3';

function saveGame() {
    try {
        if (state.phase === 'cutscene' || state.phase === 'chapter') return;
        const data = {
            state: {
                money: state.money, rep: state.rep, energy: state.energy, day: state.day,
                phase: state.phase, flags: state.flags, quest: state.quest,
                location: currentLocationKey
            },
            player: { x: player.x, y: player.y, facing: player.facing }
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Save unavailable:', e);
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data.state || !data.player || !locations[data.state.location]) return false;
        Object.assign(state, data.state);
        Object.assign(player, data.player);
        state.phase = 'game';
        currentLocationKey = data.state.location;
        world = locations[currentLocationKey];
        locationEl.textContent = world.name;
        updateHUD();
        updateQuest();
        return true;
    } catch (e) {
        console.warn('Load unavailable:', e);
        return false;
    }
}

function deleteSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

window.addEventListener('beforeunload', saveGame);

// ================= ГЛАВНЫЙ ЦИКЛ =================
let lastTime = performance.now();
let accumulator = 0;
const STEP = 1000 / 60;

function loop(now) {
    const delta = Math.min(now - lastTime, 100);
    lastTime = now;
    accumulator += delta;
    time += delta / 16;
    while (accumulator >= STEP) {
        update(delta);
        accumulator -= STEP;
    }
    render();
    requestAnimationFrame(loop);
}

function init() {
    resize();
    const startBtn = document.getElementById('btn-start');
    if (startBtn && localStorage.getItem(SAVE_KEY)) {
        startBtn.textContent = '▶ ПРОДОЛЖИТЬ';
    }
    updateHUD();
    updateQuest();
    locationEl.textContent = world.name;
    requestAnimationFrame(loop);
}

init();