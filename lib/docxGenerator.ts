import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType, VerticalAlign, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { startOfWeek, addDays, format, getWeek, getYear, getMonth } from "date-fns";

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
    const weekNum = getWeek(selectedDate, { weekStartsOn: 1 });

    const titleText = `${year} 년 ${month} 월 ${weekNum} 주차 ${format(start, "M 월 d 일")}부터 ${format(friday, "M 월 d 일")}까지`;

    const createCell = (text: string, bold = false, align = AlignmentType.CENTER, shading = "") => {
        return new TableCell({
            children: [
                new Paragraph({
                    children: [new TextRun({ text, bold, size: 22, font: "맑은 고딕" })],
                    alignment: align,
                }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            shading: shading ? { fill: shading } : undefined,
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
        });
    };

    const createBulletCell = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        return new TableCell({
            children: lines.length > 0 ? lines.map(line =>
                new Paragraph({
                    text: line,
                    bullet: { level: 0 },
                })
            ) : [new Paragraph("")],
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
        });
    };

    const headerRow = new TableRow({
        children: [
            createCell("본부 및 팀", true, AlignmentType.CENTER, "F3F4F6"),
            createCell("프로젝트", true, AlignmentType.CENTER, "F3F4F6"),
            createCell(`전주 진행사항\n(${format(addDays(start, -7), "MM/dd")}~${format(addDays(start, -3), "MM/dd")})`, true, AlignmentType.CENTER, "F3F4F6"),
            createCell(`금주 진행사항\n(${format(start, "MM/dd")}~${format(friday, "MM/dd")})`, true, AlignmentType.CENTER, "F3F4F6"),
            createCell("비고", true, AlignmentType.CENTER, "F3F4F6"),
        ],
        tableHeader: true,
    });

    const rows = items.map(item => new TableRow({
        children: [
            createCell(item.division),
            createCell(item.project),
            createBulletCell(item.prev_progress),
            createBulletCell(item.curr_progress),
            createCell(item.remarks),
        ],
    }));

    if (rows.length === 0) {
        rows.push(new TableRow({
            children: [createCell(""), createCell(""), createCell(""), createCell(""), createCell("")]
        }));
    }

    const table = new Table({
        rows: [headerRow, ...rows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "BFDBFE" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFDBFE" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "BFDBFE" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "BFDBFE" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "BFDBFE" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "BFDBFE" },
        }
    });

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 720,
                        bottom: 720,
                        left: 720,
                        right: 720,
                    },
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
