import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType, VerticalAlign, BorderStyle, PageOrientation } from "docx";
import { saveAs } from "file-saver";
import { startOfWeek, addDays, format, getWeek, getYear, getMonth, getWeekOfMonth } from "date-fns";

// Re-defining interface here to avoid circular dependencies or complex imports
interface ReportItem {
    id: string;
    division: string;
    project: string;
    prev_progress: string;
    curr_progress: string;
    remarks: string;
}

interface WeeklyReport {
    selectedDate: Date;
    items: ReportItem[];
}

export const generateDocx = (report: WeeklyReport) => {
    const { selectedDate, items } = report;
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    const friday = addDays(start, 4);

    const year = getYear(selectedDate);
    const month = getMonth(selectedDate) + 1;
    const weekNum = getWeekOfMonth(selectedDate, { weekStartsOn: 1 });

    const titleText = `${year}년 ${month}월 ${weekNum}주차 (${format(start, "MM.dd")} ~ ${format(friday, "MM.dd")})`;

    const createCell = (text: string, widthPercent: number, bold = false, align = AlignmentType.CENTER, shading = "") => {
        return new TableCell({
            children: [
                new Paragraph({
                    children: [new TextRun({ text, bold, size: 24 })],
                    alignment: align,
                }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            width: {
                size: widthPercent,
                type: WidthType.PERCENTAGE,
            },
            shading: shading ? { fill: shading } : undefined,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
        });
    };

    const createBulletCell = (text: string, widthPercent: number) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        return new TableCell({
            children: lines.length > 0 ? lines.map(line =>
                new Paragraph({
                    text: line,
                    bullet: { level: 0 },
                })
            ) : [new Paragraph("")],
            verticalAlign: VerticalAlign.CENTER,
            width: {
                size: widthPercent,
                type: WidthType.PERCENTAGE,
            },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
        });
    };

    const headerRow = new TableRow({
        children: [
            createCell("본부 및 팀", 10, true, AlignmentType.CENTER, "F3F4F6"),
            createCell("프로젝트", 15, true, AlignmentType.CENTER, "F3F4F6"),
            createCell(`전주 진행사항\n(${format(addDays(start, -7), "MM/dd")}~${format(addDays(start, -3), "MM/dd")})`, 30, true, AlignmentType.CENTER, "F3F4F6"),
            createCell(`금주 진행사항\n(${format(start, "MM/dd")}~${format(friday, "MM/dd")})`, 30, true, AlignmentType.CENTER, "F3F4F6"),
            createCell("비고", 15, true, AlignmentType.CENTER, "F3F4F6"),
        ],
        tableHeader: true,
    });

    const rows = items.map(item => new TableRow({
        children: [
            createCell(item.division, 10),
            createCell(item.project, 15),
            createBulletCell(item.prev_progress, 30),
            createBulletCell(item.curr_progress, 30),
            createCell(item.remarks, 15),
        ],
    }));

    if (rows.length === 0) {
        rows.push(new TableRow({
            children: [
                createCell("", 10),
                createCell("", 15),
                createCell("", 30),
                createCell("", 30),
                createCell("", 15)
            ]
        }));
    }

    const table = new Table({
        rows: [headerRow, ...rows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [10, 15, 30, 30, 15].map(w => w * 100), // Approximate twips or raw sizing, though WidthType.PERCENTAGE cells usually handle it
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        }
    });

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    size: {
                        orientation: PageOrientation.LANDSCAPE,
                    },
                    margin: {
                        top: 1000,
                        bottom: 1000,
                        left: 1000,
                        right: 1000,
                    }
                },
            },
            children: [
                new Paragraph({
                    children: [new TextRun({ text: titleText, size: 32, bold: true })],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 300 },
                }),
                table,
            ],
        }],
    });

    Packer.toBlob(doc).then((blob) => {
        saveAs(blob, `주간보고_${format(start, "yyyyMMdd")}.docx`);
    });
};
