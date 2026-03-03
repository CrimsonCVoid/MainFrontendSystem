import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, degrees } from 'pdf-lib'

export class PDF_Exporter {
    PDF: PDFDocument;
    // CurrentPage: PDFPage;
    PageIndex = 0;
    Pages: PDFPage[] = [];
    CurrentFont!: PDFFont;
    Scale: number = .5;
    constructor(pdf: PDFDocument) {
        this.PDF = pdf;
        this.Pages.push(this.PDF.addPage([600, 800]));
    }

    static async Create() {
        const PDF = await PDFDocument.create();
        let Exporter = new PDF_Exporter(PDF);
        Exporter.CurrentFont = await PDF.embedFont(StandardFonts.Helvetica)
        return Exporter;
    }

    async Download() {
        const pdfBytes = await this.PDF.save();

        const blob = new Blob([pdfBytes], { type: "application/pdf" })
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "test.pdf"; //filename ?? `Estimate_${data.projectName.replace(/\s+/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return pdfBytes
    }

    NextPage() {
        this.Pages.push(this.PDF.addPage([600, 800]));
        this.PageIndex = this.Pages.length - 1;
    }

    DrawLine(X0: number, Y0: number, X1: number, Y1: number, RGB: { r: number, g: number, b: number } = { r: 0, g: 0, b: 0 }, Opacity = .1) {
        this.Pages[this.PageIndex].drawLine({
            start: { x: X0, y: Y0 },
            end: { x: X1, y: Y1 },
            thickness: 1,
            color: rgb(RGB.r, RGB.g, RGB.b),
            opacity: Opacity,
        })
    }

    AddText(Text: string, X: number, Y: number, Rotate: number = 0, TextSize: number = 6, AddHeight: number = 0, Opacity = .1) {
        let Width = -this.CurrentFont.widthOfTextAtSize(Text, TextSize) / 2;
        let Height = AddHeight - this.CurrentFont.heightAtSize(TextSize) / 2;
        this.Pages[this.PageIndex].drawText(Text, {
            x: X * this.Scale + 300 + Width * Math.cos(Rotate * Math.PI / 180) - Height * Math.sin(Rotate * Math.PI / 180),
            y: Y * this.Scale + 400 + Width * Math.sin(Rotate * Math.PI / 180) + Height * Math.cos(Rotate * Math.PI / 180),
            size: TextSize,
            rotate: degrees(Rotate),
            font: this.CurrentFont,
            color: rgb(0, 0, 0),
            opacity: Opacity,
        })
    }

    DrawLineFromV3(Start: { x: number, z: number }, End: { x: number, z: number }, RGB: { r: number, g: number, b: number } = { r: 0, g: 0, b: 0 }, Opacity = .1) {
        let X0 = Start.x * this.Scale + 300;
        let Y0 = Start.z * this.Scale + 400;
        let X1 = End.x * this.Scale + 300;
        let Y1 = End.z * this.Scale + 400;
        this.DrawLine(X0, Y0, X1, Y1, RGB, Opacity);
    }
}