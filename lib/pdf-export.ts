import { PDFDocument, PDFPage, rgb } from 'pdf-lib'

export class PDF_Exporter {
    PDF: PDFDocument;
    CurrentPage: PDFPage;
    constructor(pdf: PDFDocument) {
        this.PDF = pdf;
        this.CurrentPage = this.PDF.addPage([600, 800]);
    }

    static async Create() {
        const PDF = await PDFDocument.create();
        return new PDF_Exporter(PDF);
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

    DrawLine(X0: number, Y0: number, X1: number, Y1: number) {
        this.CurrentPage.drawLine({
            start: { x: X0, y: Y0 },
            end: { x: X1, y: Y1 },
            thickness: 2,
            color: rgb(0, 0, 0),
        })
    }

    DrawLineFromV3(Start: { x: number, z: number }, End: { x: number, z: number }, RGB: { r: number, g: number, b: number } = { r: 0, g: 0, b: 0 }) {
        let Scale = 2;
        let X0 = Start.x / Scale + 300;
        let Y0 = Start.z / Scale + 400;
        let X1 = End.x / Scale + 300;
        let Y1 = End.z / Scale + 400;
        this.CurrentPage.drawLine({
            start: { x: X0, y: Y0 },
            end: { x: X1, y: Y1 },
            thickness: 2,
            color: rgb(RGB.r, RGB.g, RGB.b),
        })
    }
}