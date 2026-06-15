import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Document } from '../data/mockData';
import { RobotoRegular, RobotoBold } from './fonts';

// Add the custom font to the Virtual File System (VFS)
function addCustomFonts(pdf: jsPDF) {
    pdf.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    pdf.addFileToVFS('Roboto-Bold.ttf', RobotoBold);
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
}

const ORG_NAME    = 'Відділ IT-інфраструктури';
const ORG_FULL    = 'Промислове підприємство';
const ORG_EDRPOU  = 'ЄДРПОУ: 12345678';

// ─── helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
    if (!iso) return new Date().toLocaleDateString('uk-UA');
    return new Date(iso).toLocaleDateString('uk-UA');
}

function fmtMoney(n?: number): string {
    if (n == null) return '—';
    return n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' грн';
}

/** Верхній лівий кут — реквізити організації */
function stampBlock(pdf: jsPDF) {
    pdf.setFontSize(8);
    pdf.setFont('Roboto', 'normal');
    pdf.setTextColor(0);
    pdf.rect(14, 10, 80, 22);
    pdf.text(ORG_FULL,   16, 16);
    pdf.text(ORG_NAME,   16, 21);
    pdf.text(ORG_EDRPOU, 16, 26);
    pdf.text('Місцезнаходження: м. Київ', 16, 31);
}

/** Верхній правий кут — блок ЗАТВЕРДЖЕНО */
function approvedBlock(pdf: jsPDF) {
    pdf.setFontSize(8);
    pdf.setFont('Roboto', 'bold');
    pdf.setTextColor(0);
    pdf.text('ЗАТВЕРДЖЕНО', 130, 14);
    pdf.setFont('Roboto', 'normal');
    pdf.text('Директор ____________________', 130, 20);
    pdf.text(ORG_FULL,                       130, 26);
    pdf.text(`"____" ____________ ${new Date().getFullYear()} р.`, 130, 32);
}

/** Горизонтальна лінія */
function hline(pdf: jsPDF, y: number) {
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.line(14, y, 196, y);
}

/** Підвал сторінки */
function pageFooter(pdf: jsPDF, docNum: string) {
    const h = pdf.internal.pageSize.height;
    hline(pdf, h - 14);
    pdf.setFontSize(7);
    pdf.setFont('Roboto', 'normal');
    pdf.setTextColor(80);
    pdf.text(`Документ № ${docNum}  |  ${ORG_NAME}  |  Сформовано: ${new Date().toLocaleString('uk-UA')}`, 14, h - 9);
    pdf.text('стор. 1', 190, h - 9);
}

/** Блок підписів */
function sigBlock(pdf: jsPDF, y: number, left: string, right: string) {
    pdf.setFontSize(9);
    pdf.setFont('Roboto', 'normal');
    pdf.setTextColor(0);
    pdf.text(left,  14,  y);
    pdf.text(right, 110, y);
    pdf.line(14,  y + 8, 95,  y + 8);
    pdf.line(110, y + 8, 196, y + 8);
    pdf.setFontSize(7);
    pdf.setTextColor(80);
    pdf.text('(підпис, ПІБ)',  14,  y + 12);
    pdf.text('(підпис, ПІБ)',  110, y + 12);
    pdf.setTextColor(0);
}


// ══════════════════════════════════════════════════════════════════════════════
// 1. АКТ ВИДАЧІ
// ══════════════════════════════════════════════════════════════════════════════
export interface IssuingActData {
    docId:      string;
    date:       string;
    itemName:   string;
    sku?:       string;
    quantity:   number;
    unit?:      string;
    unitPrice?: number;
    recipient:  string;
    issuedBy?:  string;
    notes?:     string;
}

export const downloadIssuingActPDF = (data: IssuingActData) => {
    const pdf = new jsPDF();
    addCustomFonts(pdf);
    const num   = `ВД-${data.docId.substring(0, 8).toUpperCase()}`;
    const total = data.unitPrice ? data.quantity * data.unitPrice : null;

    stampBlock(pdf);
    approvedBlock(pdf);

    // Назва
    pdf.setFontSize(13);
    pdf.setFont('Roboto', 'bold');
    pdf.setTextColor(0);
    pdf.text('АКТ', 105, 48, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text('видачі матеріально-технічних цінностей', 105, 55, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('Roboto', 'normal');
    pdf.text(`від "${fmtDate(data.date)}"`, 14, 63);
    pdf.text(`№ ${num}`, 180, 63, { align: 'right' });
    hline(pdf, 66);

    // Реквізити документа
    let y = 74;
    const field = (label: string, value: string) => {
        pdf.setFont('Roboto', 'bold');   pdf.text(label,  14, y);
        pdf.setFont('Roboto', 'normal'); pdf.text(value, 75, y);
        y += 7;
    };
    field('Отримувач:',         data.recipient || '—');
    field('Видав:',             data.issuedBy  || '—');
    if (data.notes) field('Підстава:',  data.notes);

    y += 2;
    hline(pdf, y); y += 6;

    // Таблиця
    autoTable(pdf, {
        startY: y,
        head: [['№\nп/п', 'Найменування матеріальних цінностей', 'Артикул\n(SKU)', 'Кількість', 'Од.\nвим.', 'Ціна,\nгрн', 'Сума,\nгрн']],
        body: [[
            '1',
            data.itemName,
            data.sku ?? '—',
            data.quantity,
            data.unit ?? 'шт',
            data.unitPrice ? fmtMoney(data.unitPrice) : '—',
            total          ? fmtMoney(total)           : '—',
        ]],
        theme: 'grid',
        styles:          { font: 'Roboto', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2 },
        headStyles:      { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', halign: 'center' },
        bodyStyles:      { fillColor: [255,255,255] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: 24, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 14, halign: 'center' },
            5: { cellWidth: 26, halign: 'right' },
            6: { cellWidth: 26, halign: 'right' },
        },
    });

    const tEnd: number = (pdf as any).lastAutoTable?.finalY ?? y + 20;

    // Підсумок
    if (total) {
        pdf.setFont('Roboto', 'bold');
        pdf.setFontSize(9);
        pdf.text(`Усього по акту: ${fmtMoney(total)}`, 196, tEnd + 8, { align: 'right' });
    }

    sigBlock(pdf, tEnd + 20, 'Видав:', 'Отримав:');
    pageFooter(pdf, num);
    pdf.save(`Act_Issuance_${num}.pdf`);
};


// ══════════════════════════════════════════════════════════════════════════════
// 2. АКТ СПИСАННЯ
// ══════════════════════════════════════════════════════════════════════════════
export interface WriteoffActData {
    docId:        string;
    date:         string;
    itemName:     string;
    sku?:         string;
    quantity:     number;
    unit?:        string;
    unitPrice?:   number;
    reason:       string;
    requestedBy?: string;
    status:       string;
}

const STATUS_UA: Record<string, string> = {
    pending:  'На розгляді',
    approved: 'Затверджено',
    rejected: 'Відхилено',
};

export const downloadWriteoffActPDF = (data: WriteoffActData) => {
    const pdf = new jsPDF();
    addCustomFonts(pdf);
    const num   = `СП-${data.docId.substring(0, 8).toUpperCase()}`;
    const total = data.unitPrice ? data.quantity * data.unitPrice : null;

    stampBlock(pdf);
    approvedBlock(pdf);

    pdf.setFontSize(13);
    pdf.setFont('Roboto', 'bold');
    pdf.setTextColor(0);
    pdf.text('АКТ', 105, 48, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text('на списання матеріально-технічних цінностей', 105, 55, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('Roboto', 'normal');
    pdf.text(`від "${fmtDate(data.date)}"`, 14, 63);
    pdf.text(`№ ${num}`, 180, 63, { align: 'right' });
    hline(pdf, 66);

    let y = 74;
    const field = (label: string, value: string) => {
        pdf.setFont('Roboto', 'bold');   pdf.text(label,  14, y);
        pdf.setFont('Roboto', 'normal'); pdf.text(value, 75, y);
        y += 7;
    };
    field('Статус:',           STATUS_UA[data.status] ?? data.status);
    field('Ініціатор списання:', data.requestedBy || '—');
    field('Підстава:',         data.reason);

    y += 2; hline(pdf, y); y += 6;

    autoTable(pdf, {
        startY: y,
        head: [['№\nп/п', 'Найменування матеріальних цінностей', 'Артикул\n(SKU)', 'Кількість', 'Од.\nвим.', 'Балансова\nвартість, грн', 'Сума,\nгрн']],
        body: [[
            '1',
            data.itemName,
            data.sku ?? '—',
            data.quantity,
            data.unit ?? 'шт',
            data.unitPrice ? fmtMoney(data.unitPrice) : '—',
            total          ? fmtMoney(total)           : '—',
        ]],
        theme: 'grid',
        styles:     { font: 'Roboto', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2 },
        headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fillColor: [255,255,255] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: 24, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 14, halign: 'center' },
            5: { cellWidth: 30, halign: 'right' },
            6: { cellWidth: 24, halign: 'right' },
        },
    });

    const tEnd: number = (pdf as any).lastAutoTable?.finalY ?? y + 20;

    if (total) {
        pdf.setFont('Roboto', 'bold');
        pdf.setFontSize(9);
        pdf.text(`Усього до списання: ${fmtMoney(total)}`, 196, tEnd + 8, { align: 'right' });
    }

    // Причина — окремий текстовий блок
    pdf.setFont('Roboto', 'bold');   pdf.setFontSize(9);
    pdf.text('Причина списання:', 14, tEnd + 18);
    pdf.setFont('Roboto', 'normal');
    pdf.text(data.reason.substring(0, 100), 14, tEnd + 25);

    sigBlock(pdf, tEnd + 36, 'Склав комісію:', 'Затвердив:');
    pageFooter(pdf, num);
    pdf.save(`Act_Writeoff_${num}.pdf`);
};


// ══════════════════════════════════════════════════════════════════════════════
// 3. АКТ ПОВЕРНЕННЯ
// ══════════════════════════════════════════════════════════════════════════════
export interface ReturnActData {
    docId:        string;
    date:         string;
    itemName:     string;
    sku?:         string;
    quantity:     number;
    unit?:        string;
    returnedFrom: string;
    notes?:       string;
}

export const downloadReturnActPDF = (data: ReturnActData) => {
    const pdf = new jsPDF();
    addCustomFonts(pdf);
    const num = `ПВ-${data.docId.substring(0, 8).toUpperCase()}`;

    stampBlock(pdf);
    approvedBlock(pdf);

    pdf.setFontSize(13);
    pdf.setFont('Roboto', 'bold');
    pdf.setTextColor(0);
    pdf.text('АКТ', 105, 48, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text('повернення матеріально-технічних цінностей', 105, 55, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('Roboto', 'normal');
    pdf.text(`від "${fmtDate(data.date)}"`, 14, 63);
    pdf.text(`№ ${num}`, 180, 63, { align: 'right' });
    hline(pdf, 66);

    let y = 74;
    const field = (label: string, value: string) => {
        pdf.setFont('Roboto', 'bold');   pdf.text(label,  14, y);
        pdf.setFont('Roboto', 'normal'); pdf.text(value, 75, y);
        y += 7;
    };
    field('Повертає:',  data.returnedFrom || '—');
    if (data.notes) field('Примітки:', data.notes);

    y += 2; hline(pdf, y); y += 6;

    autoTable(pdf, {
        startY: y,
        head: [['№\nп/п', 'Найменування матеріальних цінностей', 'Артикул\n(SKU)', 'Кількість\nповернено', 'Од.\nвим.', 'Технічний\nстан']],
        body: [['1', data.itemName, data.sku ?? '—', data.quantity, data.unit ?? 'шт', 'Придатний']],
        theme: 'grid',
        styles:     { font: 'Roboto', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2 },
        headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fillColor: [255,255,255] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: 16, halign: 'center' },
        },
    });

    const tEnd: number = (pdf as any).lastAutoTable?.finalY ?? y + 20;
    sigBlock(pdf, tEnd + 14, 'Здав:', 'Прийняв:');
    pageFooter(pdf, num);
    pdf.save(`Act_Return_${num}.pdf`);
};


// ══════════════════════════════════════════════════════════════════════════════
// 4. НАКЛАДНА / РАХУНОК (Acts page)
// ══════════════════════════════════════════════════════════════════════════════
export const downloadInvoicePDF = (doc: Document) => {
    if (doc.type === 'act_writeoff') {
        return downloadWriteoffActPDF({
            docId:       doc._id,
            date:        doc.created_at,
            itemName:    (doc as any).item_name ?? 'Матеріальна цінність',
            sku:         (doc as any).sku,
            quantity:    (doc as any).quantity ?? 1,
            unit:        (doc as any).unit,
            unitPrice:   (doc as any).unit_price,
            reason:      (doc as any).reason ?? '—',
            requestedBy: (doc as any).created_by_name,
            status:      doc.status,
        });
    }
    if (doc.type === 'issuing') {
        return downloadIssuingActPDF({
            docId:     doc._id,
            date:      doc.created_at,
            itemName:  (doc as any).item_name ?? 'Матеріальна цінність',
            sku:       (doc as any).sku,
            quantity:  (doc as any).quantity ?? 1,
            unit:      (doc as any).unit,
            unitPrice: (doc as any).unit_price,
            recipient: (doc as any).recipient ?? '—',
            notes:     (doc as any).notes,
        });
    }
    if (doc.type === 'discrepancy_act') {
        const rawRows: any[] = (doc as any).discrepancies ?? [];
        const rows = rawRows.map((r: any) => ({
            sku:         r.sku ?? '—',
            name:        r.item_name ?? '—',
            discrepancy: Number(r.diff ?? 0),
            unitPrice:   r.unit_price != null ? Number(r.unit_price) : undefined,
            type:        Number(r.diff ?? 0) === 0 ? 'Норма' : (Number(r.diff ?? 0) > 0 ? 'Надлишок' : 'Нестача'),
            loggedBy:    String((doc as any).created_by ?? '—'),
        }));
        // If no discrepancies stored, generate a placeholder row
        if (rows.length === 0) {
            rows.push({ sku: '—', name: 'Дані відсутні', discrepancy: 0, type: '—', loggedBy: '—' });
        }
        return downloadDiscrepancyActPDF(rows);
    }

    // Накладна (invoice / procurement)
    const pdf = new jsPDF();
    addCustomFonts(pdf);
    const num = `НК-${doc._id.slice(-8).toUpperCase()}`;

    stampBlock(pdf);
    approvedBlock(pdf);

    pdf.setFontSize(13);
    pdf.setFont('Roboto', 'bold');
    pdf.setTextColor(0);
    pdf.text('НАКЛАДНА', 105, 48, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('Roboto', 'normal');
    pdf.text('на отримання матеріально-технічних цінностей', 105, 55, { align: 'center' });

    pdf.setFontSize(9);
    pdf.text(`від "${fmtDate(doc.created_at)}"`, 14, 63);
    pdf.text(`№ ${num}`, 180, 63, { align: 'right' });
    hline(pdf, 66);

    let y = 74;
    pdf.setFont('Roboto', 'bold');  pdf.text('Статус:',   14, y);
    pdf.setFont('Roboto', 'normal'); pdf.text(STATUS_UA[doc.status] ?? doc.status, 75, y);
    y += 10;
    hline(pdf, y); y += 6;

    const items: any[] = (doc as any).items ?? [];
    const tableBody = items.length > 0
        ? items.map((it: any, i: number) => [
            i + 1, it.name ?? '—', it.quantity ?? 1, it.unit ?? 'шт',
            it.unit_price ? fmtMoney(it.unit_price) : '—',
            it.total ? fmtMoney(it.total) : '—',
          ])
        : [['1', 'Дивіться документ', '—', '—', '—', doc.total_sum ? fmtMoney(doc.total_sum) : '—']];

    autoTable(pdf, {
        startY: y,
        head: [['№\nп/п', 'Найменування', 'Кількість', 'Од.\nвим.', 'Ціна, грн', 'Сума, грн']],
        body: tableBody,
        theme: 'grid',
        styles:     { font: 'Roboto', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2 },
        headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fillColor: [255,255,255] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 16, halign: 'center' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' },
        },
    });

    const tEnd: number = (pdf as any).lastAutoTable?.finalY ?? y + 20;

    if (doc.total_sum) {
        pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
        pdf.text(`Усього: ${fmtMoney(doc.total_sum)}`, 196, tEnd + 8, { align: 'right' });
        if (doc.total_vat) {
            pdf.setFont('Roboto', 'normal');
            pdf.text(`у т.ч. ПДВ (20%): ${fmtMoney(doc.total_vat)}`, 196, tEnd + 15, { align: 'right' });
        }
    }

    sigBlock(pdf, tEnd + 24, 'Видав:', 'Отримав:');
    pageFooter(pdf, num);
    pdf.save(`Invoice_${num}.pdf`);
};


// ══════════════════════════════════════════════════════════════════════════════
// 5. АКТ ІНВЕНТАРИЗАЦІЇ
// ══════════════════════════════════════════════════════════════════════════════
export const downloadDiscrepancyActPDF = (
    rows: Array<{ sku: string; name: string; discrepancy: number; type: string; loggedBy: string; unitPrice?: number }>
) => {
    const pdf = new jsPDF();
    addCustomFonts(pdf);
    const num = `ІН-${Date.now().toString().slice(-8)}`;
    const discrepancies = rows.filter(r => r.discrepancy !== 0).length;

    stampBlock(pdf);
    approvedBlock(pdf);

    pdf.setFontSize(13);
    pdf.setFont('Roboto', 'bold');
    pdf.setTextColor(0);
    pdf.text('АКТ ІНВЕНТАРИЗАЦІЇ', 105, 48, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('Roboto', 'normal');
    pdf.text('матеріально-технічних цінностей відділу IT-інфраструктури', 105, 55, { align: 'center' });

    pdf.setFontSize(9);
    pdf.text(`від "${fmtDate('')}"`, 14, 63);
    pdf.text(`№ ${num}`, 180, 63, { align: 'right' });
    hline(pdf, 66);

    let y = 74;
    const field = (label: string, value: string) => {
        pdf.setFont('Roboto', 'bold');   pdf.text(label,  14, y);
        pdf.setFont('Roboto', 'normal'); pdf.text(value, 75, y);
        y += 7;
    };
    field('Перевірено позицій:',      String(rows.length));
    field('Виявлено розбіжностей:',   String(discrepancies));

    y += 2; hline(pdf, y); y += 6;

    autoTable(pdf, {
        startY: y,
        head: [['№\nп/п', 'Найменування', 'Артикул\n(SKU)', 'Ціна за\nод., грн', 'Відхилення\n(+/−)', 'Тип\nрозбіжності', 'Відповідальний']],
        body: rows.map((r, i) => [
            i + 1,
            r.name,
            r.sku || '—',
            r.unitPrice != null ? fmtMoney(r.unitPrice) : '—',
            r.discrepancy > 0 ? `+${r.discrepancy}` : String(r.discrepancy),
            r.type || '—',
            r.loggedBy || '—',
        ]),
        theme: 'grid',
        styles:     { font: 'Roboto', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2 },
        headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fillColor: [255,255,255] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: 24, halign: 'center' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 24, halign: 'center' },
            6: { cellWidth: 35, halign: 'center' },
        },
        didParseCell: (data: any) => {
            if (data.column.index === 4 && data.section === 'body') {
                const r = rows[data.row.index];
                const v = r ? r.discrepancy : 0;
                data.cell.styles.textColor = v < 0 ? [180, 0, 0] : v > 0 ? [0, 120, 0] : [0, 0, 0];
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    const tEnd: number = (pdf as any).lastAutoTable?.finalY ?? y + 20;

    pdf.setFont('Roboto', 'normal'); pdf.setFontSize(8); pdf.setTextColor(0);
    pdf.text('Члени комісії:', 14, tEnd + 10);
    pdf.line(14, tEnd + 20, 90,  tEnd + 20);
    pdf.line(110, tEnd + 20, 196, tEnd + 20);
    pdf.text('(підпис, ПІБ)', 14,  tEnd + 24);
    pdf.text('(підпис, ПІБ)', 110, tEnd + 24);

    pageFooter(pdf, num);
    pdf.save(`Act_Inventory_${num}.pdf`);
};


// ══════════════════════════════════════════════════════════════════════════════
// 6. ЗВЕДЕНИЙ ЗВІТ МЕНЕДЖЕРА
// ══════════════════════════════════════════════════════════════════════════════
export const downloadSummaryReportPDF = (
    summaryData: Array<{ category: string; count: number; totalStock: number; value: number }>,
    stats: { totalStockValue: number; lowStockItems: number; pendingApprovals: number; totalItems: number }
) => {
    const pdf = new jsPDF();
    addCustomFonts(pdf);
    const num = `ЗВ-${Date.now().toString().slice(-8)}`;

    stampBlock(pdf);

    // Гриф обмеження (для виду)
    pdf.setFontSize(8);
    pdf.setFont('Roboto', 'bold');
    pdf.setTextColor(0);
    pdf.text('ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ', 130, 14);
    pdf.setFont('Roboto', 'normal');
    pdf.text(`Звітний період: ${new Date().toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}`, 130, 20);
    pdf.text(`Сформовано: ${new Date().toLocaleString('uk-UA')}`, 130, 26);

    // Заголовок
    pdf.setFontSize(13);
    pdf.setFont('Roboto', 'bold');
    pdf.setTextColor(0);
    pdf.text('ЗВЕДЕНИЙ ЗВІТ', 105, 48, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('Roboto', 'normal');
    pdf.text('про стан матеріально-технічного забезпечення відділу IT-інфраструктури', 105, 55, { align: 'center' });
    pdf.text(`№ ${num}`, 180, 62, { align: 'right' });
    hline(pdf, 65);

    // Зведені показники — таблиця без кольору
    let y = 73;
    pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
    pdf.text('1. Зведені показники складу', 14, y); y += 5;

    autoTable(pdf, {
        startY: y,
        head: [['Показник', 'Значення']],
        body: [
            ['Загальна вартість складу, грн',      fmtMoney(stats.totalStockValue)],
            ['Всього найменувань на складі',        String(stats.totalItems)],
            ['Позицій з критичним залишком',        String(stats.lowStockItems)],
            ['Документів очікують затвердження',    String(stats.pendingApprovals)],
        ],
        theme: 'grid',
        styles:     { font: 'Roboto', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2 },
        headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold' },
        bodyStyles: { fillColor: [255,255,255] },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        tableWidth: 120,
    });

    const after1: number = (pdf as any).lastAutoTable?.finalY ?? y + 40;
    y = after1 + 8;

    // Розподіл по категоріях
    pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
    pdf.text('2. Розподіл матеріальних цінностей за категоріями', 14, y); y += 5;

    const totalValue = summaryData.reduce((s, r) => s + r.value, 0);

    autoTable(pdf, {
        startY: y,
        head: [['№', 'Категорія', 'Кількість\nнайменувань', 'Загальна\nкількість, шт', 'Сума, грн', 'Питома\nвага, %']],
        body: summaryData.map((r, i) => [
            i + 1,
            r.category,
            r.count,
            r.totalStock,
            fmtMoney(r.value),
            totalValue > 0 ? ((r.value / totalValue) * 100).toFixed(1) + '%' : '—',
        ]),
        foot: [['', 'ВСЬОГО', summaryData.reduce((s,r) => s + r.count, 0), summaryData.reduce((s,r) => s + r.totalStock, 0), fmtMoney(totalValue), '100%']],
        theme: 'grid',
        styles:     { font: 'Roboto', fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2 },
        headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold' },
        bodyStyles: { fillColor: [255,255,255] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'center' },
        },
    });

    const after2: number = (pdf as any).lastAutoTable?.finalY ?? y + 40;

    // Підпис керівника
    const sigY = after2 + 16;
    pdf.setFont('Roboto', 'normal'); pdf.setFontSize(9); pdf.setTextColor(0);
    pdf.text('Керівник відділу IT-інфраструктури:', 14, sigY);
    pdf.line(14, sigY + 10, 95, sigY + 10);
    pdf.setFontSize(7); pdf.setTextColor(80);
    pdf.text('(підпис)', 14, sigY + 14);
    pdf.setTextColor(0); pdf.setFontSize(9);
    pdf.line(105, sigY + 10, 196, sigY + 10);
    pdf.setFontSize(7); pdf.setTextColor(80);
    pdf.text('(ПІБ)', 105, sigY + 14);

    pageFooter(pdf, num);
    pdf.save(`Summary_Report_${num}.pdf`);
};


// ══════════════════════════════════════════════════════════════════════════════
// 7. ІНСТРУКЦІЯ З МАТЕМАТИЧНИХ МОДЕЛЕЙ
// ══════════════════════════════════════════════════════════════════════════════
export const downloadAnalyticsGuidePDF = (sections: any[]) => {
    const pdf = new jsPDF();
    addCustomFonts(pdf);
    const W  = pdf.internal.pageSize.width;   // 210
    const H  = pdf.internal.pageSize.height;  // 297
    const ML = 20;   // margin left
    const MR = 20;   // margin right
    const TW = W - ML - MR;  // text width
    const BOTTOM = H - 18;   // page bottom limit

    let pageNum = 1;

    /* ── helpers ─────────────────────────────────────────────────────── */
    const footer = () => {
        pdf.setDrawColor(0); pdf.setLineWidth(0.2);
        pdf.line(ML, H - 12, W - MR, H - 12);
        pdf.setFont('Roboto', 'normal'); pdf.setFontSize(7); pdf.setTextColor(100);
        pdf.text(`${ORG_NAME}  |  Інструкція: математичні моделі управління запасами`, ML, H - 7);
        pdf.text(`стор. ${pageNum}`, W - MR, H - 7, { align: 'right' });
        pdf.setTextColor(0);
    };

    // y-cursor, automatically goes to a new page when needed
    let y = 20;
    const checkPage = (needed: number) => {
        if (y + needed > BOTTOM) {
            footer();
            pageNum++;
            pdf.addPage();
            y = 20;
        }
    };

    // Write a line of text and advance y
    const line = (
        text: string,
        opts: { bold?: boolean; size?: number; indent?: number; gap?: number } = {}
    ) => {
        const { bold = false, size = 10, indent = 0, gap = 1.5 } = opts;
        pdf.setFont('Roboto', bold ? 'bold' : 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(0);
        const lines = pdf.splitTextToSize(text, TW - indent);
        checkPage(lines.length * (size * 0.4) + gap);
        pdf.text(lines, ML + indent, y);
        y += lines.length * (size * 0.4) + gap;
    };

    const gap = (n = 4) => { checkPage(n); y += n; };

    const hrule = () => {
        checkPage(4);
        pdf.setDrawColor(180); pdf.setLineWidth(0.2);
        pdf.line(ML, y, W - MR, y);
        pdf.setDrawColor(0);
        y += 4;
    };

    /* ── Титульна сторінка ───────────────────────────────────────────── */
    pdf.setFont('Roboto', 'normal'); pdf.setFontSize(9); pdf.setTextColor(0);
    pdf.text(ORG_FULL,   ML, y);
    pdf.text(ORG_NAME,   ML, y + 5);
    pdf.text(ORG_EDRPOU, ML, y + 10);
    y += 18;

    pdf.setDrawColor(0); pdf.setLineWidth(0.4);
    pdf.line(ML, y, W - MR, y);
    y += 10;

    pdf.setFont('Roboto', 'bold'); pdf.setFontSize(16); pdf.setTextColor(0);
    pdf.text('ІНСТРУКЦІЯ', W / 2, y, { align: 'center' });
    y += 8;

    pdf.setFont('Roboto', 'normal'); pdf.setFontSize(11);
    pdf.text('з використання математичних моделей', W / 2, y, { align: 'center' });
    y += 6;
    pdf.text('управління запасами запасних частин', W / 2, y, { align: 'center' });
    y += 10;

    pdf.setDrawColor(0); pdf.setLineWidth(0.4);
    pdf.line(ML, y, W - MR, y);
    y += 8;

    pdf.setFont('Roboto', 'normal'); pdf.setFontSize(9);
    pdf.text(`Дата складання: ${new Date().toLocaleDateString('uk-UA')}`, ML, y);
    y += 5;
    const totalModels = sections.reduce((s: number, sec: any) => s + sec.models.length, 0);
    pdf.text(`Кількість моделей: ${totalModels} у ${sections.length} розділах`, ML, y);
    y += 14;

    /* ── Зміст ──────────────────────────────────────────────────────── */
    line('ЗМІСТ', { bold: true, size: 12 });
    hrule();

    sections.forEach((sec: any, si: number) => {
        line(`${si + 1}.  ${sec.label.toUpperCase()}`, { bold: true, size: 10 });
        sec.models.forEach((m: any) => {
            line(`${m.num}.  ${m.tag} — ${m.title}`, { size: 9, indent: 8, gap: 1 });
        });
        gap(3);
    });

    gap(6);
    hrule();
    line('РЕКОМЕНДОВАНИЙ ПОРЯДОК РОБОТИ', { bold: true, size: 11 });
    gap(2);

    const workflow = [
        ['1', 'Класифікація — ABC-аналіз',     'Позиції класу A (80% вартості) — найбільша увага'],
        ['2', 'Класифікація — XYZ-аналіз',     'A+Z = найбільший ризик дефіциту'],
        ['3', 'Ризик — Індекс критичності',    'CI > 0.7 — потребує негайного поповнення'],
        ['4', 'Ризик — Модель Пуассона',       'Перевірте ймовірність дефіциту P(X>s)'],
        ['5', 'Прогнозування — Holt/Регресія', 'Визначте тренд: зростання чи спадання'],
        ['6', 'Оптимізація — EOQ + ROP',       'Оптимальний обсяг та точка перезамовлення'],
        ['7', 'Оптимізація — SS',              'Страховий запас з урахуванням варіацій'],
    ];

    checkPage(60);
    autoTable(pdf, {
        startY: y,
        head: [['Крок', 'Розділ / модель', 'Дія']],
        body: workflow,
        theme: 'grid',
        styles:     { font: 'Roboto', fontSize: 9, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.2 },
        headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold' },
        bodyStyles: { fillColor: [255,255,255] },
        columnStyles: {
            0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 62, fontStyle: 'bold' },
        },
        margin: { left: ML, right: MR },
    });
    y = (pdf as any).lastAutoTable?.finalY ? (pdf as any).lastAutoTable.finalY + 4 : y + 60;
    footer();

    /* ── Моделі ──────────────────────────────────────────────────────── */
    sections.forEach((section: any) => {
        pageNum++;
        pdf.addPage();
        y = 20;

        // Заголовок розділу
        pdf.setFont('Roboto', 'bold'); pdf.setFontSize(14); pdf.setTextColor(0);
        pdf.text(section.label.toUpperCase(), ML, y);
        y += 6;
        pdf.setDrawColor(0); pdf.setLineWidth(0.6);
        pdf.line(ML, y, W - MR, y);
        pdf.setLineWidth(0.2);
        y += 5;

        pdf.setFont('Roboto', 'normal'); pdf.setFontSize(9);
        const sdesc = pdf.splitTextToSize(section.desc, TW);
        pdf.text(sdesc, ML, y);
        y += sdesc.length * 4 + 8;

        section.models.forEach((model: any) => {
            checkPage(60);

            // Заголовок моделі
            pdf.setFont('Roboto', 'bold'); pdf.setFontSize(11); pdf.setTextColor(0);
            pdf.text(`${model.num}.  ${model.tag}  —  ${model.title}`, ML, y);
            y += 5;
            pdf.setDrawColor(0); pdf.setLineWidth(0.3);
            pdf.line(ML, y, W - MR, y);
            y += 5;

            // Формула
            pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
            pdf.text('Формула:', ML, y);
            pdf.setFont('Roboto', 'normal');
            pdf.text(model.formula, ML + 22, y);
            y += 6;

            // Призначення
            pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
            pdf.text('Призначення:', ML, y);
            pdf.setFont('Roboto', 'normal');
            const plines = pdf.splitTextToSize(model.purpose, TW - 30);
            pdf.text(plines, ML + 30, y);
            y += plines.length * 4 + 5;

            // Порядок роботи
            pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
            pdf.text('Порядок роботи:', ML, y);
            y += 5;
            model.steps.forEach((step: string, i: number) => {
                checkPage(8);
                pdf.setFont('Roboto', 'normal'); pdf.setFontSize(9);
                const slines = pdf.splitTextToSize(`${i + 1}.  ${step}`, TW - 6);
                pdf.text(slines, ML + 6, y);
                y += slines.length * 4 + 2;
            });
            y += 3;

            // Таблиця параметрів
            checkPage((model.params.length + 2) * 8);
            pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
            pdf.text('Параметри:', ML, y);
            y += 4;
            autoTable(pdf, {
                startY: y,
                head: [['Позначення', 'Опис', 'Джерело']],
                body: model.params.map(([n, d, s]: string[]) => [n, d, s ?? '—']),
                theme: 'grid',
                styles:     { font: 'Roboto', fontSize: 8.5, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.2 },
                headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold' },
                bodyStyles: { fillColor: [255,255,255] },
                columnStyles: { 0: { cellWidth: 26, fontStyle: 'bold' }, 2: { cellWidth: 56 } },
                margin: { left: ML, right: MR },
            });
            y = (pdf as any).lastAutoTable?.finalY ? (pdf as any).lastAutoTable.finalY + 3 : y + 30;

            // Таблиця результатів
            checkPage((model.results.length + 2) * 8);
            pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
            pdf.text('Результати:', ML, y);
            y += 4;
            autoTable(pdf, {
                startY: y,
                head: [['Результат', 'Що означає']],
                body: model.results.map(([n, d]: string[]) => [n, d]),
                theme: 'grid',
                styles:     { font: 'Roboto', fontSize: 8.5, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.2 },
                headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold' },
                bodyStyles: { fillColor: [255,255,255] },
                columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
                margin: { left: ML, right: MR },
            });
            y = (pdf as any).lastAutoTable?.finalY ? (pdf as any).lastAutoTable.finalY + 3 : y + 25;

            // Примітка
            checkPage(10);
            pdf.setFont('Roboto', 'bold'); pdf.setFontSize(9);
            pdf.text('Примітка:', ML, y);
            pdf.setFont('Roboto', 'normal');
            const tlines = pdf.splitTextToSize(model.tip, TW - 24);
            pdf.text(tlines, ML + 24, y);
            y += tlines.length * 4 + 3;

            // роздільник між моделями
            pdf.setDrawColor(180); pdf.setLineWidth(0.2);
            pdf.line(ML, y, W - MR, y);
            pdf.setDrawColor(0);
            y += 8;
        });

        footer();
    });

    pdf.save(`Analytics_Guide_${Date.now().toString().slice(-6)}.pdf`);
};
