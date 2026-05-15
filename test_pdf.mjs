import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readFileSync, writeFileSync } from 'fs';

// Extract font base64 from fonts.ts
const fontsContent = readFileSync('./src/utils/fonts.ts', 'utf8');
const RobotoRegular = fontsContent.match(/RobotoRegular = '([^']+)'/)[1];
const RobotoBold    = fontsContent.match(/RobotoBold = '([^']+)'/)[1];

function addFonts(pdf) {
    pdf.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    pdf.addFileToVFS('Roboto-Bold.ttf',    RobotoBold);
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    pdf.addFont('Roboto-Bold.ttf',    'Roboto', 'bold');
}

function fmtMoney(n) {
    return n.toLocaleString('uk-UA', { minimumFractionDigits: 2 }) + ' грн';
}

// ── TEST 1: АКТ ВИДАЧІ ───────────────────────────────────────────────────
{
    const pdf = new jsPDF();
    addFonts(pdf);

    const num = 'ВД-A1B2C3D4';
    pdf.rect(14, 10, 80, 22);
    pdf.setFontSize(8); pdf.setFont('Roboto','normal'); pdf.setTextColor(0);
    pdf.text('Промислове підприємство',      16, 16);
    pdf.text('Відділ IT-інфраструктури',     16, 21);
    pdf.text('ЄДРПОУ: 12345678',             16, 26);
    pdf.text('Місцезнаходження: м. Київ',    16, 31);

    pdf.setFont('Roboto','bold');
    pdf.text('ЗАТВЕРДЖЕНО', 130, 14);
    pdf.setFont('Roboto','normal');
    pdf.text('Директор ____________________', 130, 20);
    pdf.text(`"____" ____________ ${new Date().getFullYear()} р.`, 130, 32);

    pdf.setFontSize(13); pdf.setFont('Roboto','bold');
    pdf.text('АКТ', 105, 48, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text('видачі матеріально-технічних цінностей', 105, 55, { align: 'center' });

    pdf.setFontSize(9); pdf.setFont('Roboto','normal');
    pdf.text(`від "10.05.2026"`, 14, 63);
    pdf.text(`№ ${num}`, 180, 63, { align: 'right' });
    pdf.setLineWidth(0.3); pdf.line(14, 66, 196, 66);

    let y = 74;
    const field = (label, value) => {
        pdf.setFont('Roboto','bold');   pdf.text(label, 14, y);
        pdf.setFont('Roboto','normal'); pdf.text(value, 75, y);
        y += 7;
    };
    field('Отримувач:',  'Іваненко Петро Олексійович');
    field('Видав:',      'Коваль Марина Василівна');
    field('Підстава:',   'Заявка № 2024-0312 від 08.05.2026');

    y += 2; pdf.line(14, y, 196, y); y += 6;

    autoTable(pdf, {
        startY: y,
        head: [['№\nп/п', 'Найменування матеріальних цінностей', 'Артикул\n(SKU)', 'Кількість', 'Од.\nвим.', 'Ціна,\nгрн', 'Сума,\nгрн']],
        body: [
            ['1', 'Процесор Intel Core i7-13700', 'CPU-I7-13700', '2', 'шт', fmtMoney(12500), fmtMoney(25000)],
            ['2', "Оперативна пам'ять Kingston 16GB DDR5", 'RAM-KG-16D5', '4', 'шт', fmtMoney(3200),  fmtMoney(12800)],
        ],
        foot: [['', '', '', '', '', 'Разом:', fmtMoney(37800)]],
        theme: 'grid',
        styles:     { font: 'Roboto', fontSize: 9, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.2 },
        headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold' },
        bodyStyles: { fillColor: [255,255,255] },
        columnStyles: { 0:{cellWidth:10,halign:'center'}, 2:{cellWidth:28,halign:'center'}, 3:{cellWidth:18,halign:'center'}, 4:{cellWidth:12,halign:'center'}, 5:{cellWidth:24,halign:'right'}, 6:{cellWidth:24,halign:'right'} },
    });

    const tEnd = pdf.lastAutoTable.finalY;
    pdf.setFont('Roboto','bold'); pdf.setFontSize(9);
    pdf.text(`Усього по акту: ${fmtMoney(37800)}`, 196, tEnd + 9, { align: 'right' });

    pdf.setFont('Roboto','normal'); pdf.setFontSize(9);
    pdf.text('Видав:', 14, tEnd + 22);  pdf.line(14, tEnd+30, 95, tEnd+30);
    pdf.text('Отримав:', 110, tEnd + 22); pdf.line(110, tEnd+30, 196, tEnd+30);
    pdf.setFontSize(7); pdf.setTextColor(80);
    pdf.text('(підпис, ПІБ)', 14, tEnd+34); pdf.text('(підпис, ПІБ)', 110, tEnd+34);

    const h = pdf.internal.pageSize.height;
    pdf.line(14, h-14, 196, h-14);
    pdf.setFontSize(7);
    pdf.text(`Документ № ${num}  |  Відділ IT-інфраструктури  |  Сформовано: ${new Date().toLocaleString('uk-UA')}`, 14, h-9);
    pdf.text('стор. 1', 190, h-9);

    writeFileSync('./reports/TEST_Act_Vydachi.pdf', Buffer.from(pdf.output('arraybuffer')));
    console.log('✓ АКТ ВИДАЧІ      → reports/TEST_Act_Vydachi.pdf');
}

// ── TEST 2: АКТ СПИСАННЯ ──────────────────────────────────────────────────
{
    const pdf = new jsPDF();
    addFonts(pdf);
    const num = 'СП-E5F6G7H8';

    pdf.rect(14,10,80,22);
    pdf.setFontSize(8); pdf.setFont('Roboto','normal'); pdf.setTextColor(0);
    pdf.text('Промислове підприємство', 16,16);
    pdf.text('Відділ IT-інфраструктури',16,21);
    pdf.text('ЄДРПОУ: 12345678',        16,26);
    pdf.text('Місцезнаходження: м. Київ',16,31);

    pdf.setFont('Roboto','bold'); pdf.text('ЗАТВЕРДЖЕНО',130,14);
    pdf.setFont('Roboto','normal');
    pdf.text('Директор ____________________',130,20);
    pdf.text(`"____" ____________ ${new Date().getFullYear()} р.`,130,32);

    pdf.setFontSize(13); pdf.setFont('Roboto','bold');
    pdf.text('АКТ', 105,48,{align:'center'});
    pdf.setFontSize(10);
    pdf.text('на списання матеріально-технічних цінностей',105,55,{align:'center'});
    pdf.setFontSize(9); pdf.setFont('Roboto','normal');
    pdf.text(`від "10.05.2026"`,14,63); pdf.text(`№ ${num}`,180,63,{align:'right'});
    pdf.setLineWidth(0.3); pdf.line(14,66,196,66);

    let y=74;
    const field = (l,v)=>{ pdf.setFont('Roboto','bold'); pdf.text(l,14,y); pdf.setFont('Roboto','normal'); pdf.text(v,75,y); y+=7; };
    field('Статус:',           'На розгляді');
    field('Ініціатор списання:', 'Шевченко Андрій Миколайович');
    field('Підстава:',         'Вихід з ладу внаслідок природного зношування');
    y+=2; pdf.line(14,y,196,y); y+=6;

    autoTable(pdf,{
        startY:y,
        head:[['№\nп/п','Найменування матеріальних цінностей','Артикул\n(SKU)','Кількість','Од.\nвим.','Балансова\nвартість, грн','Сума,\nгрн']],
        body:[['1','SSD накопичувач Samsung 970 EVO 500GB','SSD-SM-970-500','1','шт',fmtMoney(3800),fmtMoney(3800)]],
        foot:[['','','','','','Разом:',fmtMoney(3800)]],
        theme:'grid',
        styles:{font:'Roboto',fontSize:9,textColor:[0,0,0],lineColor:[0,0,0],lineWidth:0.2},
        headStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'bold',halign:'center'},
        footStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'bold'},
        bodyStyles:{fillColor:[255,255,255]},
        columnStyles:{0:{cellWidth:10,halign:'center'},2:{cellWidth:28,halign:'center'},3:{cellWidth:18,halign:'center'},4:{cellWidth:12,halign:'center'},5:{cellWidth:28,halign:'right'},6:{cellWidth:22,halign:'right'}},
    });
    const tEnd = pdf.lastAutoTable.finalY;
    pdf.setFont('Roboto','bold'); pdf.setFontSize(9);
    pdf.text('Причина списання:', 14, tEnd+10);
    pdf.setFont('Roboto','normal');
    pdf.text('Вихід з ладу внаслідок природного зношування, ремонту не підлягає.', 14, tEnd+17);
    pdf.text('Видав:', 14,tEnd+30); pdf.line(14,tEnd+38,95,tEnd+38);
    pdf.text('Затвердив:', 110,tEnd+30); pdf.line(110,tEnd+38,196,tEnd+38);
    pdf.setFontSize(7); pdf.setTextColor(80);
    pdf.text('(підпис, ПІБ)',14,tEnd+42); pdf.text('(підпис, ПІБ)',110,tEnd+42);
    const h=pdf.internal.pageSize.height;
    pdf.line(14,h-14,196,h-14);
    pdf.setFontSize(7);
    pdf.text(`Документ № ${num}  |  Відділ IT-інфраструктури  |  Сформовано: ${new Date().toLocaleString('uk-UA')}`,14,h-9);
    pdf.text('стор. 1',190,h-9);

    writeFileSync('./reports/TEST_Act_Spysannya.pdf', Buffer.from(pdf.output('arraybuffer')));
    console.log('✓ АКТ СПИСАННЯ    → reports/TEST_Act_Spysannya.pdf');
}

// ── TEST 3: ЗВЕДЕНИЙ ЗВІТ ─────────────────────────────────────────────────
{
    const stats = JSON.parse(readFileSync('./stats_tmp.json','utf8'));
    const items = JSON.parse(readFileSync('./items_tmp.json','utf8'));
    const categories = [...new Set(items.map(i=>i.category))].filter(Boolean);
    const summaryData = categories.map(cat=>{
        const ci=items.filter(i=>i.category===cat);
        return { category:cat, count:ci.length, totalStock:ci.reduce((a,i)=>a+i.current_stock,0), value:ci.reduce((a,i)=>a+i.current_stock*i.unit_price,0) };
    });
    const totalValue = summaryData.reduce((s,r)=>s+r.value,0);
    const lowStock   = items.filter(i=>i.current_stock<=i.min_stock).length;
    const num = `ЗВ-${Date.now().toString().slice(-8)}`;

    const pdf = new jsPDF();
    addFonts(pdf);

    pdf.rect(14,10,80,22);
    pdf.setFontSize(8); pdf.setFont('Roboto','normal'); pdf.setTextColor(0);
    pdf.text('Промислове підприємство',    16,16);
    pdf.text('Відділ IT-інфраструктури',   16,21);
    pdf.text('ЄДРПОУ: 12345678',           16,26);
    pdf.text('Місцезнаходження: м. Київ',  16,31);

    pdf.setFont('Roboto','bold'); pdf.text('ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ',130,14);
    pdf.setFont('Roboto','normal');
    pdf.text(`Звітний період: ${new Date().toLocaleDateString('uk-UA',{month:'long',year:'numeric'})}`,130,20);
    pdf.text(`Сформовано: ${new Date().toLocaleString('uk-UA')}`,130,26);

    pdf.setFontSize(13); pdf.setFont('Roboto','bold');
    pdf.text('ЗВЕДЕНИЙ ЗВІТ', 105,48,{align:'center'});
    pdf.setFontSize(10); pdf.setFont('Roboto','normal');
    pdf.text('про стан матеріально-технічного забезпечення відділу IT-інфраструктури',105,55,{align:'center'});
    pdf.text(`№ ${num}`,180,62,{align:'right'});
    pdf.setLineWidth(0.3); pdf.line(14,65,196,65);

    let y=73;
    pdf.setFont('Roboto','bold'); pdf.setFontSize(9);
    pdf.text('1. Зведені показники складу',14,y); y+=5;

    autoTable(pdf,{
        startY:y,
        head:[['Показник','Значення']],
        body:[
            ['Загальна вартість складу, грн',   fmtMoney(stats.total_stock_value)],
            ['Всього найменувань на складі',     String(stats.total_items)],
            ['Позицій з критичним залишком',     String(lowStock)],
            ['Документів очікують затвердження', String(stats.pending_approvals)],
            ['Доступно / Видано / Списано',       `${stats.available} / ${stats.issued} / ${stats.written_off}`],
        ],
        theme:'grid',
        styles:{font:'Roboto',fontSize:9,textColor:[0,0,0],lineColor:[0,0,0],lineWidth:0.2},
        headStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'bold'},
        bodyStyles:{fillColor:[255,255,255]},
        columnStyles:{1:{halign:'right',fontStyle:'bold'}},
        tableWidth:130,
    });

    const a1 = pdf.lastAutoTable.finalY; y=a1+10;
    pdf.setFont('Roboto','bold'); pdf.setFontSize(9);
    pdf.text('2. Розподіл матеріальних цінностей за категоріями',14,y); y+=5;

    autoTable(pdf,{
        startY:y,
        head:[['№','Категорія','Кількість найменувань','Загальна кількість, шт','Сума, грн','Питома вага, %']],
        body:summaryData.map((r,i)=>[i+1,r.category,r.count,r.totalStock,fmtMoney(r.value),totalValue>0?((r.value/totalValue)*100).toFixed(1)+'%':'—']),
        foot:[['','ВСЬОГО',summaryData.reduce((s,r)=>s+r.count,0),summaryData.reduce((s,r)=>s+r.totalStock,0),fmtMoney(totalValue),'100%']],
        theme:'grid',
        styles:{font:'Roboto',fontSize:9,textColor:[0,0,0],lineColor:[0,0,0],lineWidth:0.2},
        headStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'bold',halign:'center'},
        footStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'bold'},
        bodyStyles:{fillColor:[255,255,255]},
        columnStyles:{0:{cellWidth:10,halign:'center'},2:{halign:'center'},3:{halign:'center'},4:{halign:'right'},5:{halign:'center'}},
    });

    const a2=pdf.lastAutoTable.finalY; y=a2+10;
    pdf.setFont('Roboto','bold'); pdf.setFontSize(9);
    pdf.text('3. Топ-5 позицій за балансовою вартістю',14,y); y+=5;

    const top5=[...items].sort((a,b)=>b.current_stock*b.unit_price-a.current_stock*a.unit_price).slice(0,5);
    autoTable(pdf,{
        startY:y,
        head:[['№','Найменування','Артикул','На складі','Ціна, грн','Вартість, грн']],
        body:top5.map((it,i)=>[i+1,it.name,it.sku||'—',it.current_stock,fmtMoney(it.unit_price),fmtMoney(it.current_stock*it.unit_price)]),
        theme:'grid',
        styles:{font:'Roboto',fontSize:9,textColor:[0,0,0],lineColor:[0,0,0],lineWidth:0.2},
        headStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'bold',halign:'center'},
        bodyStyles:{fillColor:[255,255,255]},
        columnStyles:{0:{cellWidth:10,halign:'center'},1:{cellWidth:65},3:{halign:'center'},4:{halign:'right'},5:{halign:'right'}},
    });

    const a3=pdf.lastAutoTable.finalY;
    const sigY=a3+16;
    pdf.setFont('Roboto','normal'); pdf.setFontSize(9); pdf.setTextColor(0);
    pdf.text('Керівник відділу IT-інфраструктури:',14,sigY);
    pdf.line(14,sigY+10,95,sigY+10); pdf.line(105,sigY+10,196,sigY+10);
    pdf.setFontSize(7); pdf.setTextColor(80);
    pdf.text('(підпис)',14,sigY+14); pdf.text('(ПІБ)',105,sigY+14);

    const h=pdf.internal.pageSize.height;
    pdf.line(14,h-14,196,h-14);
    pdf.setFontSize(7);
    pdf.text(`Документ № ${num}  |  Відділ IT-інфраструктури  |  Сформовано: ${new Date().toLocaleString('uk-UA')}`,14,h-9);
    pdf.text('стор. 1',190,h-9);

    writeFileSync('./reports/TEST_Zvedenyi_Zvit.pdf', Buffer.from(pdf.output('arraybuffer')));
    console.log('✓ ЗВЕДЕНИЙ ЗВІТ   → reports/TEST_Zvedenyi_Zvit.pdf');
}

console.log('\nУсі тестові PDF збережено в папку reports/');
