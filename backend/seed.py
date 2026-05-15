"""
MongoDB seed script for IT-WMS
Run from the backend/ directory:
    python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from datetime import datetime
from auth_utils import get_password_hash
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "user_Diplom")

print(f"Підключення до: {MONGO_URL[:50]}...")
client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=10000)
db     = client[DB_NAME]

# ── Очищення ────────────────────────────────────────────────────────────────
for col in ["users", "persons", "suppliers", "mtak",
            "transactions", "documents", "procurement_orders"]:
    db[col].drop()
    print(f"  Очищено {col}")

# ═══════════════════════════════════════════════════════════════════════════
# 1. USERS
# ═══════════════════════════════════════════════════════════════════════════
mgr_pwd    = get_password_hash("Manager123!")
worker_pwd = get_password_hash("Worker123!")

users_data = [
    {"Логін": "manager@itwms.ua",  "Пароль": mgr_pwd,    "Роль": "Менеджер",  "firstname": "Юрій",    "lastname": "Гончар"},
    {"Логін": "manager2@itwms.ua", "Пароль": mgr_pwd,    "Роль": "Менеджер",  "firstname": "Ірина",   "lastname": "Коваленко"},
    {"Логін": "worker@itwms.ua",   "Пароль": worker_pwd, "Роль": "Працівник", "firstname": "Василь",  "lastname": "Василенко"},
    {"Логін": "worker2@itwms.ua",  "Пароль": worker_pwd, "Роль": "Працівник", "firstname": "Оксана",  "lastname": "Петренко"},
]
uid = db.users.insert_many(users_data).inserted_ids
db.users.create_index([("Логін", ASCENDING)], unique=True)
print(f"[OK] users: {db.users.count_documents({})}")

# ═══════════════════════════════════════════════════════════════════════════
# 2. PERSONS
# ═══════════════════════════════════════════════════════════════════════════
persons_data = [
    {"ID_Користувача": uid[0], "FIO": "Гончар Юрій Сергійович",       "Електронна пошта": "manager@itwms.ua",  "Опис": "Головний менеджер складу", "Дата початку": "2023-01-15", "Дата закінчення": None, "Робота": "Менеджер складу"},
    {"ID_Користувача": uid[1], "FIO": "Коваленко Ірина Олексіївна",   "Електронна пошта": "manager2@itwms.ua", "Опис": "Заступник менеджера",      "Дата початку": "2022-11-20", "Дата закінчення": None, "Робота": "Заступник менеджера"},
    {"ID_Користувача": uid[2], "FIO": "Василенко Василь Іванович",    "Електронна пошта": "worker@itwms.ua",   "Опис": "Складський комірник",      "Дата початку": "2023-03-01", "Дата закінчення": None, "Робота": "Комірник"},
    {"ID_Користувача": uid[3], "FIO": "Петренко Оксана Михайлівна",   "Електронна пошта": "worker2@itwms.ua",  "Опис": "Оператор складу",          "Дата початку": "2023-05-10", "Дата закінчення": None, "Робота": "Оператор складу"},
]
db.persons.insert_many(persons_data)
db.persons.create_index([("ID_Користувача", ASCENDING)])
print(f"[OK] persons: {db.persons.count_documents({})}")

# ═══════════════════════════════════════════════════════════════════════════
# 3. SUPPLIERS
# ═══════════════════════════════════════════════════════════════════════════
suppliers_data = [
    {
        "Ім'я":             "ТОВ «Технопостач»",
        "edrpou":           "12345678",
        "Адреса":           "м. Київ, вул. Промислова, 14",
        "IBAN":             "UA213223130000026007233566001",
        "Контактна особа":  "Мельник Андрій Петрович",
        "Електронна пошта": "supply@technopach.ua",
        "Телеграма":        "@technopach_ua",
        "Телефон":          "+380441234567",
    },
    {
        "Ім'я":             "ПП «Електросклад»",
        "edrpou":           "87654321",
        "Адреса":           "м. Харків, пр. Науки, 7",
        "IBAN":             "UA893052990000026001054925420",
        "Контактна особа":  "Бондаренко Сергій Олегович",
        "Електронна пошта": "info@electrosklad.ua",
        "Телеграма":        "@electrosklad",
        "Телефон":          "+380577654321",
    },
    {
        "Ім'я":             "АТ «УкрМатеріал»",
        "edrpou":           "56781234",
        "Адреса":           "м. Дніпро, вул. Заводська, 33",
        "IBAN":             "UA763005440000026804100547522",
        "Контактна особа":  "Сидоренко Наталія Вікторівна",
        "Електронна пошта": "n.sydorenko@ukrmaterial.com",
        "Телеграма":        "@ukrmaterial",
        "Телефон":          "+380562345678",
    },
    {
        "Ім'я":             "ТОВ «ІТ-Логістик»",
        "edrpou":           "34567812",
        "Адреса":           "м. Львів, вул. Городоцька, 52",
        "IBAN":             "UA603348510000000026001053217",
        "Контактна особа":  "Франків Олег Романович",
        "Електронна пошта": "order@itlogistic.ua",
        "Телеграма":        "@itlogistic_ua",
        "Телефон":          "+380322345678",
    },
    {
        "Ім'я":             "ФОП Кравченко М.В.",
        "edrpou":           "2345678901",
        "Адреса":           "м. Одеса, вул. Дерибасівська, 10",
        "IBAN":             "UA953257960000026005055243210",
        "Контактна особа":  "Кравченко Максим Васильович",
        "Електронна пошта": "kravchenko.it@gmail.com",
        "Телеграма":        "@maks_it_supply",
        "Телефон":          "+380487654321",
    },
]
sid = db.suppliers.insert_many(suppliers_data).inserted_ids
print(f"[OK] suppliers: {db.suppliers.count_documents({})}")

# ═══════════════════════════════════════════════════════════════════════════
# 4. MTAK (Матеріально-технічні активи та комплектуючі)
# ═══════════════════════════════════════════════════════════════════════════
def item(sku, name, cat, typ, stock, min_s, unit, price, sup_idx,
         status="available", received="2024-01-15", delivered="2024-01-13",
         expiry=None, issued_date=None, writeoff_date=None,
         issued_by=None, issued_to=None, written_off_by=None,
         writeoff_reason=None):
    return {
        "ID_м_кл":                     sku,
        "назва":                       name,
        "категорія":                   cat,
        "тип":                         typ,
        "кількість":                   float(stock),
        "min_stock":                   float(min_s),
        "одиниця":                     unit,
        "ціна":                        float(price),
        "tax_rate":                    0.20,
        "ID_Постачальника":            sid[sup_idx],
        "статус":                      status,
        "дата_отримання":              received,
        "термін_придатності":          expiry,
        "дата_постачання":             delivered,
        "дата_видачі":                 issued_date,
        "дата_виконання_списання":     writeoff_date,
        "ID_хто_видав":                issued_by,
        "ID_кому_видає":               issued_to,
        "ID_хто_списав":               written_off_by,
        "received_by":                 None,
        "writeoff_reason":             writeoff_reason,
        "ідентифікатор_постачальника": "",
    }

mtak_data = [
    # ── CPU ──────────────────────────────────────────────────────────────────
    item("CPU-I7-13700",     "Процесор Intel Core i7-13700 (16 ядер, 5.2 GHz)",    "cpu", "Активний компонент", 15, 5,  "шт", 12500, 0, received="2024-01-15", delivered="2024-01-13"),
    item("CPU-AMD-7600X",    "Процесор AMD Ryzen 5 7600X (6 ядер, 5.3 GHz)",       "cpu", "Активний компонент",  8, 3,  "шт",  9800, 0, received="2024-02-05", delivered="2024-02-03"),
    item("CPU-I5-13600K",    "Процесор Intel Core i5-13600K (14 ядер, 5.1 GHz)",   "cpu", "Активний компонент", 10, 4,  "шт",  8900, 1, received="2024-03-10", delivered="2024-03-08"),
    item("CPU-AMD-5600",     "Процесор AMD Ryzen 5 5600 (6 ядер, 4.4 GHz)",        "cpu", "Активний компонент",  5, 2,  "шт",  5200, 0, received="2024-01-25", delivered="2024-01-23"),

    # ── RAM ──────────────────────────────────────────────────────────────────
    item("RAM-KVR56-16G",    "Оперативна пам'ять Kingston 16GB DDR5 5600",          "ram", "Активний компонент", 40, 15, "шт",  3200, 0, received="2024-01-20", delivered="2024-01-18"),
    item("RAM-CRU-32G-DDR4", "Оперативна пам'ять Crucial 32GB DDR4 3200",           "ram", "Активний компонент", 20, 8,  "шт",  4100, 1, received="2024-02-12", delivered="2024-02-10"),
    item("RAM-SAM-16G-DDR4", "Оперативна пам'ять Samsung 16GB DDR4 3200",           "ram", "Активний компонент", 25, 10, "шт",  2400, 0, received="2024-03-05", delivered="2024-03-03"),
    item("RAM-CRU-8G-DDR5",  "Оперативна пам'ять Crucial 8GB DDR5 4800",            "ram", "Активний компонент", 30, 10, "шт",  1900, 1, received="2024-04-01", delivered="2024-03-30"),

    # ── Storage ───────────────────────────────────────────────────────────────
    item("SSD-SAM-870-1T",   "SSD Samsung 870 EVO 1TB SATA",                        "storage", "Пасивний компонент", 22, 10, "шт", 2850, 1, received="2024-02-01", delivered="2024-01-30"),
    item("SSD-SAM-980-500",  "SSD Samsung 980 Pro 500GB NVMe PCIe 4.0",             "storage", "Пасивний компонент", 15, 5,  "шт", 2200, 1, received="2024-02-20", delivered="2024-02-18"),
    item("SSD-KIN-A2000-1T", "SSD Kingston A2000 1TB NVMe PCIe 3.0",               "storage", "Пасивний компонент", 12, 5,  "шт", 2100, 0, received="2024-03-15", delivered="2024-03-13"),
    item("HDD-SEA-IW-4T",    "HDD Seagate IronWolf 4TB NAS",                        "storage", "Пасивний компонент", 10, 4,  "шт", 3600, 2, received="2024-03-01", delivered="2024-02-28"),
    item("HDD-WD-BLUE-2T",   "HDD Western Digital Blue 2TB 7200 RPM",               "storage", "Пасивний компонент", 18, 6,  "шт", 2100, 0, received="2024-04-10", delivered="2024-04-08"),

    # ── Display ───────────────────────────────────────────────────────────────
    item("MON-DELL-P2422H",  "Монітор Dell P2422H 24\" FHD IPS 60Hz",              "display", "Обладнання",  8, 3, "шт",  9400, 0, received="2024-02-10", delivered="2024-02-08"),
    item("MON-LG-27UK850",   "Монітор LG 27UK850 27\" 4K IPS USB-C",               "display", "Обладнання",  5, 2, "шт", 18500, 1, received="2024-03-20", delivered="2024-03-18"),
    item("MON-AOC-Q27P2",    "Монітор AOC Q27P2 27\" QHD IPS 75Hz",                "display", "Обладнання",  6, 2, "шт", 11200, 0, received="2024-04-15", delivered="2024-04-13"),
    item("MON-SAM-OLD",      "Монітор Samsung S24E450 24\" (пошкоджений)",          "display", "Обладнання",  1, 0, "шт",  5600, 0,
         status="damaged", received="2022-06-01", delivered="2022-05-30",
         issued_date="2022-06-10", issued_by=uid[1], issued_to=str(uid[3])),

    # ── Networking ────────────────────────────────────────────────────────────
    item("NET-TPLINK-SG1024","Комутатор TP-Link TL-SG1024D 24-port Gigabit",       "networking", "Обладнання",  4, 2, "шт",  3600, 2, received="2024-02-15", delivered="2024-02-13"),
    item("NET-MIKROTIK-HEX", "Маршрутизатор MikroTik RB750Gr3 hEX 5-port",         "networking", "Обладнання",  5, 2, "шт",  3100, 1, received="2024-04-01", delivered="2024-03-30"),
    item("NET-CISCO-SG110",  "Комутатор Cisco SG110-16 16-port Gigabit",            "networking", "Обладнання",  3, 1, "шт",  5800, 3, received="2024-03-25", delivered="2024-03-23"),
    item("NET-UBNT-AP-LR",   "Точка доступу Ubiquiti UniFi AP-LR (довга дальність)","networking", "Обладнання",  6, 3, "шт",  4200, 3, received="2024-04-20", delivered="2024-04-18"),
    item("NET-TPLINK-PATCH", "Патч-панель TP-Link TL-PB24 24-port Cat6",            "networking", "Обладнання",  4, 2, "шт",  1600, 2, received="2024-03-10", delivered="2024-03-08"),

    # ── Laptop ───────────────────────────────────────────────────────────────
    item("LAP-LEN-E15-I5",   "Ноутбук Lenovo ThinkPad E15 Gen 4 i5-1235U 16GB",    "laptop", "Обладнання", 10, 5, "шт", 35000, 0,
         status="issued", received="2024-01-10", delivered="2024-01-08",
         issued_date="2024-03-01", issued_by=uid[0], issued_to=str(uid[2])),
    item("LAP-HP-PROBOOK",   "Ноутбук HP ProBook 450 G9 i5-1235U 8GB 256GB",        "laptop", "Обладнання",  7, 3, "шт", 28000, 1, received="2024-02-25", delivered="2024-02-23"),
    item("LAP-DELL-LAT5530", "Ноутбук Dell Latitude 5530 i7-1265U 16GB 512GB",      "laptop", "Обладнання",  4, 2, "шт", 42000, 0, received="2024-03-30", delivered="2024-03-28"),
    item("LAP-ASUS-P1511",   "Ноутбук ASUS ExpertBook P1511 i3-1115G4 8GB",         "laptop", "Обладнання",  6, 3, "шт", 22000, 4, received="2024-04-05", delivered="2024-04-03"),

    # ── Power ────────────────────────────────────────────────────────────────
    item("UPS-APC-BX650",    "ДБЖ APC Back-UPS BX650LI-GR 650VA/360W",             "power", "Обладнання",  6, 2, "шт",  4200, 1, received="2024-03-05", delivered="2024-03-03"),
    item("UPS-EATO-5E1100",  "ДБЖ Eaton 5E 1100VA/660W USB",                        "power", "Обладнання",  4, 2, "шт",  5800, 2, received="2024-04-12", delivered="2024-04-10"),
    item("PDU-APC-AP7920",   "Блок розподілу живлення APC AP7920 8-розеток",         "power", "Обладнання",  3, 1, "шт",  8900, 3, received="2024-03-18", delivered="2024-03-16"),

    # ── Peripherals ───────────────────────────────────────────────────────────
    item("KBD-LOG-MK470",    "Комплект Logitech MK470 клавіатура+миша бездротові",  "peripheral", "Обладнання", 20, 8, "шт",  1850, 0, received="2024-04-05", delivered="2024-04-03"),
    item("KBD-CHERRY-G80",   "Клавіатура Cherry G80-3000 механічна USB",             "peripheral", "Обладнання", 10, 4, "шт",  2900, 3, received="2024-03-22", delivered="2024-03-20"),
    item("MOUSE-LOG-M705",   "Миша Logitech M705 Marathon бездротова",               "peripheral", "Обладнання", 15, 5, "шт",   850, 0, received="2024-04-08", delivered="2024-04-06"),
    item("WEB-LOG-C920",     "Вебкамера Logitech C920 HD Pro 1080p",                 "peripheral", "Обладнання",  8, 3, "шт",  3400, 1, received="2024-03-28", delivered="2024-03-26"),
    item("PRN-HP-M404N",     "Принтер HP LaserJet Pro M404n (списаний)",             "peripheral", "Обладнання",  0, 1, "шт",  8900, 2,
         status="written_off", received="2023-05-10", delivered="2023-05-08",
         issued_date="2023-05-15", writeoff_date="2024-02-20",
         issued_by=uid[0], issued_to=str(uid[2]), written_off_by=uid[0],
         writeoff_reason="Фізичний знос, нерентабельний ремонт"),
    item("PRN-HP-M428FDW",   "МФУ HP LaserJet Pro MFP M428fdw A4 лазерне",          "peripheral", "Обладнання",  2, 1, "шт", 14500, 1, received="2024-04-25", delivered="2024-04-23"),
    item("SCAN-EPSON-DS530", "Сканер Epson WorkForce DS-530 ADF 50арк",              "peripheral", "Обладнання",  2, 1, "шт",  9800, 3, received="2024-04-18", delivered="2024-04-16"),

    # ── Accessories & Cables ──────────────────────────────────────────────────
    item("ACC-ARCTIC-3G",    "Термопаста Arctic Silver 5 (3.5г)",                    "accessory", "Витратний матеріал", 12, 5, "шт",    180, 2,
         received="2024-04-10", delivered="2024-04-08", expiry="2027-04-10"),
    item("ACC-ISOPROP-500",  "Ізопропіловий спирт 99.9% 500мл (для чищення)",        "accessory", "Витратний матеріал",  8, 4, "шт",    290, 2,
         received="2024-03-15", delivered="2024-03-13", expiry="2026-03-15"),
    item("CAB-UTP-CAT6-305", "Кабель UTP Cat6 Panduit (305м, бухта)",                "cable",     "Витратний матеріал",  8, 3, "бухта", 3800, 2, received="2024-03-15", delivered="2024-03-13"),
    item("CAB-HDMI-3M",      "Кабель HDMI 2.0 3м (4K 60Hz, позолочений роз'єм)",    "cable",     "Витратний матеріал", 30, 10, "шт",    350, 4, received="2024-02-28", delivered="2024-02-26"),
    item("CAB-USB-C-1M",     "Кабель USB-C 1м (100W PD, 10Gbps)",                   "cable",     "Витратний матеріал", 25, 8,  "шт",    280, 4, received="2024-03-05", delivered="2024-03-03"),
    item("ACC-UGREEN-CM179", "USB-C хаб Ugreen 7-in-1 CM179 (HDMI/USB/SD)",         "accessory", "Обладнання",          15, 5, "шт",    890, 1, received="2024-04-12", delivered="2024-04-10"),
    item("ACC-HDMI-SPLITTER","HDMI-розгалужувач 1x4 4K (4 монітори від 1 ПК)",      "accessory", "Обладнання",           5, 2, "шт",   1200, 0, received="2024-04-22", delivered="2024-04-20"),

    # ── Tools ─────────────────────────────────────────────────────────────────
    item("TOOL-IFIX-PROTECH","Набір викруток iFixit Pro Tech Toolkit (64 насадки)",  "tool", "Інструмент",  3, 1, "шт",  2400, 2, received="2024-03-20", delivered="2024-03-18"),
    item("TOOL-FLUKE-MS2",   "Тестер кабелів Fluke MicroScanner2 (LAN/телефон)",    "tool", "Інструмент",  2, 1, "шт", 14500, 3, received="2024-02-18", delivered="2024-02-16"),
    item("TOOL-CRIMPER-RJ45","Кримпер RJ45 Cat5/Cat6 з набором роз'ємів (100 шт)",  "tool", "Інструмент",  4, 2, "шт",    680, 4, received="2024-03-25", delivered="2024-03-23"),
    item("TOOL-TORCH-LED",   "Ліхтар налобний LED 500 люмен (для серверної)",        "tool", "Інструмент",  5, 2, "шт",    420, 4, received="2024-04-02", delivered="2024-03-31"),

    # ── Server Components ─────────────────────────────────────────────────────
    item("SRV-DELL-R340",    "Сервер Dell PowerEdge R340 Xeon E-2236 16GB 2x480SSD","server", "Обладнання",  2, 1, "шт", 98000, 3, received="2024-01-30", delivered="2024-01-28"),
    item("SRV-RAM-32G-ECC",  "Оперативна пам'ять ECC Kingston 32GB DDR4 2933",      "server", "Активний компонент", 8, 4, "шт", 8900, 0, received="2024-02-08", delivered="2024-02-06"),
    item("SRV-HDD-4T-SAS",   "HDD Seagate Exos 4TB SAS 12Gbps 7200 RPM",           "server", "Пасивний компонент", 6, 2, "шт", 5600, 1, received="2024-03-12", delivered="2024-03-10"),
]

iid = db.mtak.insert_many(mtak_data).inserted_ids
db.mtak.create_index([("ID_м_кл", ASCENDING)], unique=True)
db.mtak.create_index([("статус",  ASCENDING)])
db.mtak.create_index([("категорія", ASCENDING)])
print(f"[OK] mtak: {db.mtak.count_documents({})}")

# ═══════════════════════════════════════════════════════════════════════════
# 5. TRANSACTIONS
# ═══════════════════════════════════════════════════════════════════════════
# Shortcut: item indexes
CPU_I7=0; CPU_AMD=1; CPU_I5=2; CPU_AMD56=3
RAM_KVR=4; RAM_CRU32=5; RAM_SAM=6; RAM_CRU8=7
SSD_SAM=8; SSD_SAM980=9; SSD_KIN=10; HDD_SEA=11; HDD_WD=12
MON_DELL=13; MON_LG=14; MON_AOC=15; MON_OLD=16
NET_TPLINK=17; NET_MK=18; NET_CISCO=19; NET_UBNT=20; NET_PATCH=21
LAP_LEN=22; LAP_HP=23; LAP_DELL=24; LAP_ASUS=25
UPS_APC=26; UPS_EATO=27; PDU=28
KBD=29; KBD_CH=30; MOUSE=31; WEB=32; PRN_OLD=33; PRN_MFP=34; SCAN=35
ACC_THERM=36; ACC_ISO=37; CAB_UTP=38; CAB_HDMI=39; CAB_USBC=40; ACC_HUB=41; ACC_HDMI_SP=42
TOOL_IFIX=43; TOOL_FLUKE=44; TOOL_CRIMP=45; TOOL_TORCH=46
SRV=47; SRV_RAM=48; SRV_HDD=49

transactions_data = [
    # ── Прихід (in) ───────────────────────────────────────────────────────────
    {"type": "in", "item_id": iid[CPU_I7],    "quantity": 15, "date": "2024-01-15T09:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — процесори Intel i7-13700"},
    {"type": "in", "item_id": iid[RAM_KVR],   "quantity": 40, "date": "2024-01-20T10:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — RAM Kingston DDR5"},
    {"type": "in", "item_id": iid[LAP_LEN],   "quantity": 10, "date": "2024-01-10T09:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — ноутбуки Lenovo ThinkPad"},
    {"type": "in", "item_id": iid[SRV],       "quantity":  2, "date": "2024-01-30T11:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — сервери Dell PowerEdge R340"},
    {"type": "in", "item_id": iid[SRV_RAM],   "quantity":  8, "date": "2024-02-08T10:30:00", "user_id": uid[3], "document_id": None, "notes": "Прихід — серверна ECC RAM Kingston"},
    {"type": "in", "item_id": iid[SSD_SAM],   "quantity": 22, "date": "2024-02-01T11:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — SSD Samsung 870 EVO 1TB"},
    {"type": "in", "item_id": iid[MON_DELL],  "quantity":  8, "date": "2024-02-10T14:00:00", "user_id": uid[3], "document_id": None, "notes": "Прихід — монітори Dell P2422H"},
    {"type": "in", "item_id": iid[LAP_HP],    "quantity":  7, "date": "2024-02-25T09:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — ноутбуки HP ProBook 450"},
    {"type": "in", "item_id": iid[HDD_SEA],   "quantity": 10, "date": "2024-03-01T10:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — HDD Seagate IronWolf 4TB NAS"},
    {"type": "in", "item_id": iid[UPS_APC],   "quantity":  6, "date": "2024-03-05T11:00:00", "user_id": uid[3], "document_id": None, "notes": "Прихід — ДБЖ APC Back-UPS 650VA"},
    {"type": "in", "item_id": iid[KBD],       "quantity": 20, "date": "2024-04-05T10:00:00", "user_id": uid[3], "document_id": None, "notes": "Прихід — комплекти Logitech MK470"},
    {"type": "in", "item_id": iid[CAB_HDMI],  "quantity": 30, "date": "2024-02-28T10:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — кабелі HDMI 2.0 3м"},
    {"type": "in", "item_id": iid[CAB_USBC],  "quantity": 25, "date": "2024-03-05T11:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — кабелі USB-C 100W"},
    {"type": "in", "item_id": iid[ACC_HUB],   "quantity": 15, "date": "2024-04-12T10:00:00", "user_id": uid[3], "document_id": None, "notes": "Прихід — USB-C хаби Ugreen 7-in-1"},
    {"type": "in", "item_id": iid[NET_TPLINK],"quantity":  4, "date": "2024-02-15T09:30:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — комутатори TP-Link 24-port"},
    {"type": "in", "item_id": iid[NET_MK],    "quantity":  5, "date": "2024-04-01T10:00:00", "user_id": uid[3], "document_id": None, "notes": "Прихід — маршрутизатори MikroTik hEX"},
    {"type": "in", "item_id": iid[TOOL_IFIX], "quantity":  3, "date": "2024-03-20T11:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — набори викруток iFixit"},
    {"type": "in", "item_id": iid[CAB_UTP],   "quantity":  8, "date": "2024-03-15T09:00:00", "user_id": uid[2], "document_id": None, "notes": "Прихід — кабель UTP Cat6 305м"},

    # ── Видача (out) ──────────────────────────────────────────────────────────
    {"type": "out", "item_id": iid[LAP_LEN],  "quantity": 2, "date": "2024-03-01T09:30:00", "user_id": uid[0], "document_id": None, "notes": "Видача — ноутбуки для відділу бухгалтерії"},
    {"type": "out", "item_id": iid[PRN_OLD],  "quantity": 1, "date": "2023-05-15T11:00:00", "user_id": uid[0], "document_id": None, "notes": "Видача — принтер до IT-відділу"},
    {"type": "out", "item_id": iid[MON_DELL], "quantity": 2, "date": "2024-03-10T10:00:00", "user_id": uid[1], "document_id": None, "notes": "Видача — монітори для нових робочих місць"},
    {"type": "out", "item_id": iid[KBD],      "quantity": 5, "date": "2024-04-15T09:00:00", "user_id": uid[0], "document_id": None, "notes": "Видача — клавіатури та миші для відділу HR"},
    {"type": "out", "item_id": iid[RAM_KVR],  "quantity": 8, "date": "2024-03-20T11:30:00", "user_id": uid[0], "document_id": None, "notes": "Видача — RAM для апгрейду ПК бухгалтерії"},
    {"type": "out", "item_id": iid[SSD_SAM],  "quantity": 5, "date": "2024-03-25T10:00:00", "user_id": uid[1], "document_id": None, "notes": "Видача — SSD для заміни старих дисків"},
    {"type": "out", "item_id": iid[CAB_HDMI], "quantity": 8, "date": "2024-04-02T14:00:00", "user_id": uid[2], "document_id": None, "notes": "Видача — HDMI кабелі для переговорної кімнати"},
    {"type": "out", "item_id": iid[NET_MK],   "quantity": 1, "date": "2024-04-20T10:30:00", "user_id": uid[0], "document_id": None, "notes": "Видача — маршрутизатор для філіалу"},
    {"type": "out", "item_id": iid[UPS_APC],  "quantity": 2, "date": "2024-04-08T11:00:00", "user_id": uid[1], "document_id": None, "notes": "Видача — ДБЖ до серверної кімнати"},

    # ── Списання (write_off) ──────────────────────────────────────────────────
    {"type": "write_off", "item_id": iid[PRN_OLD],  "quantity": 1, "date": "2024-02-20T14:00:00", "user_id": uid[0], "document_id": None, "notes": "Списання — принтер HP M404n (фізичний знос)"},
    {"type": "write_off", "item_id": iid[MON_OLD],  "quantity": 1, "date": "2024-03-10T15:00:00", "user_id": uid[1], "document_id": None, "notes": "Списання — монітор Samsung (механічне пошкодження)"},

    # ── Повернення (return) ───────────────────────────────────────────────────
    {"type": "return", "item_id": iid[CAB_HDMI], "quantity": 2, "date": "2024-04-10T09:00:00", "user_id": uid[2], "document_id": None, "notes": "Повернення — HDMI кабелі (надлишок після монтажу)"},
    {"type": "return", "item_id": iid[RAM_KVR],  "quantity": 2, "date": "2024-03-28T11:00:00", "user_id": uid[3], "document_id": None, "notes": "Повернення — RAM модулі (ПК не сумісний)"},
]
db.transactions.insert_many(transactions_data)
db.transactions.create_index([("date",    DESCENDING)])
db.transactions.create_index([("item_id", ASCENDING)])
db.transactions.create_index([("type",    ASCENDING)])
print(f"[OK] transactions: {db.transactions.count_documents({})}")

# ═══════════════════════════════════════════════════════════════════════════
# 6. DOCUMENTS
# ═══════════════════════════════════════════════════════════════════════════
documents_data = [
    # Накладні прийому (invoice)
    {
        "type": "invoice", "status": "approved",
        "created_at": "2024-01-15T08:00:00", "created_by": uid[0],
        "items": [
            {"item_id": str(iid[CPU_I7]),  "name": "Процесор Intel Core i7-13700",            "quantity": 15, "unit_price": 12500.0},
            {"item_id": str(iid[RAM_KVR]), "name": "Оперативна пам'ять Kingston 16GB DDR5",   "quantity": 40, "unit_price":  3200.0},
            {"item_id": str(iid[LAP_LEN]), "name": "Ноутбук Lenovo ThinkPad E15 Gen 4 i5",    "quantity": 10, "unit_price": 35000.0},
        ],
        "total_sum": 15*12500 + 40*3200 + 10*35000,
        "total_vat": round((15*12500 + 40*3200 + 10*35000) * 0.20, 2),
        "discrepancies": [],
    },
    {
        "type": "invoice", "status": "approved",
        "created_at": "2024-02-01T09:00:00", "created_by": uid[0],
        "items": [
            {"item_id": str(iid[SSD_SAM]),  "name": "SSD Samsung 870 EVO 1TB",               "quantity": 22, "unit_price":  2850.0},
            {"item_id": str(iid[MON_DELL]), "name": "Монітор Dell P2422H 24\"",               "quantity":  8, "unit_price":  9400.0},
            {"item_id": str(iid[HDD_SEA]),  "name": "HDD Seagate IronWolf 4TB",               "quantity": 10, "unit_price":  3600.0},
        ],
        "total_sum": 22*2850 + 8*9400 + 10*3600,
        "total_vat": round((22*2850 + 8*9400 + 10*3600) * 0.20, 2),
        "discrepancies": [],
    },
    {
        "type": "invoice", "status": "approved",
        "created_at": "2024-03-15T10:00:00", "created_by": uid[1],
        "items": [
            {"item_id": str(iid[NET_TPLINK]),"name": "Комутатор TP-Link TL-SG1024D 24-port", "quantity":  4, "unit_price":  3600.0},
            {"item_id": str(iid[NET_MK]),    "name": "Маршрутизатор MikroTik RB750Gr3 hEX",  "quantity":  5, "unit_price":  3100.0},
            {"item_id": str(iid[NET_UBNT]),  "name": "Точка доступу Ubiquiti UniFi AP-LR",   "quantity":  6, "unit_price":  4200.0},
        ],
        "total_sum": 4*3600 + 5*3100 + 6*4200,
        "total_vat": round((4*3600 + 5*3100 + 6*4200) * 0.20, 2),
        "discrepancies": [],
    },
    {
        "type": "invoice", "status": "pending",
        "created_at": "2024-04-25T09:30:00", "created_by": uid[1],
        "items": [
            {"item_id": str(iid[LAP_DELL]), "name": "Ноутбук Dell Latitude 5530 i7",         "quantity":  4, "unit_price": 42000.0},
            {"item_id": str(iid[MON_LG]),   "name": "Монітор LG 27UK850 27\" 4K",            "quantity":  5, "unit_price": 18500.0},
            {"item_id": str(iid[PRN_MFP]),  "name": "МФУ HP LaserJet Pro MFP M428fdw",       "quantity":  2, "unit_price": 14500.0},
        ],
        "total_sum": 4*42000 + 5*18500 + 2*14500,
        "total_vat": round((4*42000 + 5*18500 + 2*14500) * 0.20, 2),
        "discrepancies": [],
    },

    # Акти списання (act_writeoff)
    {
        "type": "act_writeoff", "status": "approved",
        "created_at": "2024-02-20T14:00:00", "created_by": uid[0],
        "items": [
            {"item_id": str(iid[PRN_OLD]), "name": "Принтер HP LaserJet Pro M404n", "quantity": 1, "unit_price": 8900.0},
        ],
        "total_sum": 8900.0, "total_vat": 1780.0,
        "reason": "Фізичний знос, нерентабельний ремонт", "discrepancies": [],
    },
    {
        "type": "act_writeoff", "status": "pending",
        "created_at": "2024-04-15T10:00:00", "created_by": uid[1],
        "items": [
            {"item_id": str(iid[MON_OLD]), "name": "Монітор Samsung S24E450 (пошкоджений)", "quantity": 1, "unit_price": 5600.0},
        ],
        "total_sum": 5600.0, "total_vat": 1120.0,
        "reason": "Механічне пошкодження матриці", "discrepancies": [],
    },

    # Акт розбіжностей (discrepancy_act)
    {
        "type": "discrepancy_act", "status": "pending",
        "created_at": "2024-04-18T11:30:00", "created_by": uid[1],
        "items": [
            {"item_id": str(iid[HDD_SEA]), "name": "HDD Seagate IronWolf 4TB", "quantity": 1, "unit_price": 3600.0},
        ],
        "total_sum": 3600.0, "total_vat": 720.0,
        "discrepancies": [{"item_id": str(iid[HDD_SEA]), "expected": 10, "actual": 9, "diff": -1}],
    },

    # Акти видачі (issuance)
    {
        "type": "issuance", "status": "approved",
        "created_at": "2024-03-01T09:00:00", "created_by": uid[0],
        "items": [
            {"item_id": str(iid[LAP_LEN]), "name": "Ноутбук Lenovo ThinkPad E15 Gen 4", "quantity": 2, "unit_price": 35000.0},
        ],
        "total_sum": 70000.0, "total_vat": 14000.0,
        "recipient": "Відділ бухгалтерії", "discrepancies": [],
    },
    {
        "type": "issuance", "status": "approved",
        "created_at": "2024-04-15T09:00:00", "created_by": uid[0],
        "items": [
            {"item_id": str(iid[KBD]),      "name": "Комплект Logitech MK470", "quantity": 5, "unit_price": 1850.0},
            {"item_id": str(iid[MON_DELL]), "name": "Монітор Dell P2422H 24\"","quantity": 2, "unit_price": 9400.0},
        ],
        "total_sum": 5*1850 + 2*9400, "total_vat": round((5*1850 + 2*9400)*0.20, 2),
        "recipient": "Відділ HR", "discrepancies": [],
    },
]
db.documents.insert_many(documents_data)
db.documents.create_index([("created_at", DESCENDING)])
db.documents.create_index([("status",     ASCENDING)])
db.documents.create_index([("type",       ASCENDING)])
print(f"[OK] documents: {db.documents.count_documents({})}")

# ═══════════════════════════════════════════════════════════════════════════
# 7. PROCUREMENT ORDERS
# ═══════════════════════════════════════════════════════════════════════════
procurement_data = [
    {
        "item_id":       iid[RAM_KVR],
        "supplier_id":   sid[0],
        "item_name":     "Оперативна пам'ять Kingston 16GB DDR5 5600",
        "supplier_name": "ТОВ «Технопостач»",
        "quantity":      20,
        "unit_price":    3200.0,
        "total":         64000.0,
        "status":        "ordered",
        "date":          "2024-05-05T10:00:00",
        "created_by":    uid[0],
    },
    {
        "item_id":       iid[SSD_SAM980],
        "supplier_id":   sid[1],
        "item_name":     "SSD Samsung 980 Pro 500GB NVMe",
        "supplier_name": "ПП «Електросклад»",
        "quantity":      10,
        "unit_price":    2200.0,
        "total":         22000.0,
        "status":        "planned",
        "date":          "2024-05-08T11:00:00",
        "created_by":    uid[1],
    },
    {
        "item_id":       iid[LAP_ASUS],
        "supplier_id":   sid[4],
        "item_name":     "Ноутбук ASUS ExpertBook P1511 i3",
        "supplier_name": "ФОП Кравченко М.В.",
        "quantity":      4,
        "unit_price":    22000.0,
        "total":         88000.0,
        "status":        "received",
        "date":          "2024-04-28T09:00:00",
        "created_by":    uid[0],
    },
    {
        "item_id":       iid[NET_CISCO],
        "supplier_id":   sid[3],
        "item_name":     "Комутатор Cisco SG110-16 16-port",
        "supplier_name": "ТОВ «ІТ-Логістик»",
        "quantity":      3,
        "unit_price":    5800.0,
        "total":         17400.0,
        "status":        "ordered",
        "date":          "2024-05-02T14:00:00",
        "created_by":    uid[1],
    },
    {
        "item_id":       iid[ACC_THERM],
        "supplier_id":   sid[2],
        "item_name":     "Термопаста Arctic Silver 5 (3.5г)",
        "supplier_name": "АТ «УкрМатеріал»",
        "quantity":      20,
        "unit_price":    180.0,
        "total":         3600.0,
        "status":        "planned",
        "date":          "2024-05-10T10:00:00",
        "created_by":    uid[0],
    },
    {
        "item_id":       iid[CAB_UTP],
        "supplier_id":   sid[2],
        "item_name":     "Кабель UTP Cat6 Panduit (305м, бухта)",
        "supplier_name": "АТ «УкрМатеріал»",
        "quantity":      5,
        "unit_price":    3800.0,
        "total":         19000.0,
        "status":        "ordered",
        "date":          "2024-05-06T11:30:00",
        "created_by":    uid[1],
    },
    {
        "item_id":       iid[UPS_EATO],
        "supplier_id":   sid[2],
        "item_name":     "ДБЖ Eaton 5E 1100VA/660W USB",
        "supplier_name": "АТ «УкрМатеріал»",
        "quantity":      3,
        "unit_price":    5800.0,
        "total":         17400.0,
        "status":        "planned",
        "date":          "2024-05-12T09:00:00",
        "created_by":    uid[0],
    },
    {
        "item_id":       iid[SRV_HDD],
        "supplier_id":   sid[1],
        "item_name":     "HDD Seagate Exos 4TB SAS 12Gbps",
        "supplier_name": "ПП «Електросклад»",
        "quantity":      4,
        "unit_price":    5600.0,
        "total":         22400.0,
        "status":        "received",
        "date":          "2024-04-20T10:00:00",
        "created_by":    uid[0],
    },
]
db.procurement_orders.insert_many(procurement_data)
db.procurement_orders.create_index([("date",   DESCENDING)])
db.procurement_orders.create_index([("status", ASCENDING)])
print(f"[OK] procurement_orders: {db.procurement_orders.count_documents({})}")

# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print(f"  Seed завершено — база: {DB_NAME}")
print("="*60)
print(f"  users:               {db.users.count_documents({})}")
print(f"  persons:             {db.persons.count_documents({})}")
print(f"  suppliers:           {db.suppliers.count_documents({})}")
print(f"  mtak (items):        {db.mtak.count_documents({})}")
print(f"  transactions:        {db.transactions.count_documents({})}")
print(f"  documents:           {db.documents.count_documents({})}")
print(f"  procurement_orders:  {db.procurement_orders.count_documents({})}")
print()
print("  Облікові дані:")
print("  Менеджер:  manager@itwms.ua  / Manager123!")
print("  Менеджер2: manager2@itwms.ua / Manager123!")
print("  Працівник: worker@itwms.ua   / Worker123!")
print("  Працівник2: worker2@itwms.ua / Worker123!")
print("="*60)

client.close()
