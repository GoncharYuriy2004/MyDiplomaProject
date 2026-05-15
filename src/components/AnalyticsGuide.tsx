import { useState } from 'react';
import {
    X, Download, BookOpen, Calculator, TrendingUp,
    Tag, AlertTriangle, ChevronRight, Lightbulb, BarChart2, Info,
} from 'lucide-react';
import { downloadAnalyticsGuidePDF } from '../utils/pdfGenerator';

// ─── Guide data ───────────────────────────────────────────────────────────────

const SECTIONS = [
    {
        id: 'opt', label: 'Оптимізація', Icon: Calculator, color: 'blue',
        desc: 'Визначте оптимальний обсяг і момент замовлення щоб мінімізувати витрати на зберігання та дефіцит.',
        models: [
            {
                num: 1, tag: 'EOQ',
                title: 'Оптимальний розмір замовлення',
                formula: 'Q* = √(2·D·S / H)',
                purpose: 'Розраховує скільки одиниць замовляти за раз, щоб мінімізувати сукупні річні витрати на запаси.',
                steps: [
                    'Оберіть матеріал у синьому блоці — поле D заповниться автоматично з реальних транзакцій',
                    'Введіть S — вартість оформлення одного замовлення у постачальника (грн)',
                    'Введіть H — вартість зберігання 1 одиниці протягом року (грн)',
                    'Натисніть Tab або просто подивіться на результат — розрахунок відбувається миттєво',
                ],
                params: [
                    ['D', 'Річний попит (од/рік)', 'Автоматично з транзакцій'],
                    ['S', 'Вартість замовлення (грн)', 'Вручну (організаційний параметр)'],
                    ['H', 'Вартість зберігання/рік (грн)', 'Вручну (організаційний параметр)'],
                ],
                results: [
                    ['Q*', 'Оптимальна партія замовлення — стільки одиниць варто замовляти за раз'],
                    ['Замовлень/рік', 'D ÷ Q* — як часто треба поповнювати запас'],
                    ['TC', 'Мінімальні загальні витрати на управління запасом за рік'],
                ],
                tip: 'Якщо D = 0 (немає транзакцій) — введіть очікуваний річний попит вручну.',
            },
            {
                num: 2, tag: 'EPQ',
                title: 'Оптимальна партія поповнення',
                formula: 'EPQ = √(2DS/H · P/(P−D))',
                purpose: 'Різновид EOQ для випадку коли товар надходить поступово, а не одразу (постачання партіями або власне виробництво).',
                steps: [
                    'Оберіть матеріал або введіть D вручну',
                    'Введіть S та H (ті ж що для EOQ)',
                    'Введіть P — річна виробнича потужність або швидкість надходження',
                    'P обов\'язково > D, інакше модель неможлива',
                ],
                params: [
                    ['D', 'Річний попит (од/рік)', 'Автоматично або вручну'],
                    ['S', 'Вартість замовлення (грн)', 'Вручну'],
                    ['H', 'Вартість зберігання (грн/рік)', 'Вручну'],
                    ['P', 'Річна надходжена потужність (од/рік)', 'Вручну (за замовч. 5000)'],
                ],
                results: [
                    ['EPQ', 'Оптимальна партія поповнення'],
                    ['I_max', 'Максимальний рівень запасу під час надходження'],
                    ['TC', 'Загальні витрати'],
                ],
                tip: 'Якщо P ≤ D — система попередить про помилку. Збільшіть P або зменшіть D.',
            },
            {
                num: 3, tag: 'ROP',
                title: 'Точка перезамовлення',
                formula: 'ROP = d·L + Z·σ·√L',
                purpose: 'Визначає при якому залишку на складі слід оформляти нове замовлення, щоб воно прийшло вчасно з урахуванням страхового запасу.',
                steps: [
                    'Оберіть матеріал — d (попит/день) заповниться автоматично',
                    'Вкажіть L — типовий час доставки від постачальника в днях',
                    'Вкажіть σ — стандартне відхилення попиту за день (наприклад: 2–5)',
                    'Оберіть рівень обслуговування: 95% — стандарт, 99% — критичні позиції',
                ],
                params: [
                    ['d', 'Попит за день (од/день)', 'Автоматично (D÷365)'],
                    ['L', 'Час доставки (дні)', 'Вручну (наприклад: 7)'],
                    ['σ', 'Відхилення попиту/день', 'Вручну (наприклад: 3)'],
                    ['Z', 'Коеф. надійності (рівень сервісу)', '90%→1.28 / 95%→1.645 / 99%→2.326'],
                ],
                results: [
                    ['ROP', 'Якщо залишок = ROP — відразу замовляйте'],
                    ['d·L', 'Попит протягом доставки (без страхового запасу)'],
                    ['SS', 'Страховий запас — буфер на випадок коливань'],
                ],
                tip: 'Для критичних позицій (клас A або CI > 0.7) використовуйте рівень обслуговування 99%.',
            },
            {
                num: 4, tag: 'SS',
                title: 'Страховий запас',
                formula: 'SS = Z·σ·√L  |  Розшир.: Z·√(L·σd²+d²·σL²)',
                purpose: 'Розраховує мінімальний буферний запас для захисту від коливань попиту та затримок доставки.',
                steps: [
                    'Введіть σd — відхилення денного попиту',
                    'Введіть L — середній час доставки (дні)',
                    'Для розширеної формули введіть σL — відхилення часу доставки',
                    'Оберіть рівень обслуговування',
                ],
                params: [
                    ['σd', 'Стандартне відхилення попиту/день', 'Вручну'],
                    ['L', 'Час доставки (дні)', 'Вручну'],
                    ['d', 'Середній попит/день', 'Автоматично або вручну'],
                    ['σL', 'Відхилення часу доставки (дні)', 'Вручну (наприклад: 1–2)'],
                ],
                results: [
                    ['Базовий SS', 'Враховує лише коливання попиту'],
                    ['Розширений SS', 'Враховує і нестабільність доставки — завжди більший або рівний базовому'],
                ],
                tip: 'Розширена формула точніша якщо постачальник іноді затримує доставку.',
            },
        ],
    },
    {
        id: 'forecast', label: 'Прогнозування', Icon: TrendingUp, color: 'purple',
        desc: 'Передбачте майбутній попит на підставі минулих даних. Дані підтягуються автоматично якщо є 3+ місяці транзакцій.',
        models: [
            {
                num: 5, tag: 'SMA',
                title: 'Просте ковзне середнє',
                formula: 'SMAₜ = (Dₜ₋₁ + Dₜ₋₂ + … + Dₜ₋ₙ) / n',
                purpose: 'Усереднює попит за останні n місяців. Ідеально для стабільного попиту без тренду та сезонності.',
                steps: [
                    'Перевірте поле з даними — якщо є транзакції, воно заповнено автоматично',
                    'Якщо транзакцій мало — введіть місячний попит вручну через кому (наприклад: 12,15,11,18)',
                    'Налаштуйте вікно n — кількість місяців для усереднення (рекомендовано: 3)',
                    'Порівняйте синю лінію SMA з чорною (фактичний) на графіку',
                ],
                params: [['n', 'Ширина вікна (місяців)', 'Вручну (рекоменд. 3–6)']],
                results: [
                    ['SMA-лінія', 'Синя пунктирна лінія на графіку'],
                    ['Прогноз', 'Останнє значення SMA = прогноз на наступний місяць'],
                ],
                tip: 'Чим більше n — тим плавніше лінія, але повільніша реакція на зміни.',
            },
            {
                num: 6, tag: 'SES',
                title: 'Просте експоненційне згладжування',
                formula: 'Fₜ = α·Dₜ₋₁ + (1−α)·Fₜ₋₁',
                purpose: 'Надає більшу вагу свіжим даним. Краще реагує на зміни попиту ніж SMA.',
                steps: [
                    'Перевірте або введіть дані попиту',
                    'Налаштуйте α (від 0.01 до 0.99)',
                    'Порівняйте фіолетову лінію SES з фактичним попитом',
                ],
                params: [['α', 'Коефіцієнт згладжування (0.01–0.99)', 'Вручну (рекоменд. 0.2–0.4)']],
                results: [
                    ['α → 0', 'Плавна реакція, більше спирається на минуле'],
                    ['α → 1', 'Швидка реакція, майже повторює останнє значення'],
                ],
                tip: 'Починайте з α = 0.3. Якщо попит різко змінився — спробуйте α = 0.5–0.7.',
            },
            {
                num: 7, tag: 'Holt DES',
                title: 'Подвійне ЕЗ з трендом (Holt)',
                formula: 'F(t+m) = Lₜ + m·Tₜ',
                purpose: 'Враховує тренд (зростання або спадання попиту) і будує прогноз на кілька місяців вперед.',
                steps: [
                    'Перевірте або введіть дані (мін. 4 місяці)',
                    'Налаштуйте α — згладжування рівня',
                    'Налаштуйте β — згладжування тренду',
                    'Вкажіть Горизонт m — на скільки місяців вперед будувати прогноз (1–6)',
                    'Жовта лінія за межею фактичних даних — це прогноз',
                ],
                params: [
                    ['α', 'Згладжування рівня (0.01–0.99)', 'Вручну (рекоменд. 0.3)'],
                    ['β', 'Згладжування тренду (0.01–0.99)', 'Вручну (рекоменд. 0.2)'],
                    ['m', 'Горизонт прогнозу (міс.)', 'Вручну (1–6)'],
                ],
                results: [
                    ['Жовта лінія', 'Holt DES — прогноз + тренд'],
                    ['+1, +2…', 'Прогнозні значення на m місяців вперед'],
                ],
                tip: 'Якщо попит стабільний і без тренду — використайте SES. Holt краще при зростанні або спаді.',
            },
            {
                num: 8, tag: 'Регресія',
                title: 'Лінійна регресія (МНК)',
                formula: 'D̂ₜ = a + b·t  |  b = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²)',
                purpose: 'Знаходить загальний лінійний тренд попиту. Дає коефіцієнт нахилу b та якість R².',
                steps: [
                    'Результати з\'являються автоматично після введення даних (мін. 3 точки)',
                    'Зверніть увагу на знак b та значення R²',
                ],
                params: [
                    ['a', 'Вільний член (базовий рівень попиту)', 'Розраховується автоматично'],
                    ['b', 'Нахил (приріст попиту за місяць)', 'Розраховується автоматично'],
                ],
                results: [
                    ['b > 0', 'Попит зростає на b одиниць за місяць'],
                    ['b < 0', 'Попит спадає'],
                    ['R² > 0.7', 'Хороша апроксимація (зелений)'],
                    ['R² < 0.4', 'Слабка лінійна залежність (червоний)'],
                ],
                tip: 'Зелена лінія на графіку — регресійна пряма. R² показує наскільки вона відповідає реальним даним.',
            },
        ],
    },
    {
        id: 'class', label: 'Класифікація', Icon: Tag, color: 'amber',
        desc: 'Розділіть матеріали на групи за важливістю та передбачуваністю попиту для побудови оптимальної стратегії управління.',
        models: [
            {
                num: 9, tag: 'ABC',
                title: 'ABC-аналіз (принцип Парето)',
                formula: 'wᵢ = (Qᵢ·Pᵢ) / Σ(Qⱼ·Pⱼ)',
                purpose: 'Класифікує матеріали за внеском у загальну вартість запасів. Допомагає зосередити увагу на найважливіших позиціях.',
                steps: [
                    'Жодних дій не потрібно — розрахунок відбувається автоматично на основі поточного залишку та ціни',
                    'Перегляньте таблицю — матеріали відсортовані від найдорожчих до найдешевших',
                    'Зверніть увагу на колонку «Кум. %» та колір класу',
                ],
                params: [
                    ['Qᵢ', 'Поточний залишок матеріалу i', 'Автоматично з інвентарю'],
                    ['Pᵢ', 'Ціна за одиницю матеріалу i', 'Автоматично з інвентарю'],
                ],
                results: [
                    ['A (синій)', 'Перші 80% вартості — суворий контроль, часті перевірки'],
                    ['B (жовтий)', '80–95% вартості — помірний контроль'],
                    ['C (сірий)', 'Останні 5% вартості — спрощений облік'],
                ],
                tip: 'Зазвичай 10–20% позицій — клас A, але вони становлять 80% вартості запасів.',
            },
            {
                num: 10, tag: 'XYZ',
                title: 'XYZ-аналіз варіативності попиту',
                formula: 'CV = σ / μ  (коефіцієнт варіації)',
                purpose: 'Оцінює стабільність попиту на кожну позицію на основі реальної історії транзакцій.',
                steps: [
                    'Розрахунок автоматичний — потрібні реальні транзакції видачі та списання за 2+ місяці',
                    'Позиції з * мають менше 2 місяців даних — клас Z присвоєно за замовчуванням',
                    'Поєднайте з ABC: A+X = пріоритет, A+Z = найбільший ризик',
                ],
                params: [
                    ['σ', 'Стандартне відхилення місячного попиту', 'Автоматично з транзакцій'],
                    ['μ', 'Середній місячний попит', 'Автоматично з транзакцій'],
                ],
                results: [
                    ['X (зелений)', 'CV ≤ 0.1 — стабільний, легко планувати'],
                    ['Y (жовтий)', 'CV 0.1–0.25 — змінний (сезонність)'],
                    ['Z (червоний)', 'CV > 0.25 — хаотичний, важко прогнозувати'],
                ],
                tip: 'A+Z позиції — найнебезпечніші: дорогі та непередбачувані. Для них рекомендується підвищений страховий запас.',
            },
        ],
    },
    {
        id: 'risk', label: 'Ризик та критичність', Icon: AlertTriangle, color: 'red',
        desc: 'Оцініть ймовірність дефіциту та критичність кожної позиції для прийняття пріоритетних рішень щодо поповнення.',
        models: [
            {
                num: 11, tag: 'Пуассон',
                title: 'Модель Пуассона — ймовірнісний попит',
                formula: 'P(X=k) = (λᵏ · e⁻λ) / k!',
                purpose: 'Моделює випадковий попит як Пуассонівський процес. Визначає ймовірність дефіциту при поточному рівні запасу.',
                steps: [
                    'Оберіть матеріал — λ (середній місячний попит) та s (поточний запас) заповняться автоматично',
                    'Або оберіть «Усі матеріали» — λ розраховується як середній сукупний місячний попит',
                    'При потребі скоригуйте λ та s вручну',
                    'Дивіться на два великих показники та графік',
                ],
                params: [
                    ['λ', 'Середній попит за місяць', 'Автоматично з транзакцій'],
                    ['s', 'Поточний запас на складі', 'Автоматично з інвентарю'],
                ],
                results: [
                    ['P(X ≤ s)', 'Ймовірність що запасу вистачить (рівень обслуговування) — синій'],
                    ['P(X > s)', 'Ймовірність виникнення дефіциту — червоний'],
                    ['Графік', 'Сині стовпці = покриває попит; червоні = дефіцит'],
                ],
                tip: 'Якщо P(X > s) > 10% — розгляньте збільшення запасу або зменшення λ через кращу організацію.',
            },
            {
                num: 12, tag: 'CI',
                title: 'Індекс критичності запасу',
                formula: 'CI = W₁·(1/r)/3 + W₂·C_norm + W₃·0.5',
                purpose: 'Зважена оцінка критичності позиції з трьох факторів: покриття залишком, відносна вартість, інші фактори.',
                steps: [
                    'Розрахунок автоматичний — перегляньте таблицю та кольори рівнів',
                    'За потреби скоригуйте ваги W₁, W₂, W₃ (сума має бути ≈ 1.0)',
                    'Зверніть увагу на позиції з рівнем «Критичний» — їх потрібно поповнити в першу чергу',
                ],
                params: [
                    ['W₁ = 0.40', 'Покриття залишком (запас ÷ min_stock)', 'Вручну (за замовч. 0.40)'],
                    ['W₂ = 0.35', 'Відносна вартість позиції', 'Вручну (за замовч. 0.35)'],
                    ['W₃ = 0.25', 'Решта факторів (ризик тощо)', 'Вручну (за замовч. 0.25)'],
                ],
                results: [
                    ['Критичний (червоний)', 'CI > 0.7 — негайне поповнення'],
                    ['Високий (жовтий)', 'CI 0.4–0.7 — планове замовлення'],
                    ['Нормальний (зелений)', 'CI < 0.4 — моніторинг'],
                ],
                tip: 'r = запас ÷ min_stock. Якщо r < 1 — запас нижче мінімуму. W₁+W₂+W₃ повинно дорівнювати 1.0.',
            },
        ],
    },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string; tab: string }> = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200', badge: 'bg-blue-600',   tab: 'border-blue-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-600', tab: 'border-purple-500' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', badge: 'bg-amber-500',  tab: 'border-amber-500' },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   badge: 'bg-red-600',    tab: 'border-red-500' },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export default function AnalyticsGuide({ onClose }: Props) {
    const [activeSection, setActiveSection] = useState('opt');
    const section = SECTIONS.find(s => s.id === activeSection)!;
    const c = COLOR_MAP[section.color];
    const [downloading, setDownloading] = useState(false);

    const handleDownload = () => {
        setDownloading(true);
        setTimeout(() => {
            downloadAnalyticsGuidePDF(SECTIONS as any);
            setDownloading(false);
        }, 100);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-700 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                            <BookOpen size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base leading-tight">Інструкція з роботи з математичними моделями</h2>
                            <p className="text-slate-400 text-xs mt-0.5">12 моделей управління запасами · покрокові пояснення</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-lg"
                        >
                            <Download size={15} />
                            {downloading ? 'Генерація…' : 'Завантажити PDF'}
                        </button>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Section tabs ── */}
                <div className="flex border-b border-slate-100 bg-slate-50 shrink-0 overflow-x-auto">
                    {SECTIONS.map(s => {
                        const sc = COLOR_MAP[s.color];
                        const isActive = s.id === activeSection;
                        return (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                                    isActive ? `${sc.text} ${sc.tab} bg-white` : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-white/60'
                                }`}
                            >
                                <s.Icon size={15} />
                                {s.label}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white ${sc.badge}`}>
                                    {s.models.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto">
                    {/* Section intro */}
                    <div className={`px-6 py-4 ${c.bg} border-b ${c.border}`}>
                        <div className="flex items-start gap-3">
                            <section.Icon size={18} className={`${c.text} mt-0.5 shrink-0`} />
                            <p className={`text-sm ${c.text} font-medium`}>{section.desc}</p>
                        </div>
                    </div>

                    {/* Typical workflow */}
                    {activeSection === 'opt' && (
                        <div className="mx-6 mt-5 mb-1 bg-blue-600 rounded-xl p-4 text-white text-sm">
                            <p className="font-bold mb-2 flex items-center gap-2"><ChevronRight size={14} /> Типовий сценарій роботи</p>
                            <ol className="space-y-1 text-blue-100 list-decimal list-inside text-xs leading-relaxed">
                                <li>Перейдіть у «Класифікація» → визначте позиції класу <strong className="text-white">A</strong></li>
                                <li>Перейдіть у «Ризик» → виявіть позиції з CI &gt; 0.7</li>
                                <li>Поверніться сюди → оберіть критичний матеріал → розрахуйте <strong className="text-white">EOQ + ROP</strong></li>
                                <li>Перейдіть у «Прогнозування» → скоригуйте D якщо попит зростає</li>
                            </ol>
                        </div>
                    )}

                    {/* Models */}
                    <div className="p-6 space-y-5">
                        {section.models.map(model => (
                            <div key={model.num} className="border border-slate-200 rounded-2xl overflow-hidden">
                                {/* Model header */}
                                <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                                    <span className={`w-7 h-7 rounded-full ${c.badge} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                                        {model.num}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${c.bg} ${c.text}`}>{model.tag}</span>
                                            <h3 className="font-bold text-slate-800 text-sm">{model.title}</h3>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    {/* Formula */}
                                    <div className={`font-mono text-sm px-4 py-2.5 rounded-xl ${c.bg} ${c.text} border ${c.border} font-semibold`}>
                                        {model.formula}
                                    </div>

                                    {/* Purpose */}
                                    <p className="text-sm text-slate-600 leading-relaxed">{model.purpose}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Steps */}
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                                <BarChart2 size={12} /> Як користуватись
                                            </p>
                                            <ol className="space-y-1.5">
                                                {model.steps.map((step, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                                        <span className={`w-4 h-4 rounded-full ${c.badge} text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                                                            {i + 1}
                                                        </span>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>

                                        {/* Params + Results */}
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Параметри</p>
                                                <div className="space-y-1">
                                                    {model.params.map(([name, desc, src]) => (
                                                        <div key={name} className="flex items-start gap-2 text-xs">
                                                            <code className={`font-mono font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text} shrink-0`}>{name}</code>
                                                            <span className="text-slate-500">{desc}</span>
                                                            {src && <span className="text-slate-400 italic shrink-0 hidden lg:inline">· {src}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Результати</p>
                                                <div className="space-y-1">
                                                    {model.results.map(([name, desc]) => (
                                                        <div key={name} className="flex items-start gap-2 text-xs">
                                                            <ChevronRight size={12} className={`${c.text} shrink-0 mt-0.5`} />
                                                            <span><strong className="text-slate-700">{name}</strong> — <span className="text-slate-500">{desc}</span></span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tip */}
                                    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                        <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-800">{model.tip}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Info size={12} /> Дані оновлюються в реальному часі з інвентарю та транзакцій системи
                    </p>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                        <Download size={13} />
                        {downloading ? 'Генерація…' : 'Завантажити PDF-інструкцію'}
                    </button>
                </div>
            </div>
        </div>
    );
}
