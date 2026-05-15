// ============================================================
// MongoDB reference seed for IT-WMS (it_wms database)
//
// NOTE: This script uses PLAIN-TEXT passwords — not bcrypt.
//       Use the Python seed instead for real bcrypt hashes:
//
//   cd backend && python seed.py
//
// This file is kept as a schema reference / quick reset tool.
// Run: mongosh "mongodb://localhost:27017/it_wms" db_seed.js
// ============================================================

const db = db.getSiblingDB("it_wms");

// ── Drop existing collections ────────────────────────────────
["users","persons","suppliers","items","transactions","documents"].forEach(c => db[c].drop());

// ============================================================
// 1. USERS
//    Bcrypt hash of "Manager123!" / "Worker123!" must be generated
//    by Python.  Below hashes are PLACEHOLDERS — login will fail
//    unless you run:  cd backend && python seed.py
// ============================================================
const MANAGER_HASH = "$2b$12$REPLACE_WITH_REAL_BCRYPT_HASH_manager";
const WORKER_HASH  = "$2b$12$REPLACE_WITH_REAL_BCRYPT_HASH_worker";

const uids = db.users.insertMany([
  { email:"manager@itwms.ua",  login:"admin_manager",  password:MANAGER_HASH, role:"manager", firstname:"Юрій",   lastname:"Гончар"    },
  { email:"manager2@itwms.ua", login:"manager_iryna",  password:MANAGER_HASH, role:"manager", firstname:"Ірина",  lastname:"Коваленко" },
  { email:"worker@itwms.ua",   login:"worker_vasyl",   password:WORKER_HASH,  role:"worker",  firstname:"Василь", lastname:"Василенко" },
  { email:"worker2@itwms.ua",  login:"worker_oksana",  password:WORKER_HASH,  role:"worker",  firstname:"Оксана", lastname:"Петренко"  },
]).insertedIds;

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ login: 1 }, { unique: true });
print("✓ users: " + db.users.countDocuments());

// ============================================================
// 2. PERSONS
// ============================================================
db.persons.insertMany([
  { user_id:uids[0], fio:"Гончар Юрій Сергійович",       email:"manager@itwms.ua",  description:"Головний менеджер ІТ-складу.", start_date:"2023-01-15", end_date:null, job:"Менеджер складу"     },
  { user_id:uids[1], fio:"Коваленко Ірина Олексіївна",   email:"manager2@itwms.ua", description:"Заступник менеджера.",          start_date:"2022-11-20", end_date:null, job:"Заступник менеджера" },
  { user_id:uids[2], fio:"Василенко Василь Іванович",    email:"worker@itwms.ua",   description:"Складський комірник.",          start_date:"2023-03-01", end_date:null, job:"Комірник"            },
  { user_id:uids[3], fio:"Петренко Оксана Михайлівна",   email:"worker2@itwms.ua",  description:"Оператор складу.",              start_date:"2023-05-10", end_date:null, job:"Оператор складу"     },
]);
db.persons.createIndex({ user_id: 1 });
print("✓ persons: " + db.persons.countDocuments());

// ============================================================
// 3. SUPPLIERS
// ============================================================
const sids = db.suppliers.insertMany([
  {
    name:"ТОВ «Технопостач»",   edrpou:"12345678",
    address:"м. Київ, вул. Промислова, 14",
    iban:"UA213223130000026007233566001",
    contact_person:"Мельник Андрій Петрович",
    email:"supply@technopach.ua", telegram:"@technopach_ua", phone:"+380441234567",
    contact_info:"supply@technopach.ua",
    bank_details:"IBAN UA213223130000026007233566001",
  },
  {
    name:"ПП «Електросклад»",   edrpou:"87654321",
    address:"м. Харків, пр. Науки, 7",
    iban:"UA893052990000026001054925420",
    contact_person:"Бондаренко Сергій Олегович",
    email:"info@electrosklad.ua", telegram:"@electrosklad", phone:"+380577654321",
    contact_info:"info@electrosklad.ua",
    bank_details:"IBAN UA893052990000026001054925420",
  },
  {
    name:"АТ «УкрМатеріал»",    edrpou:"56781234",
    address:"м. Дніпро, вул. Заводська, 33",
    iban:"UA763005440000026804100547522",
    contact_person:"Сидоренко Наталія Вікторівна",
    email:"n.sydorenko@ukrmaterial.com", telegram:"@ukrmaterial", phone:"+380562345678",
    contact_info:"n.sydorenko@ukrmaterial.com",
    bank_details:"IBAN UA763005440000026804100547522",
  },
]).insertedIds;
db.suppliers.createIndex({ edrpou: 1 }, { unique: true });
print("✓ suppliers: " + db.suppliers.countDocuments());

// ============================================================
// 4. ITEMS  (МтаК — warehouse inventory)
// ============================================================
const iids = db.items.insertMany([
  // Processors
  { name:"Процесор Intel Core i7-13700",              sku:"CPU-I7-13700",     category:"cpu",        type:"Активний компонент",   current_stock:15, min_stock:5,  unit:"шт",    unit_price:12500, tax_rate:0.20, supplier_id:sids[0], status:"available",   received_date:"2024-01-15", delivery_date:"2024-01-13", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  { name:"Процесор AMD Ryzen 5 7600X",                sku:"CPU-AMD-7600X",    category:"cpu",        type:"Активний компонент",   current_stock:8,  min_stock:3,  unit:"шт",    unit_price:9800,  tax_rate:0.20, supplier_id:sids[0], status:"available",   received_date:"2024-02-05", delivery_date:"2024-02-03", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  // RAM
  { name:"Оперативна пам'ять Kingston 16GB DDR5",     sku:"RAM-KVR56-16G",    category:"ram",        type:"Активний компонент",   current_stock:40, min_stock:15, unit:"шт",    unit_price:3200,  tax_rate:0.20, supplier_id:sids[0], status:"available",   received_date:"2024-01-20", delivery_date:"2024-01-18", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  { name:"Оперативна пам'ять Crucial 32GB DDR4",      sku:"RAM-CRU-32G-DDR4", category:"ram",        type:"Активний компонент",   current_stock:20, min_stock:8,  unit:"шт",    unit_price:4100,  tax_rate:0.20, supplier_id:sids[1], status:"available",   received_date:"2024-02-12", delivery_date:"2024-02-10", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  // Storage
  { name:"SSD Samsung 870 EVO 1TB SATA",              sku:"SSD-SAM-870-1T",   category:"storage",    type:"Пасивний компонент",   current_stock:22, min_stock:10, unit:"шт",    unit_price:2850,  tax_rate:0.20, supplier_id:sids[1], status:"available",   received_date:"2024-02-01", delivery_date:"2024-01-30", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  { name:"HDD Seagate IronWolf 4TB NAS",              sku:"HDD-SEA-IW-4T",    category:"storage",    type:"Пасивний компонент",   current_stock:10, min_stock:4,  unit:"шт",    unit_price:3600,  tax_rate:0.20, supplier_id:sids[2], status:"available",   received_date:"2024-03-01", delivery_date:"2024-02-28", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  // Display
  { name:"Монітор Dell P2422H 24\" FHD IPS",          sku:"MON-DELL-P2422H",  category:"display",    type:"Обладнання",           current_stock:8,  min_stock:3,  unit:"шт",    unit_price:9400,  tax_rate:0.20, supplier_id:sids[0], status:"available",   received_date:"2024-02-10", delivery_date:"2024-02-08", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  { name:"Монітор Samsung S24E450 24\" (пошкоджений)",sku:"MON-SAM-S24E-OLD", category:"display",    type:"Обладнання",           current_stock:1,  min_stock:0,  unit:"шт",    unit_price:5600,  tax_rate:0.20, supplier_id:sids[0], status:"damaged",     received_date:"2022-06-01", delivery_date:"2022-05-30", expiry_date:null, issued_date:"2022-06-10", writeoff_date:null, issued_by:uids[1], issued_to:uids[3], written_off_by:null },
  // Networking
  { name:"Комутатор TP-Link TL-SG1024D 24-port",      sku:"NET-TPLINK-SG1024",category:"networking", type:"Обладнання",           current_stock:4,  min_stock:2,  unit:"шт",    unit_price:3600,  tax_rate:0.20, supplier_id:sids[2], status:"available",   received_date:"2024-02-15", delivery_date:"2024-02-13", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  { name:"Маршрутизатор MikroTik RB750Gr3 hEX",       sku:"NET-MIKROTIK-RB750",category:"networking",type:"Обладнання",           current_stock:5,  min_stock:2,  unit:"шт",    unit_price:3100,  tax_rate:0.20, supplier_id:sids[1], status:"available",   received_date:"2024-04-01", delivery_date:"2024-03-30", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  // Laptop
  { name:"Ноутбук Lenovo ThinkPad E15 Gen 4 i5",      sku:"LAP-LEN-E15-I5",   category:"laptop",     type:"Обладнання",           current_stock:10, min_stock:5,  unit:"шт",    unit_price:35000, tax_rate:0.20, supplier_id:sids[0], status:"issued",      received_date:"2024-01-10", delivery_date:"2024-01-08", expiry_date:null, issued_date:"2024-03-01", writeoff_date:null, issued_by:uids[0], issued_to:uids[2], written_off_by:null },
  // Power
  { name:"ДБЖ APC Back-UPS BX650LI-GR 650VA",         sku:"UPS-APC-BX650",    category:"power",      type:"Обладнання",           current_stock:6,  min_stock:2,  unit:"шт",    unit_price:4200,  tax_rate:0.20, supplier_id:sids[1], status:"available",   received_date:"2024-03-05", delivery_date:"2024-03-03", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  // Peripherals
  { name:"Комплект клавіатура+миша Logitech MK470",   sku:"KBD-LOG-MK470",    category:"peripheral", type:"Обладнання",           current_stock:20, min_stock:8,  unit:"шт",    unit_price:1850,  tax_rate:0.20, supplier_id:sids[0], status:"available",   received_date:"2024-04-05", delivery_date:"2024-04-03", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  { name:"Принтер HP LaserJet Pro M404n (списаний)",  sku:"PRN-HP-M404N",     category:"peripheral", type:"Обладнання",           current_stock:0,  min_stock:1,  unit:"шт",    unit_price:8900,  tax_rate:0.20, supplier_id:sids[2], status:"written_off", received_date:"2023-05-10", delivery_date:"2023-05-08", expiry_date:null, issued_date:"2023-05-15", writeoff_date:"2024-02-20", issued_by:uids[0], issued_to:uids[2], written_off_by:uids[0] },
  // Accessories
  { name:"Термопаста Arctic Silver 5 (3.5г)",          sku:"ACC-ARCTIC-3G",    category:"accessory",  type:"Витратний матеріал",   current_stock:12, min_stock:5,  unit:"шт",    unit_price:180,   tax_rate:0.20, supplier_id:sids[2], status:"available",   received_date:"2024-04-10", delivery_date:"2024-04-08", expiry_date:"2027-04-10", issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  { name:"Кабель UTP Cat6 Panduit (305м, бухта)",      sku:"CAB-UTP-CAT6-305", category:"cable",      type:"Витратний матеріал",   current_stock:8,  min_stock:3,  unit:"бухта", unit_price:3800,  tax_rate:0.20, supplier_id:sids[2], status:"available",   received_date:"2024-03-15", delivery_date:"2024-03-13", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  { name:"USB-C хаб Ugreen 7-in-1 CM179",              sku:"ACC-UGREEN-CM179", category:"accessory",  type:"Обладнання",           current_stock:15, min_stock:5,  unit:"шт",    unit_price:890,   tax_rate:0.20, supplier_id:sids[1], status:"available",   received_date:"2024-04-12", delivery_date:"2024-04-10", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
  // Tools
  { name:"Набір викруток iFixit Pro Tech Toolkit",     sku:"TOOL-IFIX-PROTECH",category:"tool",       type:"Інструмент",           current_stock:3,  min_stock:1,  unit:"шт",    unit_price:2400,  tax_rate:0.20, supplier_id:sids[2], status:"available",   received_date:"2024-03-20", delivery_date:"2024-03-18", expiry_date:null, issued_date:null, writeoff_date:null, issued_by:null, issued_to:null, written_off_by:null },
]).insertedIds;

db.items.createIndex({ sku: 1 },         { unique: true });
db.items.createIndex({ status: 1 });
db.items.createIndex({ category: 1 });
db.items.createIndex({ supplier_id: 1 });
print("✓ items: " + db.items.countDocuments());

// ============================================================
// 5. TRANSACTIONS
// ============================================================
db.transactions.insertMany([
  { type:"in",        item_id:iids[0],  quantity:15, date:"2024-01-15T09:00:00", user_id:uids[2], document_id:null },
  { type:"in",        item_id:iids[2],  quantity:40, date:"2024-01-20T10:00:00", user_id:uids[2], document_id:null },
  { type:"in",        item_id:iids[4],  quantity:22, date:"2024-02-01T11:00:00", user_id:uids[2], document_id:null },
  { type:"in",        item_id:iids[6],  quantity:8,  date:"2024-02-10T14:00:00", user_id:uids[3], document_id:null },
  { type:"in",        item_id:iids[10], quantity:10, date:"2024-01-10T09:00:00", user_id:uids[2], document_id:null },
  { type:"in",        item_id:iids[12], quantity:20, date:"2024-04-05T10:00:00", user_id:uids[3], document_id:null },
  { type:"out",       item_id:iids[10], quantity:2,  date:"2024-03-01T09:30:00", user_id:uids[0], document_id:null },
  { type:"out",       item_id:iids[13], quantity:1,  date:"2023-05-15T11:00:00", user_id:uids[0], document_id:null },
  { type:"write_off", item_id:iids[13], quantity:1,  date:"2024-02-20T14:00:00", user_id:uids[0], document_id:null },
  { type:"write_off", item_id:iids[7],  quantity:0,  date:"2024-03-10T15:00:00", user_id:uids[1], document_id:null },
]);
db.transactions.createIndex({ date: -1 });
db.transactions.createIndex({ item_id: 1 });
db.transactions.createIndex({ type: 1 });
print("✓ transactions: " + db.transactions.countDocuments());

// ============================================================
// 6. DOCUMENTS
// ============================================================
db.documents.insertMany([
  {
    type:"invoice", status:"approved", created_at:"2024-01-15T08:00:00", created_by:uids[0],
    items:[
      { item_id:iids[0].toString(),  name:"Процесор Intel Core i7-13700",          quantity:15, unit_price:12500 },
      { item_id:iids[2].toString(),  name:"Оперативна пам'ять Kingston 16GB DDR5", quantity:40, unit_price:3200  },
    ],
    total_sum: 15*12500 + 40*3200,
    total_vat: (15*12500 + 40*3200) * 0.20,
  },
  {
    type:"invoice", status:"approved", created_at:"2024-02-01T09:00:00", created_by:uids[0],
    items:[
      { item_id:iids[4].toString(),  name:"SSD Samsung 870 EVO 1TB",               quantity:22, unit_price:2850  },
      { item_id:iids[6].toString(),  name:"Монітор Dell P2422H 24\"",              quantity:8,  unit_price:9400  },
      { item_id:iids[10].toString(), name:"Ноутбук Lenovo ThinkPad E15",           quantity:10, unit_price:35000 },
    ],
    total_sum: 22*2850 + 8*9400 + 10*35000,
    total_vat: (22*2850 + 8*9400 + 10*35000) * 0.20,
  },
  {
    type:"act_writeoff", status:"approved", created_at:"2024-02-20T14:00:00", created_by:uids[0],
    items:[ { item_id:iids[13].toString(), name:"Принтер HP LaserJet Pro M404n", quantity:1, unit_price:8900 } ],
    total_sum: 8900, total_vat: 1780,
  },
  {
    type:"act_writeoff", status:"pending", created_at:"2024-04-15T10:00:00", created_by:uids[1],
    items:[ { item_id:iids[7].toString(),  name:"Монітор Samsung S24E450 (пошкоджений)", quantity:1, unit_price:5600 } ],
    total_sum: 5600, total_vat: 1120,
  },
  {
    type:"discrepancy_act", status:"pending", created_at:"2024-04-18T11:30:00", created_by:uids[1],
    items:[ { item_id:iids[5].toString(),  name:"HDD Seagate IronWolf 4TB", quantity:1, unit_price:3600 } ],
    total_sum: 3600, total_vat: 720,
  },
]);
db.documents.createIndex({ created_at: -1 });
db.documents.createIndex({ status: 1 });
db.documents.createIndex({ type: 1 });
print("✓ documents: " + db.documents.countDocuments());

// ============================================================
print("\n=== Seed completed — database: it_wms ===");
print("Collections: users, persons, suppliers, items, transactions, documents");
print("⚠  Passwords are PLACEHOLDERS — run: cd backend && python seed.py");
