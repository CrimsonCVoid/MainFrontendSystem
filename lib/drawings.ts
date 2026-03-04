/* eslint-disable prefer-const */
import * as BABYLON from "@babylonjs/core";
import { CFrame, segmentIntersection2D, Vector3 } from "./positioning";
import { Editor } from "./editor";
import * as BABYLON_EARCUT from "./earcut";
import * as PDF_EXPORTER from "./pdf-export";

Vector3.prototype.ToBabylon = function () { return new BABYLON.Vector3(this.X, this.Y, this.Z); };
Vector3.prototype.ToBabylonXZY = function () { return new BABYLON.Vector3(this.X, this.Z, this.Y); };

CFrame.prototype.ToBabylon = function () {
    var Q = this.ToQuaternion();
    return [this.Position.ToBabylon(), new BABYLON.Quaternion(Q[0], Q[1], Q[2], Q[3])];
}

BABYLON.Vector3.prototype.PointOnSegment = Vector3.prototype.PointOnSegment;
BABYLON.Vector3.prototype.PointInPolygon = Vector3.prototype.PointInPolygon;
// BABYLON.Vector3.prototype.TranslateAdd = Vector3.prototype.TranslateAdd;
// BABYLON.Vector3.prototype.TranslateSub = Vector3.prototype.TranslateSub;

BABYLON.Vector3.prototype.ToCustom = function () { return new Vector3(this.x, this.y, this.z); };
BABYLON.Vector3.prototype.Lerp = function (B: BABYLON.Vector3, Alpha: number) { return this.add(B.subtract(this).scale(Alpha)); };
BABYLON.Vector3.prototype.DistanceFromPoint = Vector3.prototype.DistanceFromPoint;

type LineSettingsPeanut = {
    points: BABYLON.Vector3[];
    updatable?: boolean | undefined;
    instance?: BABYLON.Nullable<BABYLON.LinesMesh> | undefined;
    colors?: BABYLON.Color4[] | undefined;
    useVertexAlpha?: boolean | undefined;
    material?: BABYLON.Material | undefined;
}

type PolygonSettingsPeanut = {
    shape: BABYLON.Vector3[];
    holes?: BABYLON.Vector3[][];
    depth?: number;
    smoothingThreshold?: number;
    faceUV?: BABYLON.Vector4[];
    faceColors?: BABYLON.Color4[];
    updatable?: boolean;
    sideOrientation?: number;
    frontUVs?: BABYLON.Vector4;
    backUVs?: BABYLON.Vector4;
    wrap?: boolean;
}

type ExtrudedPolygonSettingsPeanut = {
    shape: BABYLON.Vector3[];
    path: BABYLON.Vector3[];
    scaleFunction?: BABYLON.Nullable<{ (i: number, distance: number): number; }>;
    rotationFunction?: BABYLON.Nullable<{ (i: number, distance: number): number; }>;
    ribbonCloseArray?: boolean;
    ribbonClosePath?: boolean;
    closeShape?: boolean;
    closePath?: boolean;
    cap?: number;
    updatable?: boolean;
    sideOrientation?: number;
    frontUVs?: BABYLON.Vector4;
    backUVs?: BABYLON.Vector4;
    instance?: BABYLON.Mesh;
    invertUV?: boolean;
    firstNormal?: BABYLON.Vector3;
    adjustFrame?: boolean;
    capFunction?: BABYLON.Nullable<{ (shapePath: BABYLON.Vector3[]): BABYLON.Vector3[]; }>;
};

function MapToReal(Size: Vector3, V3: Vector3) { return CFrame.fromVector3(Size.Scale(1 / 2)).ToWorldSpace(CFrame.fromVector3(V3.TranslateSub(Size.Scale(1 / 2)))); };
// function MapToFlat(V3) { return (CFrame.Angles(0, 0, Math.PI / 2).ToWorldSpace(FocusCF.ToObjectSpace(MapToReal(V3)))); };
function MapToFlat(FocusCF: CFrame, Size: Vector3, V3: Vector3) { return FocusCF.ToWorldSpace(CFrame.Angles(0, 0, -Math.PI / 2)).ToObjectSpace(MapToReal(Size, V3)); };


function MapPolyToSurface(SurfID, FocusCF, Size, Points) {

};

let SelectedProfile = "R"; // "StandingSeam";

let PanelProfiles = {
    "PBR": {
        PanelLength: 12,
        Overlap: 0, // .125 * 5 / 2,
        Shape: [
            [3.3125, 1.25, 1],
            [1.875],
            [1.4375, .1875, .75],
            [2.0625],
            [1.4375, .1875, .75],
            [1.875],
            // [3.3125, 1.25, 1],
        ]
    },
    "StandingSeam": {
        PanelLength: 16,
        Overlap: 0, // .125 * 5 / 2,
        Shape: [
            [.5, .875, .25],
            [16 - .5],
            // [.5, .875, .25],
        ]
    },
    "5V": {
        PanelLength: 24,
        Overlap: 0, // .125 * 5 / 2,
        Shape: [
            [1, .5, 0],
            [1, .5, 0],
            [10.5],
            [1, .5, 0],
            [10.5],
            // [1, .5, 0],
            // [1, .5, 0],
        ]
    },
    "R": {
        PanelLength: 9,
        Overlap: 0, // .125 * 5 / 2,
        Shape: [
            // [.75, .75, .5, 0],
            [.2, .6, 0, 0],
            [.175],
            [.25, .15, .25],
            [.175],
            [.2, 0, 0, .6],
            [2],
            [1, .15, .75],
            [2.5],
            [1, .15, .75],
            [2],
            // [.25, .6, 0, 0],
            // [.125],
            // [.25, .15, .125],
            // [.125],
            // [.25, -.6, 0, 0],
        ]
    }
};

// Outer, Extrude Up, Inner, Extrude Down //

// let SketchDirection = new CFrame();
export class ExtrusionLines {
    ActiveEditor: Editor;
    ExtrudedLine: ExtrudedLine;
    LineA: BABYLON.LinesMesh;
    LineB: BABYLON.LinesMesh;
    LineASettings: LineSettingsPeanut;
    LineBSettings: LineSettingsPeanut;

    Polygon: BABYLON.Mesh;
    PolygonSettings: PolygonSettingsPeanut;

    PanelSettings: ExtrudedPolygonSettingsPeanut;

    Panels: ExtrudedPolygonSettingsPeanut[] = [];

    FocusCF: CFrame;

    constructor(ExtrudedLine: ExtrudedLine) {
        this.ActiveEditor = ExtrudedLine.ActiveEditor;
        this.ExtrudedLine = ExtrudedLine;

        let V0 = ExtrudedLine.FocusSketchLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 0 : 1];
        let V1 = ExtrudedLine.FocusSketchLine.LineSettings.points[ExtrudedLine.FocusPoint1 == "V0" ? 0 : 1];

        this.LineASettings = { points: [ExtrudedLine.FocusPoint0 == "V0" ? V1 : V0, ExtrudedLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 1 : 0]], updatable: true };
        this.LineASettings.instance = this.LineA = BABYLON.MeshBuilder.CreateLines("LINE", this.LineASettings, this.ActiveEditor.Scene);
        this.LineA.color = new BABYLON.Color3(0, 1, 1);
        // this.LineA.isVisible = false;


        this.LineBSettings = { points: [ExtrudedLine.FocusPoint0 == "V0" ? V0 : V1, ExtrudedLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 0 : 1]], updatable: true };
        this.LineBSettings.instance = this.LineB = BABYLON.MeshBuilder.CreateLines("LINE", this.LineBSettings, this.ActiveEditor.Scene);
        this.LineB.color = new BABYLON.Color3(0, 1, 1);

        this.PolygonSettings = { sideOrientation: BABYLON.Mesh.DOUBLESIDE, shape: [this.LineASettings.points[0], this.LineASettings.points[1], this.LineBSettings.points[1], this.LineBSettings.points[0]], updatable: true };
        this.PanelSettings = {
            shape: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 0)], path: [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, 0, 1e-6),
                // new BABYLON.Vector3(0, 0, 10),
                // new BABYLON.Vector3(0, 0, -Size.Z),
                // new BABYLON.Vector3(0, 0, -Size.Z + .001),
            ],
            cap: BABYLON.Mesh.CAP_END,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE, // DEFAULTSIDE,
            updatable: true,
        };
        Editor.meshesRef.current.push([this.PanelSettings, "PANEL"]);

        this.MAT = new BABYLON.StandardMaterial("material", this.ActiveEditor.Scene);
        // this.MAT.diffuseColor =
        //     this.ExtrudedLine.Angle == 0 ? new BABYLON.Color3(1, 0, 0) : // "0" //
        //         this.ExtrudedLine.Angle == 90 ? new BABYLON.Color3(0, 1, 0) : // "A" //
        //             this.ExtrudedLine.Angle == 180 ? new BABYLON.Color3(0, 0, 1) : // "1" //
        //                 this.ExtrudedLine.Angle == 270 ? new BABYLON.Color3(1, 1, 1) : // "B" //
        //                     new BABYLON.Color3(0, 0, 0); // this.ExtrudedLine.IsParallel ? new BABYLON.Color3(0, 0, 1) : new BABYLON.Color3(1, 0, 0);
        // this.MAT.diffuseColor =
        //     this.ExtrudedLine.ID == "0" ? new BABYLON.Color3(1, 0, 0) :
        //         this.ExtrudedLine.ID == "A" ? new BABYLON.Color3(0, 1, 0) :
        //             this.ExtrudedLine.ID == "1" ? new BABYLON.Color3(0, 0, 1) :
        //                 this.ExtrudedLine.ID == "B" ? new BABYLON.Color3(1, 1, 1) :
        //                     new BABYLON.Color3(0, 0, 0); // this.ExtrudedLine.IsParallel ? new BABYLON.Color3(0, 0, 1) : new BABYLON.Color3(1, 0, 0);
    }

    Zonings: Vector3[][] = [];

    UpdateForZonings() {
        if (!this.ExtrudedLine.Line) return;
        // TEMP //
        if (this.Zonings.length == 0) return;
        this.UpdatePanelMesh();
        // let Local1 = this.Zonings[0][1];
        // let Local2 = this.Zonings[1][1];
        // let LocalBounds = Vector3.Bounds([Local1, Local2]);
        // let AdjustX = LocalBounds[0].X - (LocalBounds[1].X - LocalBounds[0].X);
        // let Height = LocalBounds[1].Y; // this.SketchExtrusionLines.GetHeightAtX(AdjustX + this.ExtrudeA); // + this.GetTopY(); // LocalBounds[1].Y; // this.SketchExtrusionLines.GetHeightAtZ(LocalBounds[1].Z); // + this.GetTopY();
        // BABYLON.MeshBuilder.CreateLines("e", {
        //     points: [
        //         this.ExtrudedLine.CF0.ToWorldSpace(CFrame.fromXYZ(LocalBounds[1].X, LocalBounds[1].Y, LocalBounds[1].Z)).Position.ToBabylon(),
        //         this.ExtrudedLine.CF0.ToWorldSpace(CFrame.fromXYZ(AdjustX, Height, LocalBounds[1].Z)).Position.ToBabylon(),
        //     ]
        // }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);
        // // BABYLON.MeshBuilder.CreateLines("e", {
        // //     points: [
        // //         this.CF0.ToWorldSpace(CFrame.fromXYZ(LocalBounds[0].X, LocalBounds[1].Y, LocalBounds[1].Z)).Position.ToBabylon(),
        // //         this.CF0.ToWorldSpace(CFrame.fromXYZ(LocalBounds[0].X, LocalBounds[1].Y, LocalBounds[0].Z - (LocalBounds[1].Z - LocalBounds[0].Z))).Position.ToBabylon(),
        // //     ]
        // // }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 0);
        // // this.SketchExtrusionLines.UpdatePanelMesh();
        // console.log(Local1, Local2);
    }

    UpdatePanelMesh() {
        let MainLength = this.ExtrudedLine.Length;
        let BottomLength = MainLength + this.ExtrudedLine.ExtrudeA + this.ExtrudedLine.ExtrudeB;
        let ExtrudeLength = (this.ExtrudedLine.RISE ** 2 + this.ExtrudedLine.RUN ** 2) ** .5;

        let PanelThickness = 0 * .0179;
        // shape.push(new BABYLON.Vector3(-X, 0, 0));

        let SelectedPanelData = PanelProfiles[SelectedProfile];
        let PanelLength = SelectedPanelData.PanelLength; // 36;
        let MaxPanels = Math.ceil(BottomLength / PanelLength);

        let shape = []; // new BABYLON.Vector3(0, 0, 0)];

        let X = SelectedPanelData.Overlap; // 0; // -PBR_Panel[0][0] / 2;
        let Y = PanelThickness + 0;  // .1;

        for (let i = 0; i < MaxPanels; i++) {
            for (let P of SelectedPanelData.Shape) {
                let Outer = P[0];
                let Extrude = P.length > 1 ? P[1] : 0;
                let Inner = P.length > 2 ? P[2] : 0;
                let ExtrudeUndo = P.length > 3 ? P[3] : Extrude;
                if (X >= BottomLength) break;

                X += Outer / 2 - Inner / 2;
                Y += Extrude;
                shape.push(new BABYLON.Vector3(X, Y, 0));
                if (X >= BottomLength) break;

                X += Inner;
                if (Inner != 0) shape.push(new BABYLON.Vector3(X, Y, 0));
                if (X >= BottomLength) break;

                X += Outer / 2 - Inner / 2;
                Y -= ExtrudeUndo;
                if (ExtrudeUndo != 0 || (Outer - Inner) != 0) shape.push(new BABYLON.Vector3(X, Y, 0));
                if (X >= BottomLength) break;
            };
        };

        if (shape.length != 0) shape[shape.length - 1].x = BottomLength; // Could handle the slope and stuff properly...

        PanelLength *= MaxPanels;

        this.PanelSettings?.instance?.dispose();
        delete this.PanelSettings?.instance;
        // this.PanelSettings = {
        this.PanelSettings.shape = shape;
        this.PanelSettings.capFunction = (shapePath: BABYLON.Vector3[]) => shapePath.map((v) => new BABYLON.Vector3(v.x, v.y + PanelThickness, -this.GetHeightAtX(v.x)));
        // cap: BABYLON.Mesh.CAP_END,
        // sideOrientation: BABYLON.Mesh.DOUBLESIDE, // DEFAULTSIDE,
        // updatable: true,
        // };
        let Panel = this.PanelSettings.instance = BABYLON.MeshBuilder.ExtrudeShape(`PANEL`, this.PanelSettings, this.ActiveEditor.Scene).convertToFlatShadedMesh(); // this.ActiveEditor.Scene);

        // Panel.position.set(i * 36, i * 36, 0);
        // i * 36 - this.ExtrudedLine.ExtrudeA
        // let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ(this.ExtrudedLine.ExtrudeA, PanelThickness, ExtrudeLength)).ToBabylon();
        let ANGLE = Math.atan2(this.ExtrudedLine.RISE, this.ExtrudedLine.RUN);
        let RoofAngle = CFrame.Angles(ANGLE, 0, 0);
        let FocusCF = this.ExtrudedLine.CF0.ToWorldSpace(CFrame.Angles(0, Math.PI, 0)).ToWorldSpace(RoofAngle);
        let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ(-this.ExtrudedLine.ExtrudeB - MainLength, PanelThickness, ExtrudeLength)).ToBabylon();
        Panel.position.set(P_BBL[0].x, P_BBL[0].y, P_BBL[0].z);
        Panel.rotationQuaternion = P_BBL[1]; //.copyFrom(this.BBL[1]);
        // Panel.material = this.MAT;
    }

    Update() {
        this.LineA = BABYLON.MeshBuilder.CreateLines("LINE", this.LineASettings);
        this.LineB = BABYLON.MeshBuilder.CreateLines("LINE", this.LineBSettings);
        this.Polygon?.dispose();

        let MainLength = this.ExtrudedLine.Length; // this.ExtrudedLine.IsParallel ? this.ExtrudedLine.CF0.Distance(this.ExtrudedLine.CF1) : 0;
        // let TopCF = CFrame.fromXYZ(MainLength, 0, 0);

        let ANGLE = Math.atan2(this.ExtrudedLine.RISE, this.ExtrudedLine.RUN);
        let RoofAngle = CFrame.Angles(ANGLE, 0, 0);
        // let RoofAngle = CFrame.Angles(Math.atan2(this.ExtrudedLine.PITCH, 12), 0, 0);
        // let RoofAngle = CFrame.Angles(Math.atan2(12, this.ExtrudedLine.PITCH), 0, 0);

        let ExtrudeLength = (this.ExtrudedLine.RISE ** 2 + this.ExtrudedLine.RUN ** 2) ** .5;

        let FlattenedPoints = [
            new Vector3(),
            new Vector3(this.ExtrudedLine.ExtrudeA, 0, ExtrudeLength),
            new Vector3(-MainLength - this.ExtrudedLine.ExtrudeB, 0, ExtrudeLength),
            new Vector3(-MainLength, 0, 0),
        ];

        // this.LineFSettings?.instance?.dispose();
        // this.LineFSettings = { points: FlattenedPoints, updatable: true };
        // this.LineFSettings.instance = this.LineF = BABYLON.MeshBuilder.CreateLines("LINE", this.LineFSettings, this.ActiveEditor.Scene);
        // this.LineF.color = new BABYLON.Color3(.5, 1, 1);

        // console.log("FlattenedPoints:", FlattenedPoints);

        let FocusCF = this.ExtrudedLine.CF0.ToWorldSpace(CFrame.Angles(0, Math.PI, 0)).ToWorldSpace(RoofAngle); // EdgeCF; // HeadingCF.Rotation.TranslateAdd(Averaged);


        let Bounds = Vector3.Bounds(FlattenedPoints);
        let Size = Bounds[1].TranslateSub(Bounds[0]);
        // console.log("Size:", Size, Math.atan2(this.ExtrudedLine.RISE, this.ExtrudedLine.RUN)); // , Math.atan2(this.ExtrudedLine.PITCH, 12));
        // let FlattenedPoints = [];
        // for (let Point of Points) {
        //     let FP = MapToFlat(FocusCF, Size, Point);
        //     FlattenedPoints.push(FP.Position.ToBabylon());
        // }
        // Size = 


        // BABYLON.MeshBuilder.ExtrudePolygon("POLY", this.PolygonSettings, null, BABYLON_EARCUT.earcut);
        this.PolygonSettings.shape = FlattenedPoints;
        // this.Polygon = BABYLON.MeshBuilder.CreatePolygon("POLY", this.PolygonSettings, null, BABYLON_EARCUT.earcut);
        // this.Polygon.material = this.MAT;
        // let NewCF = CFrame.lookAt(this.LineASettings.points[0].ToCustom().Average(this.LineBSettings.points[0].ToCustom()), this.LineASettings.points[1].ToCustom().Average(this.LineBSettings.points[1].ToCustom())); // FocusCF.ToWorldSpace(CFrame.Angles(0, 0, -Math.PI / 2)); // FocusCF; // CFrame.Angles(0, 0, -Math.PI / 2).ToWorldSpace(FocusCF); //.ToWorldSpace(Surface.FocusCF);
        this.FocusCF = FocusCF;
        let BBL = FocusCF.ToBabylon(); // I had to name this variable BBL. LOL
        this.BBL = BBL;
        // if (true) return;
        // if (!this.ExtrudedLine.ENABLED) {
        // this.Polygon = BABYLON.MeshBuilder.CreatePolygon("POLY", this.PolygonSettings, null, BABYLON_EARCUT.earcut);
        // this.Polygon.material = this.MAT;
        // this.Polygon.position.copyFrom(this.BBL[0]);
        // this.Polygon.rotationQuaternion = this.BBL[1];
        // this.PanelSettings?.instance?.dispose();
        // return;
        // };

        this.UpdatePanelMesh();
















        // if (this.ExtrudedLine.IsParallel) {
        // {
        //     this.TESTYSETTINGS?.instance?.dispose();
        //     this.TESTYSETTINGS = {
        //         shape: [
        //             new BABYLON.Vector3(0, 0, 0),
        //             new BABYLON.Vector3(-MainLength, 0, 0),
        //         ],
        //         path: [
        //             new BABYLON.Vector3(0, 1, 0),
        //             new BABYLON.Vector3(0, 1 - Math.sin(ANGLE) * 2, 2 * Math.cos(ANGLE)), // Math.cos(ANGLE) * 4),
        //             // new BABYLON.Vector3(0, Math.sin(ANGLE) * 4 - 2, 0),
        //             // new BABYLON.Vector3(0, Math.sin(ANGLE) * 4 - 4, Math.cos(ANGLE) * 4), // Math.cos(ANGLE) * 4),
        //         ],

        //         // capFunction: (shapePath: BABYLON.Vector3[]) => shapePath.map(v => new BABYLON.Vector3(v.x * 0, v.y * 1, v.z)),
        //         cap: BABYLON.Mesh.CAP_ALL,
        //         sideOrientation: BABYLON.Mesh.DOUBLESIDE, // DEFAULTSIDE,
        //         updatable: true,
        //     };
        //     let P_BBL = this.ExtrudedLine.CF0.ToWorldSpace(CFrame.Angles(0, -Math.PI / 2, 0)).ToBabylon(); // FocusCF.ToWorldSpace(CFrame.fromXYZ(0, PanelThickness, 0)).ToBabylon();
        //     this.TESTYSETTINGS.instance = BABYLON.MeshBuilder.ExtrudeShape(`PANEL`, this.TESTYSETTINGS, this.ActiveEditor.Scene).convertToFlatShadedMesh(); // this.ActiveEditor.Scene);
        //     this.TESTYSETTINGS.instance.position = P_BBL[0];
        //     this.TESTYSETTINGS.instance.rotationQuaternion = P_BBL[1];
        // }
        // };

        {
            //     this.TESTYSETTINGSSIDE?.instance?.dispose();
            //     this.TESTYSETTINGSSIDE = {
            //         shape: [
            //             new BABYLON.Vector3(-BottomLength / 2 + MainLength / 2, 0, 0),
            //             new BABYLON.Vector3(-BottomLength / 2 + MainLength / 2, 2, 0),
            //             new BABYLON.Vector3(BottomLength / 2 + MainLength / 2, 2, 0),
            //             new BABYLON.Vector3(BottomLength / 2 + MainLength / 2, 0, 0),
            //         ],
            //         path: [
            //             new BABYLON.Vector3(0, 2, 0),
            //             new BABYLON.Vector3(0, -2, 4),
            //         ],

            //         // capFunction: (shapePath: BABYLON.Vector3[]) => shapePath.map(v => new BABYLON.Vector3(v.x * 0, v.y * 1, v.z)),
            //         cap: BABYLON.Mesh.CAP_ALL,
            //         sideOrientation: BABYLON.Mesh.DOUBLESIDE, // DEFAULTSIDE,
            //         updatable: true,
            //     };
            //     let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ(0, PanelThickness + 10, ExtrudeLength)).ToBabylon(); // FocusCF.ToWorldSpace(CFrame.fromXYZ(0, PanelThickness, 0)).ToBabylon();
            //     this.TESTYSETTINGSSIDE.instance = BABYLON.MeshBuilder.ExtrudeShape(`PANEL`, this.TESTYSETTINGSSIDE, this.ActiveEditor.Scene).convertToFlatShadedMesh(); // this.ActiveEditor.Scene);
            //     this.TESTYSETTINGSSIDE.instance.position = P_BBL[0];
            //     this.TESTYSETTINGSSIDE.instance.rotationQuaternion = P_BBL[1];
        }

        {
            // this.TESTYSETTINGSSIDE?.instance?.dispose();
            // this.TESTYSETTINGSSIDE = {
            //     shape: [
            //         // new BABYLON.Vector3(0, 0, BottomLength / 2 + MainLength / 2),
            //         // new BABYLON.Vector3(0, ExtrudeLength, 0),
            //         // new BABYLON.Vector3(0, ExtrudeLength, 2),
            //         // new BABYLON.Vector3(0, 0,BottomLength / 2 + MainLength / 2 + 2),

            //         // new BABYLON.Vector3(0, BottomLength / 2 + MainLength / 2),
            //         // new BABYLON.Vector3(ExtrudeLength, 0),
            //         // new BABYLON.Vector3(ExtrudeLength, 2),
            //         // new BABYLON.Vector3(0, BottomLength / 2 + MainLength / 2 + 2),

            //         new BABYLON.Vector3(-BottomLength / 2 + MainLength / 2, 0, 0),
            //         new BABYLON.Vector3(0, ExtrudeLength, 0),
            //         new BABYLON.Vector3(2, ExtrudeLength, 0),
            //         new BABYLON.Vector3(-BottomLength / 2 + MainLength / 2 + 2, 0, 0),
            //         new BABYLON.Vector3(-BottomLength / 2 + MainLength / 2, 0, 0),


            //         // new BABYLON.Vector3(-BottomLength / 2 + MainLength / 2, 0, 0),

            //         // new BABYLON.Vector3(-BottomLength / 2 + MainLength / 2 + 8, 0, 0),
            //         // new BABYLON.Vector3(0, 0, ExtrudeLength - 8),

            //         // new BABYLON.Vector3(BottomLength / 2 + MainLength / 2 - 8, 0, 0),

            //         // new BABYLON.Vector3(BottomLength / 2 + MainLength / 2, 0, 0),
            //         // new BABYLON.Vector3(0, 0, ExtrudeLength),
            //         // // new BABYLON.Vector3(-BottomLength / 2 + MainLength / 2, 0, 0),
            //     ],
            //     path: [
            //         new BABYLON.Vector3(0, 0, 0),
            //         new BABYLON.Vector3(0, 0, 1.5),
            //     ],

            //     // capFunction: (shapePath: BABYLON.Vector3[]) => shapePath, // .map(v => new BABYLON.Vector3(v.x, v.y, v.z)),
            //     cap: BABYLON.Mesh.CAP_ALL,
            //     sideOrientation: BABYLON.Mesh.DOUBLESIDE, // DEFAULTSIDE,
            //     updatable: true,
            // };
            // let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ(0, PanelThickness, ExtrudeLength)).ToWorldSpace(CFrame.Angles(-Math.PI / 2, 0, 0)).ToBabylon(); // FocusCF.ToWorldSpace(CFrame.fromXYZ(0, PanelThickness, 0)).ToBabylon();
            // this.TESTYSETTINGSSIDE.instance = BABYLON.MeshBuilder.ExtrudeShape(`PANEL`, this.TESTYSETTINGSSIDE, this.ActiveEditor.Scene).convertToFlatShadedMesh(); // this.ActiveEditor.Scene);
            // this.TESTYSETTINGSSIDE.instance.position = P_BBL[0];
            // this.TESTYSETTINGSSIDE.instance.rotationQuaternion = P_BBL[1];


            // OVERLAPS (COMMONLY) BY 6 INCHES.
        }

        // PanelSettings.instance.convertToFlatShadedMesh();
        // PanelSettings.instance.optimizeIndices();

        // PanelSettings.instance.enableEdgesRendering();
        // PanelSettings.instance.edgesWidth = 8;
        // PanelSettings.instance.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

        // PanelSettings.instance.forceSharedVertices();
        // PanelSettings.instance.refreshBoundingInfo(); // true is an argument apparently?




        // let Max = this.Panels.length;
        // for (let i = MaxPanels; i < Max; i++) {
        //     // let PanelSettings = Max >= i + 1 ? this.Panels[i] : null;
        //     // if (!PanelSettings) continue;
        //     // delete this.Panels[i];
        //     this.Panels.pop()?.instance?.dispose();
        // };

        // Panels

        // BABYLON.MeshBuilder.ExtrudeShapeCustom("POLY",)
    }

    GetHeightAtX(X: number, Raw = false) {
        // return this.GetBottomAtX(X);
        let MainLength = this.ExtrudedLine.Length;
        let BottomLength = MainLength + this.ExtrudedLine.ExtrudeA + this.ExtrudedLine.ExtrudeB;
        let ExtrudeLength = (this.ExtrudedLine.RISE ** 2 + this.ExtrudedLine.RUN ** 2) ** .5;
        let Height = 0;
        if (X <= this.ExtrudedLine.ExtrudeB) {
            Height = X / this.ExtrudedLine.ExtrudeB * ExtrudeLength;
            if (!Raw)
                for (let ZoningPoint of this.Zonings) {
                    let Actual1X = -ZoningPoint[1].X + this.ExtrudedLine.ExtrudeB + MainLength;
                    if (Actual1X > X) continue;
                    Height = Math.max(Height, ExtrudeLength - ((ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5));
                }
        } else if (X <= this.ExtrudedLine.ExtrudeB + MainLength) {
            Height = ExtrudeLength;
        } else {
            Height = (BottomLength - X) / this.ExtrudedLine.ExtrudeA * ExtrudeLength;
            if (!Raw)
                for (let ZoningPoint of this.Zonings) {
                    let Actual1X = -ZoningPoint[1].X + this.ExtrudedLine.ExtrudeB + MainLength;
                    if (Actual1X < X) continue;
                    Height = Math.max(Height, ExtrudeLength - ((ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5));
                }
        }
        // for (let ZoningPoint of this.Zonings) {
        //     let Actual0X = -ZoningPoint[0].X + this.ExtrudedLine.ExtrudeB + MainLength;
        //     let Actual1X = -ZoningPoint[1].X + this.ExtrudedLine.ExtrudeB + MainLength;
        //     if (Actual0X - 1 <= X && X <= Actual0X + 1) Height = ExtrudeLength * 2;
        //     if (Actual1X - 1 <= X && X <= Actual1X + 1) Height = ExtrudeLength * 2;
        // }
        return Height;
    }

    GetXsAtHeight(Height: number) {
        let BottomLength = this.ExtrudedLine.Length + this.ExtrudedLine.ExtrudeA + this.ExtrudedLine.ExtrudeB;
        let ExtrudeLength = (this.ExtrudedLine.RISE ** 2 + this.ExtrudedLine.RUN ** 2) ** .5;
        let ExtrudeB_X = Height / ExtrudeLength * this.ExtrudedLine.ExtrudeB;
        let ExtrudeA_X = -Height / ExtrudeLength * this.ExtrudedLine.ExtrudeA + BottomLength;
        return [ExtrudeB_X, ExtrudeA_X];
    }

    GetBottomAtX(X: number, Inclusive = false, ApplyOffset = true) {
        let MainLength = this.ExtrudedLine.Length;
        let BottomLength = MainLength + this.ExtrudedLine.ExtrudeA + this.ExtrudedLine.ExtrudeB;
        let ExtrudeLength = (this.ExtrudedLine.RISE ** 2 + this.ExtrudedLine.RUN ** 2) ** .5;
        let Height = 0;
        // if (X <= this.ExtrudedLine.ExtrudeB) {
        //     // Height = X / this.ExtrudedLine.ExtrudeB * ExtrudeLength;
        //     for (let ZoningPoint of this.Zonings) {
        //         let Actual1X = -ZoningPoint[0].X + this.ExtrudedLine.ExtrudeB + MainLength;
        //         if (Actual1X < X) continue;
        //         Height = Math.max(Height, ExtrudeLength - ((ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5));
        //     }
        // } else if (X <= this.ExtrudedLine.ExtrudeB + MainLength) {
        //     // Height = ExtrudeLength;
        // } else {
        //     // Height = (BottomLength - X) / this.ExtrudedLine.ExtrudeA * ExtrudeLength;
        //     for (let ZoningPoint of this.Zonings) {
        //         let Actual1X = -ZoningPoint[0].X + this.ExtrudedLine.ExtrudeB + MainLength;
        //         if (Actual1X > X) continue;
        //         Height = Math.max(Height, ExtrudeLength - ((ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5));
        //     }
        // }

        for (let ZoningPoint of this.Zonings) {
            let Actual0X = -ZoningPoint[0].X + this.ExtrudedLine.ExtrudeB + MainLength;
            let Actual1X = -ZoningPoint[1].X + this.ExtrudedLine.ExtrudeB + MainLength;
            // if (Actual0X > X) continue;
            let EL2 = ((ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5)
            let EL1 = ((ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5)
            if (Actual0X > Actual1X && (Inclusive ? X <= Actual0X : X < Actual0X)) { // && Actual1X < X && X < Actual0X) {
                Height = Math.max(Height, (Actual0X - X) / (Actual0X - Actual1X) * (EL2 - EL1) - (ApplyOffset ? 1 : 0) * (EL2 - ExtrudeLength)); // Math.max(Height, ExtrudeLength - ((ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5));
            }
            if (Actual0X < Actual1X && (Inclusive ? Actual0X <= X : Actual0X < X)) { // && Actual0X < X && X < Actual1X) {
                Height = Math.max(Height, (X - Actual0X) / (Actual1X - Actual0X) * (EL2 - EL1) - (ApplyOffset ? 1 : 0) * (EL2 - ExtrudeLength)); // Math.max(Height, ExtrudeLength - ((ZoningPoint[0].Y ** 2 + ZoningPoint[0].Z ** 2) ** .5));
            }
        }
        // for (let ZoningPoint of this.Zonings) {
        //     let Actual0X = -ZoningPoint[0].X + this.ExtrudedLine.ExtrudeB + MainLength;
        //     let Actual1X = -ZoningPoint[1].X + this.ExtrudedLine.ExtrudeB + MainLength;
        //     if (Actual0X - 1 <= X && X <= Actual0X + 1) Height = ExtrudeLength * 2;
        //     if (Actual1X - 1 <= X && X <= Actual1X + 1) Height = ExtrudeLength * 2;
        // }
        return Height; //  ExtrudeLength - Height;
    }

    GetHeightAtZ(Z: number) {
        return this.ExtrudedLine.RISE * Z / this.ExtrudedLine.RUN; // + Line1Top;
    }

    Delete() {
        this.LineA?.dispose();
        this.LineB?.dispose();
        this.Polygon?.dispose();
        this.PanelSettings?.instance?.dispose();
        this.TESTYSETTINGS?.instance?.dispose();
        this.TESTYSETTINGSSIDE?.instance?.dispose();
        for (let PanelSettings of this.Panels) PanelSettings.instance?.dispose();
        // delete this;
    }
}
export class ExtrudedLine {
    ActiveEditor: Editor;

    ID!: string;
    PRIMARY = "PITCH";
    ENABLED = true;
    _PITCH = 1;
    _RISE = 1;
    _RUN = 1;

    get PITCH() { return this._PITCH * 12; };
    get RISE() { return this._RISE; };
    get RUN() { return this.ENABLED ? this._RUN : 0; };

    set PITCH(value) {
        this._PITCH = value / 12;
        if (this.PRIMARY == "PITCH") {
            let Length = (this._RISE ** 2 + this._RUN ** 2) ** .5;
            let Angle = Math.atan2(value, 12);
            this._RISE = Math.sin(Angle) * Length;
            this._RUN = Math.cos(Angle) * Length;
        } else if (this.PRIMARY == "RISE") {
            this._RUN = this._PITCH == 0 ? 0 : this._RISE / this._PITCH;
        } else if (this.PRIMARY == "RUN") {
            this._RISE = this._PITCH * this._RUN;
        }
    };
    set RISE(value) {
        this._RISE = value;
        if (this.PRIMARY == "PITCH") {
            this._RUN = this._PITCH == 0 ? 0 : value / this._PITCH;
        } else if (this.PRIMARY == "RISE") {
            this._RUN = this._PITCH == 0 ? 0 : value / this._PITCH;
            this._PITCH = this._RUN == 0 ? 0 : value / this._RUN;
        } else if (this.PRIMARY == "RUN") {
            this._PITCH = this._RUN == 0 ? 0 : value / this._RUN;
        }
    };
    set RUN(value) {
        this._RUN = value;
        if (this.PRIMARY == "PITCH") {
            this._RISE = this._PITCH * value;
        } else if (this.PRIMARY == "RISE") {
            this._PITCH = value == 0 ? 0 : this._RISE / value;
        } else if (this.PRIMARY == "RUN") {
            this._RISE = this._PITCH * value;
            this._PITCH = value == 0 ? 0 : this._RISE / value;
        }
    };

    FocusSketchLine: SketchLine;
    FocusPoint0: "V0" | "V1";
    FocusPoint1: "V0" | "V1";
    // IsParallel = true; // PERPENDICULAR | PARALLEL

    // ExtrudeA = 0;
    // ExtrudeB = 0;

    get ExtrudeA() { return this.LineConnectA?.RUN ?? 0; };
    get ExtrudeB() { return this.LineConnectB?.RUN ?? 0; };

    LineConnectA!: ExtrudedLine;
    LineConnectB!: ExtrudedLine;

    Length: number = 0;
    Angle: number = 0;

    LineSettings: LineSettingsPeanut;
    Line: BABYLON.LinesMesh;

    SketchExtrusionLines: ExtrusionLines;

    constructor(FocusSketchLine: SketchLine, FocusPoint0: "V0" | "V1", FocusPoint1: "V0" | "V1", Angle = 0) { // IsParallel = true) {
        this.ActiveEditor = FocusSketchLine.ActiveEditor;
        this.FocusSketchLine = FocusSketchLine;
        this.FocusPoint0 = FocusPoint0;
        this.FocusPoint1 = FocusPoint1;
        // this.IsParallel = IsParallel;
        this.Angle = Angle; // - 90;

        this.LineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
        this.LineSettings.instance = this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings, this.ActiveEditor.Scene);
        this.Line.color = new BABYLON.Color3(0, 1, 0);
        this.Line.isVisible = false;
        // this.Line.color = Angle == 0 ? new BABYLON.Color3(1, 0, 0) : // "0" //
        //     Angle == 90 ? new BABYLON.Color3(0, 1, 0) : // "A" //
        //         Angle == 180 ? new BABYLON.Color3(0, 0, 1) : // "1" //
        //             Angle == 270 ? new BABYLON.Color3(1, 1, 1) : // "B" //
        //                 new BABYLON.Color3(0, 0, 0);

        this.SketchExtrusionLines = new ExtrusionLines(this);
        // if (this.SketchExtrusionLines.LineB) this.SketchExtrusionLines.LineB.color = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        // if (this.SketchExtrusionLines.LineB) this.SketchExtrusionLines.LineA.color = this.SketchExtrusionLines.LineB.color;
    }

    CF0!: CFrame;
    CF1!: CFrame;

    A0!: CFrame;
    B0!: CFrame;

    A1!: CFrame;
    B1!: CFrame;

    Update() {
        if (!this.Line) return;

        // this.CF0 = CFrame.lookAt(this.FocusSketchLine[this.FocusPoint0], this.FocusSketchLine[this.FocusPoint1]);
        // this.CF1 = CFrame.lookAt(this.FocusSketchLine[this.FocusPoint1], this.FocusSketchLine[this.FocusPoint0]);
        this.CF0 = CFrame.fromVector3(this.FocusSketchLine[this.FocusPoint0]).ToWorldSpace(CFrame.Angles(0, -this.FocusSketchLine.Angle + (this.Angle + 90) * Math.PI / 180, 0));
        // this.CF1 = CFrame.fromVector3(this.FocusSketchLine[this.FocusPoint1]).ToWorldSpace(CFrame.Angles(0, this.FocusSketchLine.Angle + (this.Angle + 180 - 90) * Math.PI / 180, 0));
        this.CF1 = this.CF0.ToWorldSpace(CFrame.fromXYZ(this.Length, 0, 0)); // .ToWorldSpace(CFrame.Angles(0, Math.PI, 0));

        let RUN = this.RUN;
        let RISE = this._RISE;

        this.A0 = CFrame.fromXYZ(-this.ExtrudeA, -RISE, -RUN);
        this.B0 = CFrame.fromXYZ(this.ExtrudeB, -RISE, -RUN);

        let CF_A = this.CF0.ToWorldSpace(this.A0);
        let CF_B = this.CF1.ToWorldSpace(this.B0);
        this.LineSettings.points[0].set(CF_A.X, CF_A.Y, CF_A.Z);
        this.LineSettings.points[1].set(CF_B.X, CF_B.Y, CF_B.Z);

        this.SketchExtrusionLines?.Update();
        this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
    }

    GetTopY() { return this.FocusSketchLine.Z1 + (this.FocusSketchLine.AnchorPoint) * this.RISE; }
    GetBottomY() { return this.FocusSketchLine.Z1 + (this.FocusSketchLine.AnchorPoint - 1) * this.RISE; }

    Delete() {
        this.Line?.dispose();
        this.SketchExtrusionLines?.Delete();
        // delete this;
    }
}

export class SketchLine {
    // [x: string]: Vector3 | any;
    ActiveEditor: Editor;

    static ActiveSketch?: SketchLine | null;
    static AllDrawings: SketchLine[] = [];
    static AllRelations: SKETCH_RELATION[] = [];
    static DrawingScale = .29858;

    ID = Math.floor(Math.random() * 0xff_ff_ff_ff);

    set X0(value: number) {
        this._X0 = value;
        this.V0.X = value;
        this.LineSettings.points[0].x = value;
        if (this.DrawFrom == "0") this.UpdateXY();
    };
    set X1(value: number) {
        this._X1 = value;
        this.V1.X = value;
        this.LineSettings.points[1].x = value;
        if (this.DrawFrom == "1") this.UpdateXY();
    };
    // XY0(X0: number, Y0: number) {
    //     this._X0 = X0;
    //     this._Y0 = Y0;
    //     this.V0.X = X0;
    //     this.V0.Z = Y0;
    //     this.LineSettings.points[0].x = X0;
    //     this.LineSettings.points[0].z = Y0;
    // };

    set Y0(value: number) {
        this._Y0 = value;
        this.V0.Z = value;
        this.LineSettings.points[0].z = value;
        if (this.DrawFrom == "0") this.UpdateXY();
    };
    set Y1(value: number) {
        this._Y1 = value;
        this.V1.Z = value;
        this.LineSettings.points[1].z = value;
        if (this.DrawFrom == "1") this.UpdateXY();
    };
    set Z0(value: number) {
        this._Z0 = value;
        // this.V0.Y = value;
        // this.LineSettings.points[0].y = value;
    };
    set Z1(value: number) {
        this._Z1 = value;
        this.V0.Y = value;
        this.V1.Y = value;
        this.LineSettings.points[0].y = value;
        this.LineSettings.points[1].y = value;
    };

    _Length = 0;
    get Length() { return this._Length; };
    set Length(value: number) {
        this._Length = value;
        if (this.Lines["A"] != null)
            this.Lines["A"].Length = this.Lines["B"].Length = value;
        this.UpdateXY();
    };

    _Angle = 0;
    get Angle() { return this._Angle; };
    set Angle(value: number) {
        this._Angle = value;
        this.UpdateXY();
    };

    UpdateXY(Override?: "0" | "C" | "1") {
        switch (Override ?? this.DrawFrom) {
            case "0":
                this.X1 = this._X0 + Math.cos(this._Angle) * this._Length;
                this.Y1 = this._Y0 + Math.sin(this._Angle) * this._Length;
                break;
            case "1":
                this.X0 = this._X1 - Math.cos(this._Angle) * this._Length;
                this.Y0 = this._Y1 - Math.sin(this._Angle) * this._Length;
            case "C":
                let XCenter = (this._X0 + this._X1) / 2;
                let YCenter = (this._Y0 + this._Y1) / 2;
                this.X0 = XCenter - Math.cos(this._Angle) * this._Length / 2;
                this.Y0 = YCenter - Math.sin(this._Angle) * this._Length / 2;
                this.X1 = XCenter + Math.cos(this._Angle) * this._Length / 2;
                this.Y1 = YCenter + Math.sin(this._Angle) * this._Length / 2;
                break;
            default:
                break;
        }
    }

    get X0() { return this._X0; };
    get X1() { return this._X1; };
    get Y0() { return this._Y0; };
    get Y1() { return this._Y1; };
    get Z0() { return this._Z0; };
    get Z1() { return this._Z1; };

    _X0 = 0; _Y0 = 0;
    _X1 = 0; _Y1 = 0;
    _Z0 = 0; _Z1 = 0; // Lower | Upper \\

    CF0 = new CFrame();
    CF1 = new CFrame();

    V0 = new Vector3();
    V1 = new Vector3();
    _Pointer: CFrame;

    DrawFrom: "0" | "C" | "1" = "0";

    constructor(ActiveEditor: Editor, X: number, Y: number, Z: number) {
        this.ActiveEditor = ActiveEditor;

        this.X0 = X; this.X1 = X;
        this.Y0 = Y; this.Y1 = Y;
        this.Z0 = Z; this.Z1 = Z;
        this._Pointer = CFrame.fromXYZ(this.X1, this.Z1, this.Y1);
        // this.CF0 = CFrame.lookAt(this.V0, this.V1);
        // this.CF1 = CFrame.lookAt(this.V1, this.V0);
        this.CF0 = CFrame.fromVector3(this.V0).ToWorldSpace(CFrame.Angles(0, this.Angle, 0));
        this.CF1 = CFrame.fromVector3(this.V1).ToWorldSpace(CFrame.Angles(0, this.Angle + Math.PI, 0));
        // this.LineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(0, 1e-10, 0)], updatable: true };
        this.LineSettings.instance = this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings, ActiveEditor.Scene);
        this.Line.color = new BABYLON.Color3(0, 0, 1);
        // this.Line.isVisible = false;
    }

    /*
        1
      A2 B3
        0
    */

    DrawingMode = "LINE"; // LINE | EXTRUSION \\
    HasLine = false;
    HasExtruded = false;

    LineSettings: LineSettingsPeanut = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(0, 1e-10, 0)], updatable: true };;
    Line: BABYLON.LinesMesh;

    Lines: {
        [ID: string]: ExtrudedLine;
    } = {};
    // Line0!: ExtrudedLine;
    // Line1!: ExtrudedLine;
    // LineA!: ExtrudedLine;
    // LineB!: ExtrudedLine;

    SnapAngle: number = 0;
    AnchorPoint: number = 1;

    Format(X: number) {
        return (Math.round(X * 100) / 100).toString();
    }

    Start() {
        this.ActiveEditor.UI_Controls.LiveXLineSettings.points[0].copyFrom(this.LineSettings.points[0]);
        this.ActiveEditor.UI_Controls.LiveXLineSettings.points[1].copyFrom(this.LineSettings.points[1]);
        this.ActiveEditor.UI_Controls.LiveYLineSettings.points[0].copyFrom(this.LineSettings.points[0]);
        this.ActiveEditor.UI_Controls.LiveYLineSettings.points[1].copyFrom(this.LineSettings.points[1]);
        this.ActiveEditor.UI_Controls.LiveXData.Marker.position.copyFrom(this.ActiveEditor.UI_Controls.LiveXLineSettings.points[0]);
        this.ActiveEditor.UI_Controls.LiveYData.Marker.position.copyFrom(this.ActiveEditor.UI_Controls.LiveYLineSettings.points[0]);
    }
    UpdateWithPointer(Shift = false) {
        const p = this.ActiveEditor.pickOnGround(this.ActiveEditor.Scene.pointerX, this.ActiveEditor.Scene.pointerY);
        if (!p) return;
        return this.Update(p.x, p.z, Shift);
    }
    // Shift+Drag (Moves V0 in Draw and Extrusion mode)
    // CTRL+Shift+Mouse (Rotates V1 referenced to V0 in Extrusion mode)
    Update(X: number, Y: number, Shift = false) {
        // this._Pointer.set(X, this.Z1, Y);
        this._Pointer.X = X;
        this._Pointer.Z = Y;
        switch (this.DrawingMode) {
            case "EXTRUSION": {
                let LocalPosition = (this.CF0.Distance(this._Pointer) < this.CF1.Distance(this._Pointer) ? this.CF0 : this.CF1).ToObjectSpace(this._Pointer);
                let AbsX = Math.max(0, -LocalPosition.Z); // Math.abs(this.LineSettings.points[1].x - X);
                let AbsY = Math.abs(LocalPosition.X); // Math.abs(this.LineSettings.points[1].z - Y);
                // let DEGG = Math.atan2(AbsX, AbsY) * 180 / Math.PI; // Dan Reynolds Egg
                if (!Shift) /*if (DEGG <= 0) AbsX = 0; else*/ if (AbsX > AbsY) AbsY = AbsX; else AbsX = AbsY;
                AbsX = Math.round(AbsX);
                AbsY = Math.round(AbsY);

                this.Lines["0"].RUN = AbsX;
                this.Lines["1"].RUN = AbsX;
                this.Lines["A"].RUN = AbsY;
                this.Lines["B"].RUN = AbsY;

                this.Lines["0"].RISE = this.Lines["A"].RISE;
                this.Lines["1"].RISE = this.Lines["0"].RISE;
                break;
            }
            case "LINE": {
                let DistanceFromPointer = this._Pointer.Distance(this.V0);
                let LookVector = CFrame.lookAt(this.V0, this._Pointer.Position).LookVector; // let LookCFrame = (DistanceFromPointer <= .1 ? CFrame.identity : CFrame.lookAt(this.V0, this._Pointer.Position));
                let X1D = LookVector.X; let Y1D = LookVector.Z;
                if (!Shift) {
                    let E2 = CFrame.Angles(0, -this.SnapAngle, 0).ToObjectSpace(CFrame.fromVector3(this.V0).ToObjectSpace(this._Pointer));
                    if (Math.abs(E2.X) < Math.abs(E2.Z)) { DistanceFromPointer = Math.abs(E2.Z); X1D = -Math.sin(this.SnapAngle) * Math.sign(E2.Z); Y1D = Math.cos(this.SnapAngle) * Math.sign(E2.Z); }
                    else { DistanceFromPointer = Math.abs(E2.X); X1D = Math.cos(this.SnapAngle) * Math.sign(E2.X); Y1D = Math.sin(this.SnapAngle) * Math.sign(E2.X); }
                }
                this.Length = Math.round(DistanceFromPointer);
                this.Angle = Math.atan2(Y1D, X1D);
                // let DistanceFromPointer = this._Pointer.Distance(this.V0);
                // let LookVector = CFrame.lookAt(this.V0, this._Pointer.Position).LookVector; // let LookCFrame = (DistanceFromPointer <= .1 ? CFrame.identity : CFrame.lookAt(this.V0, this._Pointer.Position));
                // let X1D = LookVector.X; let Y1D = LookVector.Z;
                // if (!Shift) {
                //     let E2 = CFrame.Angles(0, -this.SnapAngle, 0).ToObjectSpace(CFrame.fromVector3(this.V0).ToObjectSpace(this._Pointer));
                //     if (Math.abs(E2.X) < Math.abs(E2.Z)) { DistanceFromPointer = E2.Z; X1D = -Math.sin(this.SnapAngle); Y1D = Math.cos(this.SnapAngle); }
                //     else { DistanceFromPointer = E2.X; X1D = Math.cos(this.SnapAngle); Y1D = Math.sin(this.SnapAngle); }
                // }
                // this.X1 = this.X0 + X1D * Math.round(DistanceFromPointer);
                // this.Y1 = this.Y0 + Y1D * Math.round(DistanceFromPointer);
                break;
            }
        }

        this.UpdateLines();

        // this.ActiveEditor.UI_Controls.LineLength.text = this.Format(((this.X0 - this.X1) ** 2 + (this.Y0 - this.Y1) ** 2 + (this.Z0 - this.Z1) ** 2) ** .5);
        this.ActiveEditor.UI_Controls.LineLength.text = this.Format(((this.X0 - this.X1) ** 2 + (this.Y0 - this.Y1) ** 2) ** .5);
        this.ActiveEditor.UI_Controls.Info1.text = this.Format(this.Z1);

        if (!this.HasLine) return;

        this.ActiveEditor.UI_Controls.Info2.text = this.Format(this.AnchorPoint * Math.max(this.Lines["0"].RISE, this.Lines["1"].RISE, this.Lines["A"].RISE, this.Lines["B"].RISE));

        this.ActiveEditor.UI_Controls.LiveXData.Marker.position.copyFrom(this.Lines["1"].LineSettings.points[0].add(this.Lines["1"].LineSettings.points[1]).scale(.5));
        this.ActiveEditor.UI_Controls.LiveYData.Marker.position.copyFrom(this.Lines["B"].LineSettings.points[0].add(this.Lines["B"].LineSettings.points[1]).scale(.5));
        let AltPitch = this.Lines["B"].RISE / this.Lines["0"].ExtrudeB * 12; let AltPitchRounded = this.Format(AltPitch);
        let Line1Length = this.Format(this.Lines["1"].LineSettings.points[1].subtract(this.Lines["1"].LineSettings.points[0]).length());
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = this.Lines["0"].ExtrudeB == 0 ? Line1Length : `${AltPitchRounded != this.Format(AltPitch) ? `~${AltPitchRounded}` : AltPitch}\n${Line1Length}\n+${this.Format(this.Lines["0"].ExtrudeB)}`;
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = `${this.Lines["B"].PITCH}\n${this.Format(this.Lines["B"].LineSettings.points[1].subtract(this.Lines["B"].LineSettings.points[0]).length())}\n-${this.Format(this.Lines["B"].RISE)}`;

        this.ActiveEditor.UI_Controls.Pitch0.text = this.Format(this.Lines["0"].PITCH);
        this.ActiveEditor.UI_Controls.Pitch1.text = this.Format(this.Lines["1"].PITCH);
        this.ActiveEditor.UI_Controls.Pitch2.text = this.Format(this.Lines["A"].PITCH);
        this.ActiveEditor.UI_Controls.Pitch3.text = this.Format(this.Lines["B"].PITCH);

        this.ActiveEditor.UI_Controls.Run0.text = this.Format(this.Lines["0"].RUN);
        this.ActiveEditor.UI_Controls.Run1.text = this.Format(this.Lines["1"].RUN);
        this.ActiveEditor.UI_Controls.Run2.text = this.Format(this.Lines["A"].RUN);
        this.ActiveEditor.UI_Controls.Run3.text = this.Format(this.Lines["B"].RUN);

        this.ActiveEditor.UI_Controls.Rise0.text = this.Format(this.Lines["0"].RISE);
        this.ActiveEditor.UI_Controls.Rise1.text = this.Format(this.Lines["1"].RISE);
        this.ActiveEditor.UI_Controls.Rise2.text = this.Format(this.Lines["A"].RISE);
        this.ActiveEditor.UI_Controls.Rise3.text = this.Format(this.Lines["B"].RISE);

        // }
    }
    UpdateLines() {
        if (this.DrawingMode == "LINE") {
            this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = `${Math.round(((this.X0 - this.X1) ** 2 + (this.Y0 - this.Y1) ** 2 + (this.Z0 - this.Z1) ** 2) ** .5 * 100) / 100}`;
            this.ActiveEditor.UI_Controls.LiveDistanceData.Marker.position.copyFrom(this.LineSettings.points[0].add(this.LineSettings.points[1]).scale(.5));
        }
        // if (this.DrawingMode == "EXTRUSION") {
        if (!this.HasLine) return;
        let YYY = this.AnchorPoint * Math.max(this.Lines["0"].RISE, this.Lines["1"].RISE, this.Lines["A"].RISE, this.Lines["B"].RISE);
        this.V0.Y = this.V1.Y = this.Z1 + YYY;
        this.LineSettings.points[0].y = this.LineSettings.points[1].y = this.Z1 + YYY;
        this.ActiveEditor.UI_Controls.LiveDistanceData.Marker.position.copyFrom(this.LineSettings.points[0].add(this.LineSettings.points[1]).scale(.5));
        this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
        // this.CF0 = CFrame.lookAt(this.V0, this.V1);
        // this.CF1 = CFrame.lookAt(this.V1, this.V0);
        this.CF0 = CFrame.fromVector3(this.V0).ToWorldSpace(CFrame.Angles(0, this.Angle, 0));
        this.CF1 = CFrame.fromVector3(this.V1).ToWorldSpace(CFrame.Angles(0, this.Angle + Math.PI, 0));

        this.Lines["0"].Update();
        this.Lines["1"].Update();
        this.Lines["A"].Update();
        this.Lines["B"].Update();
    }
    UpdateInterceptions() {
        for (let Sketch2 of SketchLine.AllDrawings) {
            if (this == Sketch2) continue;
            this.SketchOverlap(Sketch2);
        };
        for (let Relation of SketchLine.AllRelations) {
            // Relation.Sketch1
        }
    }
    Commit() {
        // this.CF0 = CFrame.lookAt(this.V0, this.V1);
        // this.CF1 = CFrame.lookAt(this.V1, this.V0);
        this.CF0 = CFrame.fromVector3(this.V0).ToWorldSpace(CFrame.Angles(0, this.Angle, 0));
        this.CF1 = CFrame.fromVector3(this.V1).ToWorldSpace(CFrame.Angles(0, this.Angle + Math.PI, 0));
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = "";
        if (this.HasExtruded) {
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = "";
            SketchLine.AllDrawings.push(this);
            this.UpdateInterceptions();
            console.log("ALL RELATIONS", SketchLine.AllRelations);
            // for (let SketchRelations of SketchLine.AllRelations) {
            //     // Relation.Find()
            //     if (SketchRelations.Sketch1 != this && SketchRelations.Sketch2 != this) continue;
            //     console.log(SketchRelations);
            //     let OtherSketch = SketchRelations.Sketch1 == this ? SketchRelations.Sketch2 : SketchRelations.Sketch1;
            //     // let OtherRelationList = SketchRelations.ListForType(OtherSketch.ID, "INTERSECT");
            //     let RelationList = SketchRelations.ListForType(this.ID, "WITHIN");
            //     console.log("RL", RelationList);
            //     for (let Result of RelationList) {
            //         let Postfix = Result[0] as "1" | "2"; // Might need to flip.
            //         let OtherPostfix = Postfix == "1" ? "2" : "1";
            //         let Relation = Result[1] as RELATION;
            //         let SideA = Relation[("Side" + Postfix) as ("Side1" | "Side2")];
            //         let TypeA = Relation[("Type" + Postfix) as ("Type1" | "Type2")];
            //         let SideB = Relation[("Side" + OtherPostfix) as ("Side1" | "Side2")];
            //         let TypeB = Relation[("Type" + OtherPostfix) as ("Type1" | "Type2")];
            //         let ID_A = SketchRelations[("Sketch" + Postfix) as ("Sketch1" | "Sketch2")].ID;
            //         let ID_B = SketchRelations[("Sketch" + OtherPostfix) as ("Sketch1" | "Sketch2")].ID;

            //         if (Relation.Data == 2) { // && OtherValue.SIDE == "B") {
            //             this.Lines[SideA].ENABLED = false;
            //             // this.Line

            //             let ConnectA = SketchRelations.List(this.ID, this.Lines[SideA].LineConnectA.ID, "INTERSECT")[0][1].Data;
            //             let ConnectB = SketchRelations.List(this.ID, this.Lines[SideA].LineConnectB.ID, "INTERSECT")[0][1].Data;

            //             console.log("CONNECTIONS", ConnectA, ConnectB);

            //             let BoundInter2D = ConnectA; // Relation.Data;
            //             if (!BoundInter2D) continue;

            //             let Coincide1 = BoundInter2D.p1.Lerp(BoundInter2D.p2, BoundInter2D.t1), Coincide2 = BoundInter2D.p3.Lerp(BoundInter2D.p4, BoundInter2D.t2);
            //             // Possibly try normalization and stuff with FocusCF of that plane.
            //             // this.ActiveEditor.DrawLine([BoundInter2D.p1.Lerp(BoundInter2D.p2, BoundInter2D.t1), BoundInter2D.p3.Lerp(BoundInter2D.p4, BoundInter2D.t2)]);
            //             // this.ActiveEditor.DrawLine([Coincide1, BoundInter2D.t1 <= .5 ? BoundInter2D.p1 : BoundInter2D.p2]);
            //             // this.ActiveEditor.DrawLine([Coincide2, BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4]);
            //             let Lerped1 = Coincide1.DistanceFromPoint(BoundInter2D.t1 <= .5 ? BoundInter2D.p1 : BoundInter2D.p2);
            //             let Lerped2 = Coincide2.DistanceFromPoint(BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4);
            //             // SketchRelations.Relations.map((Value: RELATION, index: number) => {
            //             //     return Value.Value1.
            //             // });
            //             this.ActiveEditor.DrawLine([Coincide1, BoundInter2D.t1 <= .5 ? BoundInter2D.p1 : BoundInter2D.p2, (BoundInter2D.t1 <= .5 ? BoundInter2D.p1 : BoundInter2D.p2).add(new BABYLON.Vector3(0, OtherSketch.Lines[SideB].RISE / OtherSketch.Lines[SideB].RUN * Lerped1))]);
            //             // this.ActiveEditor.DrawLine([Coincide2, BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4, (BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4).add(new BABYLON.Vector3(0, Math.tan(Math.atan2(1, 1)) * Lerped2))]).color = new BABYLON.Color3(0, .5, 1);
            //             let WITHIN_BOUND = SketchRelations.Find(SideA, "WITHIN", SideB, "BOUND");
            //             if (WITHIN_BOUND == ID_A) { // this.Sketch1.ID) { // RelationValue.ID) { // SketchRelations.Sketch1.ID) {
            //                 this.ActiveEditor.LabelMarker(BoundInter2D.point, `INTERSECT (${Math.round(Lerped1)})`);
            //             } else if (WITHIN_BOUND == ID_B) { // this.Sketch2.ID) { // OtherValue.ID) { // SketchRelations.Sketch2.ID) {
            //                 this.ActiveEditor.LabelMarker(BoundInter2D.point, `INTERSECT (${Math.round(Lerped2)})`);
            //             }

            //             console.log(SideA, TypeA, SideB, TypeB);
            //             console.log(this.Length, this.Z1, this.Z0);
            //             // this.Length += this.Lines[SideA].RISE * OtherSketch.Lines[SideB].RUN / OtherSketch.Lines[SideB].RISE; // BoundInter2D.point.DistanceFromPointXZ(BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4);
            //             console.log(this.Length);

            //             this.UpdateLines();
            //         }
            //     }
            //     console.log(SketchRelations);
            //     // if (Relation.Sketch1 == this) {
            //     //     if (Relation.Relations)
            //     // }
            //     // this.
            // }
            return true;
        }
        if (this.DrawingMode == "EXTRUSION") {
            this.DrawingMode = "LINE";
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = "";
        } else if (this.DrawingMode == "LINE") {
            this.DrawingMode = "EXTRUSION";
            this.HasLine = true; // Going to get rid of this in a bit and set the position to the pointer upon switching.




            // let V0 = new Vector3(this.X0, this.Z0, this.Y0);
            // let V1 = new Vector3(this.X1, this.Z0, this.Y1);
            // this.CF0 = CFrame.lookAt(V0, V1);
            // this.CF1 = CFrame.lookAt(V1, V0);
            this.ActiveEditor.UI_Controls.LiveXData.Label.text = "";
            this.ActiveEditor.UI_Controls.LiveYData.Label.text = "";
            // LiveDistanceData.Label.text = "";
            if (this.HasExtruded) return;
            this.HasExtruded = true;

            this.Lines["0"] = new ExtrudedLine(this, "V0", "V0", 0);
            this.Lines["1"] = new ExtrudedLine(this, "V1", "V1", 180);
            this.Lines["A"] = new ExtrudedLine(this, "V1", "V0", 90);
            this.Lines["B"] = new ExtrudedLine(this, "V0", "V1", 270);
            this.Lines["A"].Length = this.Lines["B"].Length = this.Length;

            this.Lines["0"].PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText0.text; // "RUN";
            this.Lines["1"].PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText1.text; // "RUN";
            this.Lines["A"].PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText2.text;
            this.Lines["B"].PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText3.text;

            this.Lines["0"].ID = "0";
            this.Lines["1"].ID = "1";
            this.Lines["A"].ID = "A";
            this.Lines["B"].ID = "B";

            this.Lines["0"].LineConnectA = this.Lines["A"];
            this.Lines["0"].LineConnectB = this.Lines["B"];

            this.Lines["B"].LineConnectA = this.Lines["0"];
            this.Lines["B"].LineConnectB = this.Lines["1"];

            this.Lines["1"].LineConnectA = this.Lines["B"];
            this.Lines["1"].LineConnectB = this.Lines["A"];

            this.Lines["A"].LineConnectA = this.Lines["1"];
            this.Lines["A"].LineConnectB = this.Lines["0"];

            // this.Lines["0"].ENABLED = this.ActiveEditor.UI_Controls.Checkbox0.isChecked;
            // this.Lines["1"].ENABLED = this.ActiveEditor.UI_Controls.Checkbox1.isChecked;
            // this.Lines["A"].ENABLED = this.ActiveEditor.UI_Controls.Checkbox2.isChecked;
            // this.Lines["B"].ENABLED = this.ActiveEditor.UI_Controls.Checkbox3.isChecked;
        }
    }
    Delete() {
        this.Line?.dispose();
        this.Lines["0"]?.Delete();
        this.Lines["1"]?.Delete();
        this.Lines["A"]?.Delete();
        this.Lines["B"]?.Delete();
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = "";
        // delete this;
    }

    SketchOverlap(Sketch2: SketchLine) {
        let Sketch1 = this;
        let SketchRelations = GetRelations(Sketch1, Sketch2);

        let Sketch1Points = [
            Sketch1.Lines["0"].SketchExtrusionLines.LineASettings.points[0], // 0
            Sketch1.Lines["0"].SketchExtrusionLines.LineASettings.points[1], // 1
            Sketch1.Lines["0"].SketchExtrusionLines.LineBSettings.points[1], // 2
            Sketch1.Lines["0"].SketchExtrusionLines.LineBSettings.points[0], // 3

            Sketch1.Lines["B"].SketchExtrusionLines.LineASettings.points[0], // 4
            Sketch1.Lines["B"].SketchExtrusionLines.LineASettings.points[1], // 5
            Sketch1.Lines["B"].SketchExtrusionLines.LineBSettings.points[1], // 6
            Sketch1.Lines["B"].SketchExtrusionLines.LineBSettings.points[0], // 7

            Sketch1.Lines["1"].SketchExtrusionLines.LineASettings.points[0], // 8
            Sketch1.Lines["1"].SketchExtrusionLines.LineASettings.points[1], // 9
            Sketch1.Lines["1"].SketchExtrusionLines.LineBSettings.points[1], // 10
            Sketch1.Lines["1"].SketchExtrusionLines.LineBSettings.points[0], // 11

            Sketch1.Lines["A"].SketchExtrusionLines.LineASettings.points[0], // 12
            Sketch1.Lines["A"].SketchExtrusionLines.LineASettings.points[1], // 13
            Sketch1.Lines["A"].SketchExtrusionLines.LineBSettings.points[1], // 14
            Sketch1.Lines["A"].SketchExtrusionLines.LineBSettings.points[0], // 15
        ];

        let Sketch2Points = [
            Sketch2.Lines["0"].SketchExtrusionLines.LineASettings.points[0], // 0
            Sketch2.Lines["0"].SketchExtrusionLines.LineASettings.points[1], // 1
            Sketch2.Lines["0"].SketchExtrusionLines.LineBSettings.points[1], // 2
            Sketch2.Lines["0"].SketchExtrusionLines.LineBSettings.points[0], // 3

            Sketch2.Lines["B"].SketchExtrusionLines.LineASettings.points[0], // 4
            Sketch2.Lines["B"].SketchExtrusionLines.LineASettings.points[1], // 5
            Sketch2.Lines["B"].SketchExtrusionLines.LineBSettings.points[1], // 6
            Sketch2.Lines["B"].SketchExtrusionLines.LineBSettings.points[0], // 7

            Sketch2.Lines["1"].SketchExtrusionLines.LineASettings.points[0], // 8
            Sketch2.Lines["1"].SketchExtrusionLines.LineASettings.points[1], // 9
            Sketch2.Lines["1"].SketchExtrusionLines.LineBSettings.points[1], // 10
            Sketch2.Lines["1"].SketchExtrusionLines.LineBSettings.points[0], // 11

            Sketch2.Lines["A"].SketchExtrusionLines.LineASettings.points[0], // 12
            Sketch2.Lines["A"].SketchExtrusionLines.LineASettings.points[1], // 13
            Sketch2.Lines["A"].SketchExtrusionLines.LineBSettings.points[1], // 14
            Sketch2.Lines["A"].SketchExtrusionLines.LineBSettings.points[0], // 15
        ];

        // function TESTBS(S1P1, S1P2, S2P1, S2P2) {
        //     let BoundAInter2D = segmentIntersection2D(S1P1, S1P2, S2P1, S2P2);
        //     if (BoundAInter2D && (0 <= BoundAInter2D.t1 && BoundAInter2D.t1 <= 1 && 0 <= BoundAInter2D.t2 && BoundAInter2D.t2 <= 1)) {
        //         DrawLine([S1P1, S1P2]);
        //         DrawLine([S2P1, S2P2]);
        //     }
        // }

        for (let S1I = 0; S1I < 4; S1I++) {
            let Side1 = S1I == 0 ? "0" : S1I == 1 ? "B" : S1I == 2 ? "1" : S1I == 3 ? "A" : S1I.toString();
            let Polygon1 = [Sketch1Points[S1I * 4], Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch1Points[S1I * 4 + 3]];
            for (let S2I = 0; S2I < 4; S2I++) {
                let Side2 = S2I == 0 ? "0" : S2I == 1 ? "B" : S2I == 2 ? "1" : S2I == 3 ? "A" : S2I.toString();
                let Polygon2 = [Sketch2Points[S2I * 4], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2], Sketch2Points[S2I * 4 + 3]];
                let P1W2 = 0;
                let P2W1 = 0;
                for (let Offset = 0; Offset < 4; Offset++) {
                    let Polygon1Within2 = Sketch1Points[S1I * 4 + Offset].PointInPolygon(Polygon2);
                    let Polygon2Within1 = Sketch2Points[S2I * 4 + Offset].PointInPolygon(Polygon1);
                    // if (Polygon1Within2) {
                    //     this.ActiveEditor.DrawLine(Polygon1).color = new BABYLON.Color3(1, .5, 0);
                    //     this.ActiveEditor.DrawLine(Polygon2).color = new BABYLON.Color3(1, 1, 0);
                    // }
                    // if (Polygon2Within1) {
                    //     this.ActiveEditor.DrawLine(Polygon1).color = new BABYLON.Color3(1, 1, 0);
                    //     this.ActiveEditor.DrawLine(Polygon2).color = new BABYLON.Color3(1, .5, 0);
                    // }
                    if (Polygon1Within2) P1W2++;
                    if (Polygon2Within1) P2W1++;
                }
                if (P1W2 > 0) SketchRelations.Add(Sketch1.ID, Side1, "WITHIN", Sketch2.ID, Side2, "BOUND", P1W2);
                if (P2W1 > 0) SketchRelations.Add(Sketch1.ID, Side1, "BOUND", Sketch2.ID, Side2, "WITHIN", P2W1);

                let BoundInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]);
                if (BoundInter2D && (0 <= BoundInter2D.t1 && BoundInter2D.t1 <= 1 && 0 <= BoundInter2D.t2 && BoundInter2D.t2 <= 1)) {
                    // this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2]]);
                    // this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]]);
                    // BoundInter2D.point

                    // let Coincide1 = BoundInter2D.p1.Lerp(BoundInter2D.p2, BoundInter2D.t1), Coincide2 = BoundInter2D.p3.Lerp(BoundInter2D.p4, BoundInter2D.t2);
                    // // Possibly try normalization and stuff with FocusCF of that plane.
                    // // this.ActiveEditor.DrawLine([BoundInter2D.p1.Lerp(BoundInter2D.p2, BoundInter2D.t1), BoundInter2D.p3.Lerp(BoundInter2D.p4, BoundInter2D.t2)]);
                    // // this.ActiveEditor.DrawLine([Coincide1, BoundInter2D.t1 <= .5 ? BoundInter2D.p1 : BoundInter2D.p2]);
                    // // this.ActiveEditor.DrawLine([Coincide2, BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4]);
                    // let Lerped1 = Coincide1.DistanceFromPoint(BoundInter2D.t1 <= .5 ? BoundInter2D.p1 : BoundInter2D.p2);
                    // let Lerped2 = Coincide2.DistanceFromPoint(BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4);
                    // // SketchRelations.Relations.map((Value: RELATION, index: number) => {
                    // //     return Value.Value1.
                    // // });
                    // this.ActiveEditor.DrawLine([Coincide1, BoundInter2D.t1 <= .5 ? BoundInter2D.p1 : BoundInter2D.p2, (BoundInter2D.t1 <= .5 ? BoundInter2D.p1 : BoundInter2D.p2).add(new BABYLON.Vector3(0, Math.tan(Math.atan2(1, 1)) * Lerped1))]);
                    // // this.ActiveEditor.DrawLine([Coincide2, BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4, (BoundInter2D.t2 <= .5 ? BoundInter2D.p3 : BoundInter2D.p4).add(new BABYLON.Vector3(0, Math.tan(Math.atan2(1, 1)) * Lerped2))]).color = new BABYLON.Color3(0, .5, 1);
                    // let WITHIN_BOUND = SketchRelations.Find(Side1, "WITHIN", Side2, "BOUND");
                    // if (WITHIN_BOUND == SketchRelations.Sketch1.ID) {
                    //     this.ActiveEditor.LabelMarker(BoundInter2D.point, `INTERSECT (${Math.round(Lerped1)})`);
                    // } else if (WITHIN_BOUND == SketchRelations.Sketch2.ID) {
                    //     this.ActiveEditor.LabelMarker(BoundInter2D.point, `INTERSECT (${Math.round(Lerped2)})`);
                    // }

                    SketchRelations.Add(Sketch1.ID, Side1, "INTERSECT", Sketch2.ID, Side2, "INTERSECT", BoundInter2D);
                    // console.log(S1I, S2I, BoundInter2D);
                }

                if (!SketchRelations.Applied) continue;

                let CenterAInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]);
                if (CenterAInter2D && (0 <= CenterAInter2D.t1 && CenterAInter2D.t1 <= 1 && 0 <= CenterAInter2D.t2 && CenterAInter2D.t2 <= 1)) {
                    // this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2]]);
                    // this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]]);
                    // this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 1].Lerp(Sketch1Points[S1I * 4 + 2], CenterAInter2D.t1), Sketch2Points[S2I * 4 + 0].Lerp(Sketch2Points[S2I * 4 + 3], CenterAInter2D.t2)]);
                    SketchRelations.Add(Sketch1.ID, Side1, "A-CINTERSECT", Sketch2.ID, Side2, "CINTERSECT");
                    // console.log(S1I, S2I, CenterAInter2D);
                }

                let CenterBInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]);
                if (CenterBInter2D && (0 <= CenterBInter2D.t1 && CenterBInter2D.t1 <= 1 && 0 <= CenterBInter2D.t2 && CenterBInter2D.t2 <= 1)) {
                    // this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3]]);
                    // this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]]);
                    SketchRelations.Add(Sketch1.ID, Side1, "CINTERSECT", Sketch2.ID, Side2, "B-CINTERSECT");
                    // console.log(S1I, S2I, CenterBInter2D);
                }

                let CenterInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]);
                if (CenterInter2D && (0 <= CenterInter2D.t1 && CenterInter2D.t1 <= 1 && 0 <= CenterInter2D.t2 && CenterInter2D.t2 <= 1)) {
                    // this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3]]).color = new BABYLON.Color3(1, 1, 1);
                    // this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]]).color = new BABYLON.Color3(1, 1, 1);
                    SketchRelations.Add(Sketch1.ID, Side1, "CINTERSECT", Sketch2.ID, Side2, "CINTERSECT");
                    // console.log(S1I, S2I, CenterInter2D);
                }

                if (SketchRelations.Applied) continue;

                // // S1A - S2O //
                // TESTBS(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 1], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]);

                // // S1O - S2A //
                // TESTBS(Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 1]);

                // // S1B - S2O //
                // TESTBS(Sketch1Points[S1I * 4 + 2], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]);

                // // S1O - S2B //
                // TESTBS(Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch2Points[S2I * 4 + 2], Sketch2Points[S2I * 4 + 3]);

                // // S1A - S2A //
                // TESTBS(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 1], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 1]);

                // // S1A - S2B //
                // TESTBS(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 1], Sketch2Points[S2I * 4 + 2], Sketch2Points[S2I * 4 + 3]);

                // // S1B - S2B //
                // TESTBS(Sketch1Points[S1I * 4 + 2], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 2], Sketch2Points[S2I * 4 + 3]);

                // // S1B - S2A //
                // TESTBS(Sketch1Points[S1I * 4 + 2], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 1]);



                // // S1A - S2I //
                // TESTBS(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 1], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]);

                // // S1I - S2A //
                // TESTBS(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 1]);

                // // S1B - S2I //
                // TESTBS(Sketch1Points[S1I * 4 + 2], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]);

                // // S1I - S2B //
                // TESTBS(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 2], Sketch2Points[S2I * 4 + 3]);

            }
        }


    }
}

// class PseudoSketch {
//     [RelatedSketchID: number]: {
//         [Side: "0" | "1" | "A" | "B"]: {
//             [Type: "INTERSECT" | "WITHIN" | "BOUND"]: {

//             }
//         };
//         ["0"]: {

//         };
//         ["1"]: {
//             ["B"]: {
//                 ["BOUND"]: true;
//             };
//         };
//         ["A"]: {
//             ["B"]: {
//                 ["BOUND"]: true;
//                 ["INTERSECT"]: true;
//             };
//         };
//         ["B"]: {
//             ["B"]: {
//                 ["BOUND"]: true;
//                 ["WITHIN"]: true;
//                 ["INTERSECT"]: true;
//             };
//             ["1"]: {
//                 ["WITHIN"]: true;
//             };
//             ["A"]: {
//                 ["WITHIN"]: true;
//                 ["INTERSECT"]: true;
//             };
//         };




//         ["1"]: {
//             ["B"]: {
//                 ["BOUND"]: true;
//             };
//         };
//         ["A"]: {
//             ["B"]: {
//                 ["BOUND"]: true;
//                 ["INTERSECT"]: true;
//             };
//         };
//         ["B"]: {
//             ["B"]: {
//                 ["BOUND"]: true;
//                 ["INTERSECT"]: true;
//             };
//         };



//         ["B"]: {
//             ["B"]: {
//                 ["WITHIN"]: true;
//                 ["INTERSECT"]: true;
//             };
//             ["1"]: {
//                 ["WITHIN"]: true;
//             };
//             ["A"]: {
//                 ["WITHIN"]: true;
//                 ["INTERSECT"]: true;
//             };
//         };
//     };
// }

class RELATION_VALUE {
    ID: number;
    SIDE: string;
    TYPE: string;
    constructor(ID: number, SIDE: string, TYPE: string) {
        this.ID = ID;
        this.SIDE = SIDE;
        this.TYPE = TYPE;
    }
}

type RELATION = {
    // Value1: RELATION_VALUE;
    // Value2: RELATION_VALUE;
    Side1: string;
    Type1: string;

    Side2: string;
    Type2: string;

    Data: any;
}

class SKETCH_RELATION {
    Applied: boolean = false;
    Sketch1: SketchLine;
    Sketch2: SketchLine;
    Relations: RELATION[];
    constructor(Sketch1: SketchLine, Sketch2: SketchLine) {
        this.Sketch1 = Sketch1;
        this.Sketch2 = Sketch2;
        this.Relations = [];
    }
    Add(ID_A: number, SIDE_A: string, TYPE_A: string, ID_B: number, SIDE_B: string, TYPE_B: string, Data?: any) {
        let Relation = this.Get(ID_A, SIDE_A, TYPE_A, ID_B, SIDE_B, TYPE_B, Data); if (Relation) return Relation;
        Relation = this.Sketch1.ID == ID_A ? { Side1: SIDE_A, Type1: TYPE_A, Side2: SIDE_B, Type2: TYPE_B, Data: Data } : { Side1: SIDE_B, Type1: TYPE_B, Side2: SIDE_A, Type2: TYPE_A, Data: Data };
        this.Relations.push(Relation);
        if (!this.Applied) {
            this.Applied = true;
            SketchLine.AllRelations.push(this);
        };
        return Relation;
    }
    Get(ID_A: number, SIDE_A: string, TYPE_A: string, ID_B: number, SIDE_B: string, TYPE_B: string, SetData?: any) {
        for (let Relation of this.Relations) {
            if (this.Sketch1.ID == ID_A && this.Sketch2.ID == ID_B) {
                if (Relation.Side1 != SIDE_A || Relation.Side2 != SIDE_B) continue;
                if (Relation.Type1 != TYPE_A || Relation.Type2 != TYPE_B) continue;
            } else if (this.Sketch1.ID == ID_B && this.Sketch2.ID == ID_A) {
                if (Relation.Side1 != SIDE_B || Relation.Side2 != SIDE_A) continue;
                if (Relation.Type1 != TYPE_B || Relation.Type2 != TYPE_A) continue;
            }
            if (SetData) Relation.Data = SetData;
            return Relation;
        }
    }
    Find(SideA: string, TypeA: string, SideB: string, TypeB: string) {
        for (let Relation of this.Relations) {
            if (Relation.Side1 == SideA && Relation.Type1 == TypeA && Relation.Side2 == SideB && Relation.Type2 == TypeB) {
                return this.Sketch1.ID;
            } else if (Relation.Side2 == SideA && Relation.Type2 == TypeA && Relation.Side1 == SideB && Relation.Type1 == TypeB) {
                return this.Sketch2.ID;
            }
            // return Relation;
        }
    }
    List(SketchID: number, Side: string, Type: string) {
        let RelationList = [];
        for (let Relation of this.Relations) {
            if (this.Sketch1.ID == SketchID && Relation.Side1 == Side && Relation.Type1 == Type) {
                RelationList.push(["1", Relation]);
            } else if (this.Sketch2.ID == SketchID && Relation.Side2 == Side && Relation.Type2 == Type) {
                RelationList.push(["2", Relation]);
            }
        }
        return RelationList;
    }
    ListForSide(SketchID: number, Side: string) {
        let RelationList = [];
        for (let Relation of this.Relations) {
            if (this.Sketch1.ID == SketchID && Relation.Side1 == Side) {
                RelationList.push(["1", Relation]);
            } else if (this.Sketch2.ID == SketchID && Relation.Side2 == Side) {
                RelationList.push(["2", Relation]);
            }
        }
        return RelationList;
    }
    ListForType(SketchID: number, Type: string) {
        let RelationList = [];
        for (let Relation of this.Relations) {
            if (this.Sketch1.ID == SketchID && Relation.Type1 == Type) {
                RelationList.push(["1", Relation]);
            } else if (this.Sketch2.ID == SketchID && Relation.Type2 == Type) {
                RelationList.push(["2", Relation]);
            }
        }
        return RelationList;
    }
    ListOnlySide(Side: string) {
        let RelationList = [];
        for (let Relation of this.Relations) {
            if (Relation.Side1 == Side && Relation.Side2 == Side) {
                RelationList.push(Relation);
            }
        }
        return RelationList;
    }
    ListOnlyType(Type: string) {
        let RelationList = [];
        for (let Relation of this.Relations) {
            if (Relation.Type1 == Type && Relation.Type2 == Type) {
                RelationList.push(Relation);
            }
        }
        return RelationList;
    }
};

function GetRelations(Sketch1: SketchLine, Sketch2: SketchLine) {
    for (let Relations of SketchLine.AllRelations) {
        if (Relations.Sketch1 != Sketch1 && Relations.Sketch1 != Sketch2) continue;
        if (Relations.Sketch2 != Sketch1 && Relations.Sketch2 != Sketch2) continue;
        return Relations;
    }
    let Relations = new SKETCH_RELATION(Sketch1, Sketch2);
    // SketchLine.AllRelations.push(Relations);
    return Relations;
}

// console.log(SketchLine.AllRelations);