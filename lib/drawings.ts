/* eslint-disable prefer-const */
import * as BABYLON from "@babylonjs/core";
import { CFrame, segmentIntersection2D, Vector3 } from "./positioning";
import { Editor } from "./editor";
import * as BABYLON_EARCUT from "./earcut";

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

let PBR_Panel = [
    [3.3125, 1.25, 1],
    [1.875],
    [1.4375, .1875, .75],
    [2.0625],
    [1.4375, .1875, .75],
    [1.875],

    [3.3125, 1.25, 1],
    [1.875],
    [1.4375, .1875, .75],
    [2.0625],
    [1.4375, .1875, .75],
    [1.875],
    [3.3125, 1.25, 1],

    [1.875],
    [1.4375, .1875, .75],
    [2.0625],
    [1.4375, .1875, .75],
    [1.875],
    [3.3125, 1.25, 1],
];

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

    Panels: ExtrudedPolygonSettingsPeanut[] = [];

    constructor(ExtrudedLine: ExtrudedLine) {
        this.ActiveEditor = ExtrudedLine.ActiveEditor;
        this.ExtrudedLine = ExtrudedLine;

        let V0 = ExtrudedLine.FocusSketchLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 0 : 1];
        let V1 = ExtrudedLine.FocusSketchLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 1 : 0];

        if (ExtrudedLine.IsParallel) {
            this.LineASettings = { points: [ExtrudedLine.FocusPoint0 == "V0" ? V1 : V0, ExtrudedLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 1 : 0]], updatable: true };
            this.LineA = BABYLON.MeshBuilder.CreateLines("LINE", this.LineASettings, this.ActiveEditor.Scene);
            this.LineASettings.instance = this.LineA;
            this.LineA.color = new BABYLON.Color3(0, 1, 1);

            this.LineBSettings = { points: [ExtrudedLine.FocusPoint0 == "V0" ? V0 : V1, ExtrudedLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 0 : 1]], updatable: true };
            this.LineB = BABYLON.MeshBuilder.CreateLines("LINE", this.LineBSettings, this.ActiveEditor.Scene);
            this.LineBSettings.instance = this.LineB;
            this.LineB.color = new BABYLON.Color3(0, 1, 1);
        } else {
            this.LineASettings = { points: [V0, ExtrudedLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 0 : 1]], updatable: true };
            this.LineA = BABYLON.MeshBuilder.CreateLines("LINE", this.LineASettings, this.ActiveEditor.Scene);
            this.LineASettings.instance = this.LineA;
            this.LineA.color = new BABYLON.Color3(0, 1, 1);

            this.LineBSettings = { points: [V0, ExtrudedLine.LineSettings.points[ExtrudedLine.FocusPoint0 == "V0" ? 1 : 0]], updatable: true };
            this.LineB = BABYLON.MeshBuilder.CreateLines("LINE", this.LineBSettings, this.ActiveEditor.Scene);
            this.LineBSettings.instance = this.LineB;
            this.LineB.color = new BABYLON.Color3(0, 1, 1);
        }
        this.PolygonSettings = { sideOrientation: BABYLON.Mesh.DOUBLESIDE, shape: [this.LineASettings.points[0], this.LineASettings.points[1], this.LineBSettings.points[1], this.LineBSettings.points[0]], updatable: true };
        this.Polygon = BABYLON.MeshBuilder.CreatePolygon("POLY", this.PolygonSettings, this.ActiveEditor.Scene, BABYLON_EARCUT.earcut);

        let SurfID, FocusCF, Size, Points;
        SurfID = `SURFACE_${Math.floor(Math.random() * 0xff_ff_ff_ff)}`;
        FocusCF = ExtrudedLine.FocusSketchLine.CF0.ToWorldSpace(CFrame.Angles(0, 0, -Math.PI / 2));
        // Size = 
        Points = [
            this.LineASettings.points[0].ToCustom(),
            this.LineASettings.points[1].ToCustom(),
            this.LineBSettings.points[1].ToCustom(),
            this.LineBSettings.points[0].ToCustom(),
        ];

        let MinX, MinY, MinZ;
        let MaxX, MaxY, MaxZ;

        for (let FP of Points) {
            if (MinX == null) MinX = FP.x, MinY = FP.y, MinZ = FP.z, MaxX = FP.x, MaxY = FP.y, MaxZ = FP.z;
            MinX = Math.min(MinX, FP.x), MinY = Math.min(MinY, FP.y), MinZ = Math.min(MinZ, FP.z);
            MaxX = Math.max(MaxX, FP.x), MaxY = Math.max(MaxY, FP.y), MaxZ = Math.max(MaxZ, FP.z);
        }
        // Size = new Vector3(
        //     Math.abs(MaxX - MinX),
        //     Math.abs(MaxY - MinY),
        //     Math.abs(MaxZ - MinZ),
        // );

        // let FlattenedPoints = [];
        // for (let Point of Points) {
        //     let FP = MapToFlat(FocusCF, Size, Point);
        //     FlattenedPoints.push(FP.Position.ToBabylon());
        // }
        // let Center = new BABYLON.Vector3(-(MinX + MaxX) / 2, -(MinY + MaxY) / 2, -(MinZ + MaxZ) / 2);
        // FlattenedPoints.push(FlattenedPoints[0]);

        let Polygon = this.Polygon;
        let material = new BABYLON.StandardMaterial("material", this.ActiveEditor.Scene);
        // material.backFaceCulling = false;
        Polygon.enableEdgesRendering();
        Polygon.edgesWidth = 8;
        Polygon.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        Polygon.material = material;

        // let FlatPolygon = BABYLON.MeshBuilder.CreatePolygon(SurfID, { shape: FlattenedPoints, sideOrientation: BABYLON.Mesh.DOUBLESIDE, updatable: true }, PanelScene);
        // // FlatPolygon.position = Size.Scale(1 / 2).ToBabylon();
        // FlatPolygon.position = Center;

        // // let material2 = new BABYLON.StandardMaterial("material", PanelScene);
        // FlatPolygon.material = material2;

        // Polygon.PanelAlt = FlatPolygon;
        // FlatPolygon.isVisible = false;

        let NewCF = FocusCF.ToWorldSpace(CFrame.Angles(0, 0, -Math.PI / 2)); // FocusCF; // CFrame.Angles(0, 0, -Math.PI / 2).ToWorldSpace(FocusCF); //.ToWorldSpace(Surface.FocusCF);
        let BBL = NewCF.ToBabylon(); // I had to name this variable BBL. LOL
        console.log(BBL);
        this.BBL = BBL;
        this.Polygon.position.copyFrom(this.BBL[0]);
        this.Polygon.rotationQuaternion?.copyFrom(this.BBL[1]);
        // Polygon.convertToFlatShadedMesh();
        // Polygon.forceSharedVertices();
        // Polygon.refreshBoundingInfo(); // true is an argument apparently?
        // Polygon.isPickable = true;
        // Polygon.actionManager = actionManager;


        this.MAT = new BABYLON.StandardMaterial("material", this.ActiveEditor.Scene);
        this.MAT.diffuseColor = this.ExtrudedLine.IsParallel ? new BABYLON.Color3(0, 0, 1) : new BABYLON.Color3(1, 0, 0);
    }

    Update() {
        this.LineA = BABYLON.MeshBuilder.CreateLines("LINE", this.LineASettings);
        this.LineB = BABYLON.MeshBuilder.CreateLines("LINE", this.LineBSettings);
        this.Polygon?.dispose();

        let MainLength = this.ExtrudedLine.IsParallel ? this.ExtrudedLine.CF0.Distance(this.ExtrudedLine.CF1) : 0;
        let BottomLength = MainLength + this.ExtrudedLine.ExtrudeA + this.ExtrudedLine.ExtrudeB;
        let TopCF = CFrame.fromXYZ(MainLength, 0, 0);

        let RoofAngle = CFrame.Angles(Math.atan2(this.ExtrudedLine.PITCH, 12), 0, 0);
        // let RoofAngle = CFrame.Angles(Math.atan2(12, this.ExtrudedLine.PITCH), 0, 0);

        let FlattenedPoints = [
            RoofAngle.Inverse().Position,
            RoofAngle.ToObjectSpace(this.ExtrudedLine.A0).Position,
            RoofAngle.ToObjectSpace(TopCF).ToWorldSpace(this.ExtrudedLine.B0).Position,
            RoofAngle.ToObjectSpace(TopCF).Position,
        ];

        let FocusCF = (this.ExtrudedLine.IsParallel ? this.ExtrudedLine.CF0.ToWorldSpace(CFrame.Angles(0, Math.PI / 2, 0)) : this.ExtrudedLine.CF0).ToWorldSpace(RoofAngle); // EdgeCF; // HeadingCF.Rotation.TranslateAdd(Averaged);

        let ExtrudeLength = (this.ExtrudedLine.RISE ** 2 + this.ExtrudedLine.RUN ** 2) ** .5;

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
        this.Polygon = BABYLON.MeshBuilder.CreatePolygon("POLY", this.PolygonSettings, null, BABYLON_EARCUT.earcut);
        this.Polygon.material = this.MAT;
        // let NewCF = CFrame.lookAt(this.LineASettings.points[0].ToCustom().Average(this.LineBSettings.points[0].ToCustom()), this.LineASettings.points[1].ToCustom().Average(this.LineBSettings.points[1].ToCustom())); // FocusCF.ToWorldSpace(CFrame.Angles(0, 0, -Math.PI / 2)); // FocusCF; // CFrame.Angles(0, 0, -Math.PI / 2).ToWorldSpace(FocusCF); //.ToWorldSpace(Surface.FocusCF);
        let BBL = FocusCF.ToBabylon(); // I had to name this variable BBL. LOL
        this.BBL = BBL;
        this.Polygon.position.copyFrom(this.BBL[0]);
        this.Polygon.rotationQuaternion = this.BBL[1]; //.copyFrom(this.BBL[1]);

        // this.Polygon.rotate(NewCF.RightVector.ToBabylon(), -Math.PI / 4, BABYLON.Space.WORLD);

        let PanelThickness = .0179;

        let shape = []; // new BABYLON.Vector3(0, 0, 0)];

        let X = -PBR_Panel[0][0] / 2;
        let Y = PanelThickness;

        shape.push(new BABYLON.Vector3(-X, Y, 0));

        for (let P of PBR_Panel) {
            let Outer = P[0];
            let Extrude = P.length > 1 ? P[1] : 0;
            let Inner = P.length > 2 ? P[2] : 0;

            X += Outer / 2 - Inner / 2;
            Y += Extrude;
            shape.push(new BABYLON.Vector3(-X, Y, 0));

            X += Inner;
            shape.push(new BABYLON.Vector3(-X, Y, 0));

            X += Outer / 2 - Inner / 2;
            Y -= Extrude;
            shape.push(new BABYLON.Vector3(-X, Y, 0));
        }

        // shape.push(new BABYLON.Vector3(-X, 0, 0));


        const path = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(0, 0, 1e-6),
            // new BABYLON.Vector3(0, 0, 10),
            // new BABYLON.Vector3(0, 0, -Size.Z),
            // new BABYLON.Vector3(0, 0, -Size.Z + .001),
        ];

        let MaxPanels = Math.ceil(BottomLength / 36);
        for (let i = 0; i < MaxPanels; i++) {
            // if (i + 1 >= MaxPanels) {
            //     shape = [];
            //     let X = -PBR_Panel[0][0] / 2;
            //     let Y = PanelThickness;

            //     shape.push(new BABYLON.Vector3(-X, Y, 0));

            //     for (let P of PBR_Panel) {
            //         let Outer = P[0];
            //         let Extrude = P.length > 1 ? P[1] : 0;
            //         let Inner = P.length > 2 ? P[2] : 0;

            //         X += Outer / 2 - Inner / 2;
            //         Y += Extrude;
            //         shape.push(new BABYLON.Vector3(-X, Y, 0));
            //         // if (X + i * 36 >= BottomLength) break;

            //         X += Inner;
            //         shape.push(new BABYLON.Vector3(-X, Y, 0));

            //         X += Outer / 2 - Inner / 2;
            //         Y -= Extrude;
            //         shape.push(new BABYLON.Vector3(-X, Y, 0));
            //     }
            // };
            // shapePath.map(v => new BABYLON.Vector3(v.x, PanelThickness, v.z - v.x - Size.Z));
            let capFunction = (shapePath: BABYLON.Vector3[]) => {
                let mapped: BABYLON.Vector3[] = [];
                for (let v of shapePath) {
                    let Height = 0;
                    // let EE = Math.sin(Math.atan2(this.ExtrudedLine.ExtrudeA, this.ExtrudedLine.RUN));
                    let EE = Math.cos(Math.atan2(this.ExtrudedLine.RUN, this.ExtrudedLine.ExtrudeA));
                    if (v.x + (i + 1) * 36 <= this.ExtrudedLine.ExtrudeA) {
                        // Height = (v.x + (i + 1) * 36) / Math.sin(Math.atan2(this.ExtrudedLine.RISE, this.ExtrudedLine.RUN));
                        // Height = (v.x + (i + 1) * 36) / Math.sin(Math.atan2(this.ExtrudedLine.RISE, this.ExtrudedLine.ExtrudeA));
                        Height = (v.x + (i + 1) * 36) / EE;
                    } else if (v.x + (i + 1) * 36 <= this.ExtrudedLine.ExtrudeA + MainLength) {
                        Height = ExtrudeLength;
                    } else {
                        // Height = (BottomLength - (v.x + (i + 1) * 36)) / Math.sin(Math.atan2(this.ExtrudedLine.RISE, this.ExtrudedLine.RUN));
                        // Height = (BottomLength - (v.x + (i + 1) * 36)) / Math.sin(Math.atan2(this.ExtrudedLine.RISE, this.ExtrudedLine.ExtrudeA));
                        Height = (BottomLength - (v.x + (i + 1) * 36)) / EE; // Math.sin(Math.atan2(this.ExtrudedLine.PITCH, 12));
                    }
                    mapped.push(new BABYLON.Vector3(v.x, v.y + PanelThickness, -Math.min(Math.max(0, Height), ExtrudeLength))); // v.z - v.x - Size.Z - i * 36));
                };
                return mapped;
            };

            let PanelSettings = this.Panels.length >= i + 1 ? this.Panels[i] : null;
            if (!PanelSettings) {
                PanelSettings = {
                    shape,
                    path,
                    scaleFunction: (i: number, distance: number) => 1, // -distance * .02, // 1.0 - 0.02 * -distance,  // taper with distance
                    rotationFunction: (i: number, distance: number) => 0,
                    capFunction: capFunction,
                    cap: BABYLON.Mesh.CAP_END,
                    // capFunction: (shapePath: BABYLON.Vector3[]) => shapePath.map(v => new BABYLON.Vector3(v.x, 0, v.z)),
                    // cap: BABYLON.Mesh.CAP_ALL,
                    sideOrientation: BABYLON.Mesh.DOUBLESIDE, // DEFAULTSIDE,
                    updatable: true,
                };
                PanelSettings.instance = BABYLON.MeshBuilder.ExtrudeShapeCustom(`PANEL_${i}`, PanelSettings, null); // .convertToFlatShadedMesh(); // this.ActiveEditor.Scene);
                // PanelSettings.instance.convertToFlatShadedMesh();
                // PanelSettings.instance.optimizeIndices();

                // PanelSettings.instance.enableEdgesRendering();
                // PanelSettings.instance.edgesWidth = 8;
                // PanelSettings.instance.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

                // PanelSettings.instance.forceSharedVertices();
                // PanelSettings.instance.refreshBoundingInfo(); // true is an argument apparently?



                this.Panels.push(PanelSettings);
            } else {
                // PanelSettings.shape = shape;
                // PanelSettings.path = path;
                PanelSettings.capFunction = capFunction;
                PanelSettings.instance = BABYLON.MeshBuilder.ExtrudeShapeCustom(`PANEL_${i}`, PanelSettings); // .convertToFlatShadedMesh();
            };
            let Panel = PanelSettings.instance as BABYLON.Mesh;
            // Panel.position.set(i * 36, i * 36, 0);
            // i * 36 - this.ExtrudedLine.ExtrudeA
            let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ((i + 1) * 36 - this.ExtrudedLine.ExtrudeA, PanelThickness, ExtrudeLength)).ToBabylon();
            Panel.position.set(P_BBL[0].x, P_BBL[0].y, P_BBL[0].z);
            Panel.rotationQuaternion = P_BBL[1]; //.copyFrom(this.BBL[1]);
            Panel.material = this.MAT;
        };

        let Max = this.Panels.length;
        for (let i = MaxPanels; i < Max; i++) {
            // let PanelSettings = Max >= i + 1 ? this.Panels[i] : null;
            // if (!PanelSettings) continue;
            // delete this.Panels[i];
            this.Panels.pop()?.instance?.dispose();
        };

        // Panels

        // BABYLON.MeshBuilder.ExtrudeShapeCustom("POLY",)
    }

    Delete() {
        this.LineA?.dispose();
        this.LineB?.dispose();
        this.Polygon?.dispose();
        for (let PanelSettings of this.Panels) PanelSettings.instance?.dispose();
        // delete this;
    }
}
export class ExtrudedLine {
    ActiveEditor: Editor;

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
    FocusPoint0: string;
    FocusPoint1: string;
    IsParallel = true; // PERPENDICULAR | PARALLEL

    ExtrudeA = 0;
    ExtrudeB = 0;

    LineSettings: LineSettingsPeanut;
    Line: BABYLON.LinesMesh;

    SketchExtrusionLines: ExtrusionLines;

    constructor(FocusSketchLine: SketchLine, FocusPoint0: string, FocusPoint1: string, IsParallel = true) {
        this.ActiveEditor = FocusSketchLine.ActiveEditor;
        this.FocusSketchLine = FocusSketchLine;
        this.FocusPoint0 = FocusPoint0;
        this.FocusPoint1 = FocusPoint1;
        this.IsParallel = IsParallel;

        this.LineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
        this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings, this.ActiveEditor.Scene);
        this.LineSettings.instance = this.Line;
        this.Line.color = new BABYLON.Color3(0, 1, 0);

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

        this.CF0 = CFrame.lookAt(this.FocusSketchLine[this.FocusPoint0], this.FocusSketchLine[this.FocusPoint1]);
        this.CF1 = CFrame.lookAt(this.FocusSketchLine[this.FocusPoint1], this.FocusSketchLine[this.FocusPoint0]);

        let RUN = this.RUN;
        let RISE = this._RISE;

        if (this.IsParallel) {
            this.A0 = CFrame.fromXYZ(-RUN, -RISE, this.ExtrudeA);
            this.B0 = CFrame.fromXYZ(RUN, -RISE, this.ExtrudeB);
            this.A1 = this.CF0;
            this.B1 = this.CF1;
        } else {
            this.A0 = CFrame.fromXYZ(this.ExtrudeA, -RISE, RUN);
            this.B0 = CFrame.fromXYZ(-this.ExtrudeB, -RISE, RUN);
            this.A1 = this.CF0;
            this.B1 = this.CF0;
        }

        let CF_A = this.A1.ToWorldSpace(this.A0);
        let CF_B = this.B1.ToWorldSpace(this.B0);
        this.LineSettings.points[0].set(CF_A.X, CF_A.Y, CF_A.Z);
        this.LineSettings.points[1].set(CF_B.X, CF_B.Y, CF_B.Z);

        this.SketchExtrusionLines?.Update();
        this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
    }

    Delete() {
        this.Line?.dispose();
        this.SketchExtrusionLines?.Delete();
        // delete this;
    }
}

export class SketchLine {
    [x: string]: Vector3 | any;
    ActiveEditor: Editor;

    static ActiveSketch?: SketchLine | null;
    static AllDrawings: SketchLine[] = [];
    static AllRelations: SKETCH_RELATION[] = [];
    static DrawingScale = .29858;

    ID = Math.floor(Math.random() * 0xff_ff_ff_ff);

    X0 = 0; Y0 = 0;
    X1 = 0; Y1 = 0;
    Z0 = 0; Z1 = 0; // Lower | Upper \\

    constructor(ActiveEditor: Editor, X: number, Y: number, Z: number) {
        this.ActiveEditor = ActiveEditor;

        this.X0 = X; this.X1 = X;
        this.Y0 = Y; this.Y1 = Y;
        this.Z0 = Z; this.Z1 = Z;
        this._Pointer = CFrame.fromXYZ(this.X1, this.Z1, this.Y1);
        this.CF0 = CFrame.lookAt(this.V0, this.V1);
        this.CF1 = CFrame.lookAt(this.V1, this.V0);
        this.LineSettings = { points: [new BABYLON.Vector3(this.X0, this.Z1, this.Y0), new BABYLON.Vector3(this.X1, this.Z1, this.Y1)], updatable: true };
        this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings, ActiveEditor.Scene);
        this.LineSettings.instance = this.Line;
        this.Line.color = new BABYLON.Color3(0, 0, 1);
    }

    /*
        1
      A2 B3
        0
    */

    DrawingMode = "LINE"; // LINE | EXTRUSION \\
    HasLine = false;
    HasExtruded = false;

    LineSettings: LineSettingsPeanut;
    Line: BABYLON.LinesMesh;

    Line0!: ExtrudedLine;
    Line1!: ExtrudedLine;
    LineA!: ExtrudedLine;
    LineB!: ExtrudedLine;

    SnapAngle: number = 0;
    AnchorPoint: number = 1;

    CF0: CFrame;
    CF1: CFrame;

    V0 = new Vector3();
    V1 = new Vector3();
    _Pointer: CFrame;

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
        this.V0.ApplyXYZ(this.X0, this.Z1, this.Y0);
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
                let AbsX = Math.max(0, LocalPosition.Z); // Math.abs(this.LineSettings.points[1].x - X);
                let AbsY = Math.abs(LocalPosition.X); // Math.abs(this.LineSettings.points[1].z - Y);
                // let DEGG = Math.atan2(AbsX, AbsY) * 180 / Math.PI; // Dan Reynolds Egg
                if (!Shift) /*if (DEGG <= 0) AbsX = 0; else*/ if (AbsX > AbsY) AbsY = AbsX; else AbsX = AbsY;
                AbsX = Math.round(AbsX);
                AbsY = Math.round(AbsY);

                this.Line0.RUN = AbsX;
                this.Line1.RUN = AbsX;
                this.LineA.RUN = AbsY;
                this.LineB.RUN = AbsY;

                this.Line0.RISE = this.LineA.RISE;
                this.Line1.RISE = this.Line0.RISE;
                break;
            }
            case "LINE": {
                let DistanceFromPointer = this._Pointer.Distance(this.V0);
                let LookVector = CFrame.lookAt(this.V0, this._Pointer.Position).LookVector; // let LookCFrame = (DistanceFromPointer <= .1 ? CFrame.identity : CFrame.lookAt(this.V0, this._Pointer.Position));
                let X1D = LookVector.X; let Y1D = LookVector.Z;
                if (!Shift) {
                    let E2 = CFrame.Angles(0, -this.SnapAngle, 0).ToObjectSpace(CFrame.fromVector3(this.V0).ToObjectSpace(this._Pointer));
                    if (Math.abs(E2.X) < Math.abs(E2.Z)) { DistanceFromPointer = E2.Z; X1D = -Math.sin(this.SnapAngle); Y1D = Math.cos(this.SnapAngle); }
                    else { DistanceFromPointer = E2.X; X1D = Math.cos(this.SnapAngle); Y1D = Math.sin(this.SnapAngle); }
                }
                this.X1 = this.X0 + X1D * Math.round(DistanceFromPointer);
                this.Y1 = this.Y0 + Y1D * Math.round(DistanceFromPointer);
                break;
            }
        }

        this.UpdateLines();

        this.ActiveEditor.UI_Controls.LineLength.text = this.Format(((this.X0 - this.X1) ** 2 + (this.Y0 - this.Y1) ** 2 + (this.Z0 - this.Z1) ** 2) ** .5);
        this.ActiveEditor.UI_Controls.Info1.text = this.Format(this.Z1);

        if (!this.HasLine) return;

        this.ActiveEditor.UI_Controls.Info2.text = this.Format(this.AnchorPoint * Math.max(this.Line0.RISE, this.Line1.RISE, this.LineA.RISE, this.LineB.RISE));

        this.ActiveEditor.UI_Controls.LiveXData.Marker.position.copyFrom(this.Line1.LineSettings.points[0].add(this.Line1.LineSettings.points[1]).scale(.5));
        this.ActiveEditor.UI_Controls.LiveYData.Marker.position.copyFrom(this.LineB.LineSettings.points[0].add(this.LineB.LineSettings.points[1]).scale(.5));
        let AltPitch = this.LineB.RISE / this.Line0.ExtrudeB * 12; let AltPitchRounded = this.Format(AltPitch);
        let Line1Length = this.Format(this.Line1.LineSettings.points[1].subtract(this.Line1.LineSettings.points[0]).length());
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = this.Line0.ExtrudeB == 0 ? Line1Length : `${AltPitchRounded != this.Format(AltPitch) ? `~${AltPitchRounded}` : AltPitch}\n${Line1Length}\n+${this.Format(this.Line0.ExtrudeB)}`;
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = `${this.LineB.PITCH}\n${this.Format(this.LineB.LineSettings.points[1].subtract(this.LineB.LineSettings.points[0]).length())}\n-${this.Format(this.LineB.RISE)}`;

        this.ActiveEditor.UI_Controls.Pitch0.text = this.Format(this.Line0.PITCH);
        this.ActiveEditor.UI_Controls.Pitch1.text = this.Format(this.Line1.PITCH);
        this.ActiveEditor.UI_Controls.Pitch2.text = this.Format(this.LineA.PITCH);
        this.ActiveEditor.UI_Controls.Pitch3.text = this.Format(this.LineB.PITCH);

        this.ActiveEditor.UI_Controls.Run0.text = this.Format(this.Line0.RUN);
        this.ActiveEditor.UI_Controls.Run1.text = this.Format(this.Line1.RUN);
        this.ActiveEditor.UI_Controls.Run2.text = this.Format(this.LineA.RUN);
        this.ActiveEditor.UI_Controls.Run3.text = this.Format(this.LineB.RUN);

        this.ActiveEditor.UI_Controls.Rise0.text = this.Format(this.Line0.RISE);
        this.ActiveEditor.UI_Controls.Rise1.text = this.Format(this.Line1.RISE);
        this.ActiveEditor.UI_Controls.Rise2.text = this.Format(this.LineA.RISE);
        this.ActiveEditor.UI_Controls.Rise3.text = this.Format(this.LineB.RISE);

        // }
    }
    UpdateLines() {
        if (this.DrawingMode == "LINE") {
            this.LineSettings.points[1].set(this.X1, this.Z1, this.Y1);
            this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = `${Math.round(((this.X0 - this.X1) ** 2 + (this.Y0 - this.Y1) ** 2 + (this.Z0 - this.Z1) ** 2) ** .5 * 100) / 100}`;
            this.ActiveEditor.UI_Controls.LiveDistanceData.Marker.position.copyFrom(this.LineSettings.points[0].add(this.LineSettings.points[1]).scale(.5));
        }
        // if (this.DrawingMode == "EXTRUSION") {
        if (!this.HasLine) return;
        this.Line0.ExtrudeA = this.LineA.RUN;
        this.Line0.ExtrudeB = this.LineB.RUN;
        this.Line1.ExtrudeA = this.LineB.RUN;
        this.Line1.ExtrudeB = this.LineA.RUN;

        this.LineA.ExtrudeA = this.Line1.RUN;
        this.LineA.ExtrudeB = this.Line0.RUN;
        this.LineB.ExtrudeA = this.Line0.RUN;
        this.LineB.ExtrudeB = this.Line1.RUN;
        let YYY = this.AnchorPoint * Math.max(this.Line0.RISE, this.Line1.RISE, this.LineA.RISE, this.LineB.RISE);
        this.V0.Y = this.Z1 + YYY;
        this.V1.ApplyXYZ(this.X1, this.Z1 + YYY, this.Y1);
        this.LineSettings.points[0].set(this.X0, this.Z1 + YYY, this.Y0);
        this.LineSettings.points[1].set(this.X1, this.Z1 + YYY, this.Y1);
        this.ActiveEditor.UI_Controls.LiveDistanceData.Marker.position.copyFrom(this.LineSettings.points[0].add(this.LineSettings.points[1]).scale(.5));
        this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
        this.CF0 = CFrame.lookAt(this.V0, this.V1);
        this.CF1 = CFrame.lookAt(this.V1, this.V0);

        this.Line0.Update();
        this.Line1.Update();
        this.LineA.Update();
        this.LineB.Update();
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
        this.V1.ApplyXYZ(this.X1, this.Z1, this.Y1);
        this.CF0 = CFrame.lookAt(this.V0, this.V1);
        this.CF1 = CFrame.lookAt(this.V1, this.V0);
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = "";
        if (this.HasExtruded) {
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = "";
            SketchLine.AllDrawings.push(this);
            this.UpdateInterceptions();
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

            this.Line0 = new ExtrudedLine(this, "V0", "V1", false); this.Line0.PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText0.text; // "RUN";
            this.Line1 = new ExtrudedLine(this, "V1", "V0", false); this.Line1.PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText1.text; // "RUN";
            this.LineA = new ExtrudedLine(this, "V1", "V0", true); this.LineA.PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText2.text;
            this.LineB = new ExtrudedLine(this, "V0", "V1", true); this.LineB.PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText3.text;
            // this.LineA = new ExtrudedLine(this, "V0", "V1", true);
            // this.LineB = new ExtrudedLine(this, "V1", "V0", true);
            this.Line0.ENABLED = this.ActiveEditor.UI_Controls.Checkbox0.isChecked;
            this.Line1.ENABLED = this.ActiveEditor.UI_Controls.Checkbox1.isChecked;
            this.LineA.ENABLED = this.ActiveEditor.UI_Controls.Checkbox2.isChecked;
            this.LineB.ENABLED = this.ActiveEditor.UI_Controls.Checkbox3.isChecked;
        }
    }
    Delete() {
        this.Line?.dispose();
        this.Line0?.Delete();
        this.Line1?.Delete();
        this.LineA?.Delete();
        this.LineB?.Delete();
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = "";
        // delete this;
    }

    SketchOverlap(Sketch2: SketchLine) {
        let Sketch1 = this;
        let SketchRelations = GetRelations(Sketch1, Sketch2);

        let Sketch1Points = [
            Sketch1.Line0.SketchExtrusionLines.LineASettings.points[0], // 0
            Sketch1.Line0.SketchExtrusionLines.LineASettings.points[1], // 1
            Sketch1.Line0.SketchExtrusionLines.LineBSettings.points[1], // 2
            Sketch1.Line0.SketchExtrusionLines.LineBSettings.points[0], // 3

            Sketch1.LineB.SketchExtrusionLines.LineASettings.points[0], // 4
            Sketch1.LineB.SketchExtrusionLines.LineASettings.points[1], // 5
            Sketch1.LineB.SketchExtrusionLines.LineBSettings.points[1], // 6
            Sketch1.LineB.SketchExtrusionLines.LineBSettings.points[0], // 7

            Sketch1.Line1.SketchExtrusionLines.LineASettings.points[0], // 8
            Sketch1.Line1.SketchExtrusionLines.LineASettings.points[1], // 9
            Sketch1.Line1.SketchExtrusionLines.LineBSettings.points[1], // 10
            Sketch1.Line1.SketchExtrusionLines.LineBSettings.points[0], // 11

            Sketch1.LineA.SketchExtrusionLines.LineASettings.points[0], // 12
            Sketch1.LineA.SketchExtrusionLines.LineASettings.points[1], // 13
            Sketch1.LineA.SketchExtrusionLines.LineBSettings.points[1], // 14
            Sketch1.LineA.SketchExtrusionLines.LineBSettings.points[0], // 15
        ];

        let Sketch2Points = [
            Sketch2.Line0.SketchExtrusionLines.LineASettings.points[0], // 0
            Sketch2.Line0.SketchExtrusionLines.LineASettings.points[1], // 1
            Sketch2.Line0.SketchExtrusionLines.LineBSettings.points[1], // 2
            Sketch2.Line0.SketchExtrusionLines.LineBSettings.points[0], // 3

            Sketch2.LineB.SketchExtrusionLines.LineASettings.points[0], // 4
            Sketch2.LineB.SketchExtrusionLines.LineASettings.points[1], // 5
            Sketch2.LineB.SketchExtrusionLines.LineBSettings.points[1], // 6
            Sketch2.LineB.SketchExtrusionLines.LineBSettings.points[0], // 7

            Sketch2.Line1.SketchExtrusionLines.LineASettings.points[0], // 8
            Sketch2.Line1.SketchExtrusionLines.LineASettings.points[1], // 9
            Sketch2.Line1.SketchExtrusionLines.LineBSettings.points[1], // 10
            Sketch2.Line1.SketchExtrusionLines.LineBSettings.points[0], // 11

            Sketch2.LineA.SketchExtrusionLines.LineASettings.points[0], // 12
            Sketch2.LineA.SketchExtrusionLines.LineASettings.points[1], // 13
            Sketch2.LineA.SketchExtrusionLines.LineBSettings.points[1], // 14
            Sketch2.LineA.SketchExtrusionLines.LineBSettings.points[0], // 15
        ];

        // function TESTBS(S1P1, S1P2, S2P1, S2P2) {
        //     let BoundAInter2D = segmentIntersection2D(S1P1, S1P2, S2P1, S2P2);
        //     if (BoundAInter2D && (0 <= BoundAInter2D.t1 && BoundAInter2D.t1 <= 1 && 0 <= BoundAInter2D.t2 && BoundAInter2D.t2 <= 1)) {
        //         DrawLine([S1P1, S1P2]);
        //         DrawLine([S2P1, S2P2]);
        //     }
        // }

        for (let S1I = 0; S1I < 4; S1I++) {
            let Side1 = S1I == 0 ? "0" : S1I == 1 ? "B" : S1I == 2 ? "1" : S1I == 3 ? "A" : S1I;
            let Polygon1 = [Sketch1Points[S1I * 4], Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch1Points[S1I * 4 + 3]];
            for (let S2I = 0; S2I < 4; S2I++) {
                let Side2 = S2I == 0 ? "0" : S2I == 1 ? "B" : S2I == 2 ? "1" : S2I == 3 ? "A" : S2I;
                let Polygon2 = [Sketch2Points[S2I * 4], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2], Sketch2Points[S2I * 4 + 3]];
                for (let Offset = 0; Offset < 4; Offset++) {
                    let Polygon1Within2 = Sketch1Points[S1I * 4 + Offset].PointInPolygon(Polygon2);
                    let Polygon2Within1 = Sketch2Points[S2I * 4 + Offset].PointInPolygon(Polygon1);
                    // WithinSketch1[`WITHIN-${Side2}`]
                    // if (Polygon1Within2 || Polygon2Within1) {
                    //     DrawLine(Polygon1).color = new BABYLON.Color3(1, 1, 0);
                    //     DrawLine(Polygon2).color = new BABYLON.Color3(1, 1, 0);
                    // }
                    if (Polygon1Within2) {
                        this.ActiveEditor.DrawLine(Polygon1).color = new BABYLON.Color3(1, .5, 0);
                        this.ActiveEditor.DrawLine(Polygon2).color = new BABYLON.Color3(1, 1, 0);
                    }
                    if (Polygon2Within1) {
                        this.ActiveEditor.DrawLine(Polygon1).color = new BABYLON.Color3(1, 1, 0);
                        this.ActiveEditor.DrawLine(Polygon2).color = new BABYLON.Color3(1, .5, 0);
                    }
                    if (Polygon1Within2) SketchRelations.Add(new RELATION_VALUE(Sketch1.ID, Side1, "WITHIN"), new RELATION_VALUE(Sketch2.ID, Side2, "BOUND"));
                    if (Polygon2Within1) SketchRelations.Add(new RELATION_VALUE(Sketch1.ID, Side1, "BOUND"), new RELATION_VALUE(Sketch2.ID, Side2, "WITHIN"));
                }

                let BoundInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]);
                if (BoundInter2D && (0 <= BoundInter2D.t1 && BoundInter2D.t1 <= 1 && 0 <= BoundInter2D.t2 && BoundInter2D.t2 <= 1)) {
                    this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2]]);
                    this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]]);
                    SketchRelations.Add(new RELATION_VALUE(Sketch1.ID, Side1, "INTERSECT"), new RELATION_VALUE(Sketch2.ID, Side2, "INTERSECT"));
                    console.log(S1I, S2I, BoundInter2D);
                }

                if (!SketchRelations.Applied) continue;

                let CenterAInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]);
                if (CenterAInter2D && (0 <= CenterAInter2D.t1 && CenterAInter2D.t1 <= 1 && 0 <= CenterAInter2D.t2 && CenterAInter2D.t2 <= 1)) {
                    this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2]]);
                    this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]]);
                    SketchRelations.Add(new RELATION_VALUE(Sketch1.ID, Side1, "A-CINTERSECT"), new RELATION_VALUE(Sketch2.ID, Side2, "CINTERSECT"));
                    console.log(S1I, S2I, CenterAInter2D);
                }

                let CenterBInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]);
                if (CenterBInter2D && (0 <= CenterBInter2D.t1 && CenterBInter2D.t1 <= 1 && 0 <= CenterBInter2D.t2 && CenterBInter2D.t2 <= 1)) {
                    this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3]]);
                    this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]]);
                    SketchRelations.Add(new RELATION_VALUE(Sketch1.ID, Side1, "CINTERSECT"), new RELATION_VALUE(Sketch2.ID, Side2, "B-CINTERSECT"));
                    console.log(S1I, S2I, CenterBInter2D);
                }

                let CenterInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]);
                if (CenterInter2D && (0 <= CenterInter2D.t1 && CenterInter2D.t1 <= 1 && 0 <= CenterInter2D.t2 && CenterInter2D.t2 <= 1)) {
                    this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3]]).color = new BABYLON.Color3(1, 1, 1);
                    this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]]).color = new BABYLON.Color3(1, 1, 1);
                    SketchRelations.Add(new RELATION_VALUE(Sketch1.ID, Side1, "CINTERSECT"), new RELATION_VALUE(Sketch2.ID, Side2, "CINTERSECT"));
                    console.log(S1I, S2I, CenterInter2D);
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
    Value1: RELATION_VALUE;
    Value2: RELATION_VALUE;
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
    Add(Sketch1Value: RELATION_VALUE, Sketch2Value: RELATION_VALUE) {
        for (let Relation of this.Relations) {
            if (Relation.Value1.ID == Sketch1Value.ID && Relation.Value2.ID == Sketch2Value.ID) {
                if (Relation.Value1.SIDE != Sketch1Value.SIDE || Relation.Value2.SIDE != Sketch2Value.SIDE) continue;
                if (Relation.Value1.TYPE != Sketch1Value.TYPE || Relation.Value2.TYPE != Sketch2Value.TYPE) continue;
            } else if (Relation.Value1.ID == Sketch2Value.ID && Relation.Value2.ID == Sketch1Value.ID) {
                if (Relation.Value1.SIDE != Sketch2Value.SIDE || Relation.Value2.SIDE != Sketch1Value.SIDE) continue;
                if (Relation.Value1.TYPE != Sketch2Value.TYPE || Relation.Value2.TYPE != Sketch1Value.TYPE) continue;
            }
            return Relation;
        }
        let Relation = { Value1: Sketch1Value, Value2: Sketch2Value };
        this.Relations.push(Relation);
        if (!this.Applied) {
            this.Applied = true;
            SketchLine.AllRelations.push(this);
        };
        return Relation;
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