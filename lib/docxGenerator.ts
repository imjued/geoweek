import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType, VerticalAlign, BorderStyle, PageOrientation } from "docx";
import { saveAs } from "file-saver";
import { startOfWeek, addDays, format } from "date-fns";

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

    // Calculate year, month, and week of month based on Thursday of the week (Korean standard)
    const thursday = addDays(start, 3);
    const year = thursday.getFullYear();
    const month = thursday.getMonth() + 1;
    const weekNum = Math.ceil(thursday.getDate() / 7);

    const startMonth = format(start, "M");
    const startDate = format(start, "d");
    const endMonth = format(friday, "M");
    const endDate = format(friday, "d");

    const titleText = `${year} 년 ${month} 월 ${weekNum} 주차 ${startMonth} 월 ${startDate} 일부터 ${endMonth} 월 ${endDate} 일`;

    const widths = [12, 18, 35, 25, 10]; // Percentage column widths

    const createCell = (text: string, bold = false, align = AlignmentType.CENTER, shading = "", widthPercent?: number) => {
        const lines = text.split('\n');
        const children: TextRun[] = [];
        lines.forEach((line, index) => {
            children.push(new TextRun({
                text: line,
                bold,
                size: 20, // 10pt
                font: "맑은 고딕",
                break: index > 0 ? 1 : undefined,
            }));
        });
        return new TableCell({
            children: [
                new Paragraph({
                    children,
                    alignment: align,
                }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            shading: shading ? { fill: shading } : undefined,
            margins: { top: 140, bottom: 140, left: 120, right: 120 },
            width: widthPercent !== undefined ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
        });
    };

    const createBulletCell = (text: string, widthPercent?: number) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const children = lines.length > 0 ? lines.map(line =>
            new Paragraph({
                children: [
                    new TextRun({
                        text: line,
                        font: "맑은 고딕",
                        size: 20, // 10pt
                    })
                ],
                bullet: { level: 0 },
                spacing: { before: 80, after: 80, line: 360 },
                indent: { left: 288, hanging: 288 },
            })
        ) : [
            new Paragraph({
                children: [
                    new TextRun({
                        text: "",
                        font: "맑은 고딕",
                        size: 20,
                    })
                ],
                bullet: { level: 0 },
                spacing: { before: 80, after: 80, line: 360 },
                indent: { left: 288, hanging: 288 },
            })
        ];

        return new TableCell({
            children,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 120, bottom: 120, left: 100, right: 100 },
            width: widthPercent !== undefined ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
        });
    };

    const headerRow = new TableRow({
        children: [
            createCell("본부 및 팀", true, AlignmentType.CENTER, "", widths[0]),
            createCell("프로젝트", true, AlignmentType.CENTER, "", widths[1]),
            createCell(`전주 진행사항\n(${format(addDays(start, -7), "MM/dd")}~${format(addDays(start, -3), "MM/dd")})`, true, AlignmentType.CENTER, "", widths[2]),
            createCell(`금주 진행사항\n(${format(start, "MM/dd")}~${format(friday, "MM/dd")})`, true, AlignmentType.CENTER, "", widths[3]),
            createCell("비고", true, AlignmentType.CENTER, "", widths[4]),
        ],
        tableHeader: true,
    });

    const rows = items.map(item => new TableRow({
        children: [
            createCell(item.division, false, AlignmentType.CENTER, "", widths[0]),
            createCell(item.project, false, AlignmentType.CENTER, "", widths[1]),
            createBulletCell(item.prev_progress, widths[2]),
            createBulletCell(item.curr_progress, widths[3]),
            createBulletCell(item.remarks, widths[4]),
        ],
    }));

    if (rows.length === 0) {
        rows.push(new TableRow({
            children: [
                createCell("", false, AlignmentType.CENTER, "", widths[0]),
                createCell("", false, AlignmentType.CENTER, "", widths[1]),
                createBulletCell("", widths[2]),
                createBulletCell("", widths[3]),
                createBulletCell("", widths[4]),
            ]
        }));
    }

    const table = new Table({
        rows: [headerRow, ...rows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "BFDBFE" },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "BFDBFE" },
            left: { style: BorderStyle.SINGLE, size: 4, color: "BFDBFE" },
            right: { style: BorderStyle.SINGLE, size: 4, color: "BFDBFE" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "BFDBFE" },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "BFDBFE" },
        }
    });

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    size: {
                        orientation: PageOrientation.LANDSCAPE,
                        width: 11906,
                        height: 16838,
                    },
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
                    children: [new TextRun({ text: titleText, size: 32, bold: true, font: "맑은 고딕" })],
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
