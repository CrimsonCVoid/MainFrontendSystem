import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, degrees, LineCapStyle, BlendMode, PDFImage } from 'pdf-lib'

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

    DrawLine(X0: number, Y0: number, X1: number, Y1: number, RGB = { r: 0, g: 0, b: 0, a: 1 }) {
        this.Pages[this.PageIndex].drawLine({
            start: { x: X0, y: Y0 },
            end: { x: X1, y: Y1 },
            thickness: 1,
            lineCap: LineCapStyle.Round,
            blendMode: BlendMode.Normal,
            color: rgb(RGB.r, RGB.g, RGB.b),
            opacity: RGB.a,
        })
    }

    AddText(Text: string, X: number, Y: number, Rotate: number = 0, TextSize: number = 6, AddHeight: number = 0, Opacity = 1) {
        let Width = -this.CurrentFont.widthOfTextAtSize(Text, TextSize) / 2;
        let Height = AddHeight - this.CurrentFont.heightAtSize(TextSize) / 2;
        let TrueX = X + Width * Math.cos(Rotate * Math.PI / 180) - Height * Math.sin(Rotate * Math.PI / 180);
        let TrueY = Y + Width * Math.sin(Rotate * Math.PI / 180) + Height * Math.cos(Rotate * Math.PI / 180);
        if (TrueX != TrueX || TrueY != TrueY) return;
        this.Pages[this.PageIndex].drawText(Text, {
            x: TrueX,
            y: TrueY,
            size: TextSize,
            rotate: degrees(Rotate),
            font: this.CurrentFont,
            color: rgb(0, 0, 0),
            opacity: Opacity,
            // maxWidth: 3,
        })
    }

    AddTextAtV3(Text: string, Pos: { x: number, z: number }, Rotate: number = 0, TextSize: number = 6, AddHeight: number = 0, Opacity = 1) {
        this.AddText(Text, Pos.z * this.Scale + 300, -Pos.x * this.Scale + 400, Rotate + 90, TextSize, AddHeight, Opacity);
    }

    DrawLineFromV3(Start: { x: number, z: number }, End: { x: number, z: number }, RGB = { r: 0, g: 0, b: 0, a: 1 }) {
        let X0 = Start.z * this.Scale + 300;
        let Y0 = -Start.x * this.Scale + 400;
        let X1 = End.z * this.Scale + 300;
        let Y1 = -End.x * this.Scale + 400;
        this.DrawLine(X0, Y0, X1, Y1, RGB);
    }

    EmbedImages: PDFImage[] = [];

    async AddImage(pngBytes) {
        this.EmbedImages.push(await this.PDF.embedPng(pngBytes));
        return this.EmbedImages.length - 1;
    }

    DrawImage(ImageIndex: number, OffsetX = 0, OffsetY = 0) {
        let page = this.Pages[this.PageIndex];
        let pngImage = this.EmbedImages[ImageIndex];
        const drawW = pngImage.width / this.Scale;
        const drawH = pngImage.height / this.Scale;

        page.drawImage(pngImage, {
            x: (page.getWidth() - drawW) / 2 + OffsetX,
            y: (page.getHeight() - drawH) / 2 + OffsetY,
            width: drawW,
            height: drawH,
        })
    }

    DrawingsInOrder = new DataDrawings();

    ExecuteOrder66() {
        this.DrawingsInOrder.DrawTypes.sort((a, b) => a.Order - b.Order);
        for (let DrawingType of this.DrawingsInOrder.DrawTypes)
            for (let Drawing of DrawingType.Draws)
                Drawing.Execute(this);
    }
}

class Draw {
    DrawingType: DrawType;
    Points: { x: number, z: number }[] = [];
    Text?: string; // : { String: string, Rotate?: number }; // Size?: number, HeightOffset?: number };
    // TextSize: number = 8;
    // TextHeightOffset: number = 0;
    TextRotate: number = 0;
    SketchID: string = "";
    LineID: string = "";
    constructor(DrawingType: DrawType, SketchID: string, LineID: string, Points: { x: number, z: number }[]) {
        this.DrawingType = DrawingType;
        this.SketchID = SketchID;
        this.LineID = LineID;
        this.Points = Points;
    }
    Draw(ThisPDF: PDF_Exporter) {
        if (this.Points.length == 0) return;
        if (this.Points.length > 1)
            for (let PointIndex = 0; PointIndex < this.Points.length; PointIndex++)
                if (!(PointIndex == 1 && PointIndex == this.Points.length - 1))
                    ThisPDF.DrawLineFromV3(this.Points[PointIndex], this.Points[(PointIndex + 1) % this.Points.length], this.DrawingType.Color);
        if (!this.Text) return;
        let AveragePosition = { x: 0, z: 0 };
        this.Points.forEach(value => { AveragePosition.x += value.x; AveragePosition.z += value.z });
        AveragePosition.x /= this.Points.length; AveragePosition.z /= this.Points.length;
        ThisPDF.AddTextAtV3(this.Text, AveragePosition, this.TextRotate ?? 0, this.DrawingType.TextSize ?? 8, this.DrawingType.TextHeightOffset ?? 0, .5);
    }
    Execute(ThisPDF: PDF_Exporter) {
        for (let Layer of this.DrawingType.Layers) {
            ThisPDF.PageIndex = Layer;
            this.Draw(ThisPDF);
        }
    }
}

class DrawType {
    Order: number = -1;
    Type: string = "UNKNOWN";
    Layers: number[] = [];
    Color: { r: number, g: number, b: number, a: number } = { r: 0, g: 0, b: 0, a: 1 };
    TextSize: number = 8;
    TextHeightOffset: number = 0;
    Draws: Draw[] = [];
    constructor(Type: string, Order: number, Layers: number[], Color?: { r: number, g: number, b: number, a: number }) {
        this.Type = Type;
        this.Order = Order;
        this.Layers = Layers;
        if (Color) this.Color = Color;
    }
    AddLine(SketchID: string, LineID: string, ...Points: { x: number, z: number }[]) {
        let NewLine = new Draw(this, SketchID, LineID, Points);
        NewLine.Points = Points;
        this.Draws.push(NewLine);
    }
    AddDraw(SketchID: string, LineID: string, Text?: string, TextRotate?: number, ...Points: { x: number, z: number }[]) {
        let NewLine = new Draw(this, SketchID, LineID, Points);
        NewLine.Text = Text;
        NewLine.TextRotate = TextRotate ?? 0;
        this.Draws.push(NewLine);
    }
}

class DataDrawings {
    DrawTypes: DrawType[] = [];
    EstablishType(Type: string, Order: number, Layers: number[], Color?: { r: number, g: number, b: number, a: number }) {
        let DrawingType = new DrawType(Type, Order, Layers, Color);
        this.DrawTypes.push(DrawingType);
        return DrawingType;
    }
    AddLine(SketchID: number, LineID: number, Type: string, Point0: { x: number, z: number }, Point1: { x: number, z: number }) {

    }
}