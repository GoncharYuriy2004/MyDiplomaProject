export const translateItemName = (name: string, language: string): string => {
    if (language !== 'en') return name;

    const dictionary: Record<string, string> = {
        "Процесор": "Processor",
        "ядер": "cores",
        "Оперативна пам'ять": "RAM",
        "Монітор": "Monitor",
        "пошкоджений": "damaged",
        "Комутатор": "Switch",
        "Маршрутизатор": "Router",
        "Точка доступу": "Access Point",
        "довга дальність": "long range",
        "Патч-панель": "Patch Panel",
        "Ноутбук": "Laptop",
        "ДБЖ": "UPS",
        "Блок розподілу живлення": "PDU",
        "Комплект": "Kit",
        "клавіатура": "keyboard",
        "миша": "mouse",
        "бездротові": "wireless",
        "бездротова": "wireless",
        "Клавіатура": "Keyboard",
        "Миша": "Mouse",
        "механічна": "mechanical",
        "Вебкамера": "Webcam",
        "Принтер": "Printer",
        "списаний": "written off",
        "МФУ": "MFP",
        "лазерне": "laser",
        "Сканер": "Scanner",
        "арк": "pages",
        "Термопаста": "Thermal Paste",
        "Ізопропіловий спирт": "Isopropyl alcohol",
        "для чищення": "for cleaning",
        "Кабель": "Cable",
        "бухта": "spool",
        "позолочений роз'єм": "gold-plated connector",
        "хаб": "hub",
        "розгалужувач": "splitter",
        "монітори від": "monitors from",
        "Набір викруток": "Screwdriver set",
        "насадки": "bits",
        "Тестер кабелів": "Cable tester",
        "Кримпер": "Crimper",
        "з набором роз'ємів": "with connector set",
        "Ліхтар налобний": "Headlamp",
        "для серверної": "for server room",
        "Сервер": "Server",
        "розеток": "sockets"
    };

    let translated = name;
    for (const [ukr, eng] of Object.entries(dictionary)) {
        // Use regex with word boundaries where possible, or just replace all instances ignoring case
        const regex = new RegExp(ukr, 'gi');
        translated = translated.replace(regex, (match) => {
            // preserve casing if first letter is uppercase
            if (match[0] === match[0].toUpperCase()) {
                return eng.charAt(0).toUpperCase() + eng.slice(1);
            }
            return eng;
        });
    }

    return translated;
};

export const translateUnit = (unit: string, language: string): string => {
    if (language !== 'en') return unit;
    const units: Record<string, string> = {
        "шт": "pcs",
        "бухта": "spool",
        "кг": "kg",
        "м": "m"
    };
    return units[unit] || unit;
};
