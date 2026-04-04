import * as BABYLON from "@babylonjs/core";
import * as BABYLON_EARCUT from "./earcut";
import { Editor } from "./editor";
import { CFrame, Vector3 } from "./positioning";
import { SketchPlane, PanelProfiles, PanelProfile } from "./drawings";

declare module "./positioning" {
    interface Vector3 {
        ToBabylon(): BABYLON.Vector3;
    }
    interface CFrame {
        ToBabylon(): [BABYLON.Vector3, BABYLON.Quaternion];
    }
}

Vector3.prototype.ToBabylon = function () { return new BABYLON.Vector3(this.X, this.Y, this.Z); };

CFrame.prototype.ToBabylon = function () {
    var Q = this.ToQuaternion();
    return [this.Position.ToBabylon(), new BABYLON.Quaternion(Q[0], Q[1], Q[2], Q[3])];
}

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

declare module "./drawings" {
    interface SketchPlane {
        InnerFocusLineSettings: LineSettingsPeanut;
        MiddleFocusLineSettings: LineSettingsPeanut;
        OuterFocusLineSettings: LineSettingsPeanut;
        TopLineSettings: LineSettingsPeanut;
        BottomLineSettings: LineSettingsPeanut;
        LineASettings: LineSettingsPeanut;
        LineBSettings: LineSettingsPeanut;

        Polygon: BABYLON.Mesh;
        PolygonSettings: PolygonSettingsPeanut;

        Panel: BABYLON.Mesh;

        PanelSettings: ExtrudedPolygonSettingsPeanut;

        MAT: BABYLON.PBRMetallicRoughnessMaterial;

        BabylonInitialize(): void;
        UpdateBabylon(): void;
        UpdatePanelMesh(): void;
        UpdateFocusLine(): void;
        DeleteBabylon(): void;
    }
}

SketchPlane.prototype.BabylonInitialize = function () {
    if (!this.ActiveEditor) return;
    const ShowDebugLines = true;

    this.InnerFocusLineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    this.MiddleFocusLineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    this.OuterFocusLineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    this.TopLineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    this.BottomLineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };

    // this.Modify = this.ActiveEditor.LabelMarkerXYZ(X, Y, Z, "EEEEEE")

    this.InnerFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.InnerFocusLineSettings, this.ActiveEditor.Scene);
    this.InnerFocusLineSettings.instance.color = new BABYLON.Color3(.5, .5, 1);
    this.InnerFocusLineSettings.instance.isVisible = ShowDebugLines;

    this.MiddleFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.MiddleFocusLineSettings, this.ActiveEditor.Scene);
    this.MiddleFocusLineSettings.instance.color = new BABYLON.Color3(.5, 1, 1);
    this.MiddleFocusLineSettings.instance.isVisible = ShowDebugLines;

    this.OuterFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.OuterFocusLineSettings, this.ActiveEditor.Scene);
    this.OuterFocusLineSettings.instance.color = new BABYLON.Color3(.5, 1, .5);
    this.OuterFocusLineSettings.instance.isVisible = ShowDebugLines;

    // this.TopLineSettings.points[0] = this.V3A; // this.FocusPointA; // 
    // this.TopLineSettings.points[1] = this.V3B; // this.FocusPointB; // 
    this.TopLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.TopLineSettings, this.ActiveEditor.Scene);
    this.TopLineSettings.instance.color = new BABYLON.Color3(0, 0, 1);
    this.TopLineSettings.instance.isVisible = ShowDebugLines;


    this.BottomLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.BottomLineSettings, this.ActiveEditor.Scene);
    this.BottomLineSettings.instance.color = new BABYLON.Color3(0, 1, 0);
    this.BottomLineSettings.instance.isVisible = ShowDebugLines;

    this.LineASettings = { points: [this.TopLineSettings.points[0], this.BottomLineSettings.points[0]], updatable: true };
    this.LineASettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.LineASettings, this.ActiveEditor.Scene);
    this.LineASettings.instance.color = new BABYLON.Color3(0, 1, 1);
    this.LineASettings.instance.isVisible = ShowDebugLines;

    this.LineBSettings = { points: [this.TopLineSettings.points[1], this.BottomLineSettings.points[1]], updatable: true };
    this.LineBSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.LineBSettings, this.ActiveEditor.Scene);
    this.LineBSettings.instance.color = new BABYLON.Color3(0, 1, 1);
    this.LineBSettings.instance.isVisible = ShowDebugLines;

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

    this.RoofColor = Editor.RoofColor;

    this.MAT = new BABYLON.PBRMetallicRoughnessMaterial("PanelMaterial", this.ActiveEditor.Scene); // new BABYLON.StandardMaterial("material", this.ActiveEditor.Scene);
    // this.MAT.useLogarithmicDepth = true;
    this.MAT.metallic = .5;
    this.MAT.roughness = 0.25;
    this.MAT.backFaceCulling = true;
    this.MAT.baseColor.set(this.RoofColor.r, this.RoofColor.g, this.RoofColor.b);
}

SketchPlane.prototype.UpdateBabylon = function () {
    if (!this.ActiveEditor) return;
    if (!this.BottomLineSettings) return;
    this.BottomLineSettings.points[0].set(this.CF_A1.X, this.CF_A1.Y, this.CF_A1.Z);
    this.BottomLineSettings.points[1].set(this.CF_B1.X, this.CF_B1.Y, this.CF_B1.Z);
    this.TopLineSettings.points[0].set(this.CF_A0.X, this.CF_A0.Y, this.CF_A0.Z);
    this.TopLineSettings.points[1].set(this.CF_B0.X, this.CF_B0.Y, this.CF_B0.Z);

    // if (this.Modify) this.Modify[1].text = ""; // `${this.FocusSketchLine.ID}\n${this._Length}\nTL: ${this._TopLength}\nBL: ${this._BottomLength}\n${this.ExtrudeA}-${this.ExtrudeB}`;

    this.UpdatePanelMesh();

    this.InnerFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.InnerFocusLineSettings);
    this.MiddleFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.MiddleFocusLineSettings);
    this.OuterFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.OuterFocusLineSettings);
    this.TopLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.TopLineSettings);
    this.BottomLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.BottomLineSettings);
}

SketchPlane.prototype.UpdateFocusLine = function () {
    if (!this.ActiveEditor) return;
    if (!this.InnerFocusLineSettings) return;
    this.InnerFocusLineSettings.points[0].set(this._InnerFocusPointA.X, this._InnerFocusPointA.Y, this._InnerFocusPointA.Z);
    this.InnerFocusLineSettings.points[1].set(this._InnerFocusCenter.X, this._InnerFocusCenter.Y, this._InnerFocusCenter.Z);
    this.InnerFocusLineSettings.points[2].set(this._InnerFocusPointB.X, this._InnerFocusPointB.Y, this._InnerFocusPointB.Z);

    this.MiddleFocusLineSettings.points[0].set(this._MiddleFocusPointA.X, this._MiddleFocusPointA.Y, this._MiddleFocusPointA.Z);
    this.MiddleFocusLineSettings.points[1].set(this._MiddleFocusCenter.X, this._MiddleFocusCenter.Y, this._MiddleFocusCenter.Z);
    this.MiddleFocusLineSettings.points[2].set(this._MiddleFocusPointB.X, this._MiddleFocusPointB.Y, this._MiddleFocusPointB.Z);

    this.OuterFocusLineSettings.points[0].set(this._OuterFocusPointA.X, this._OuterFocusPointA.Y, this._OuterFocusPointA.Z);
    this.OuterFocusLineSettings.points[1].set(this._OuterFocusCenter.X, this._OuterFocusCenter.Y, this._OuterFocusCenter.Z);
    this.OuterFocusLineSettings.points[2].set(this._OuterFocusPointB.X, this._OuterFocusPointB.Y, this._OuterFocusPointB.Z);
}

SketchPlane.prototype.DeleteBabylon = function () {
    if (!this.ActiveEditor) return;
    this.InnerFocusLineSettings.instance?.dispose();
    this.MiddleFocusLineSettings.instance?.dispose();
    this.OuterFocusLineSettings.instance?.dispose();
    this.TopLineSettings.instance?.dispose();
    this.BottomLineSettings.instance?.dispose();
    this.LineASettings.instance?.dispose();
    this.LineBSettings.instance?.dispose();
    this.Polygon?.dispose();
    this.Panel?.dispose();
    // delete this.Panel;
    // delete this.Polygon;
}

SketchPlane.prototype.UpdatePanelMesh = function () {
    if (!this.ActiveEditor) return;
    if (this.LineASettings) this.LineASettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.LineASettings);
    if (this.LineBSettings) this.LineBSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.LineBSettings);
    this.Polygon?.dispose();

    let ExtrudeLength = (this.RISE ** 2 + this.RUN ** 2) ** .5;
    let DrawLength = this.Length;

    let RoofAngle = CFrame.Angles(Math.atan2(-this.RISE, this.RUN), 0, 0);
    let FocusCF = this.CF_A0.ToWorldSpace(RoofAngle); // .ToWorldSpace(CFrame.Angles(0, Math.PI, 0)); // .ToWorldSpace(RoofAngle);

    // if (true) return;
    // if (!this.ENABLED) {
    // if (this.PolygonSettings) {
    //     let BBL = FocusCF.ToBabylon(); // I had to name this variable BBL. LOL
    //     this.Polygon = BABYLON.MeshBuilder.CreatePolygon("POLY", this.PolygonSettings, null, BABYLON_EARCUT.earcut);
    //     this.Polygon.material = this.MAT; // Editor.ActiveEditor.RoofPBR_Material;
    //     this.Polygon.position.copyFrom(BBL[0]);
    //     this.Polygon.rotationQuaternion = BBL[1];
    // }
    // this.PanelSettings?.instance?.dispose();
    // return;
    // };

    let PanelThickness = 1; // * .0179;

    let SelectedPanelData: PanelProfile = PanelProfiles[Editor.SelectedProfile] ?? PanelProfiles["standing-seam"]; // SelectedProfile];
    const PanelWidth = SelectedPanelData.VariableLength ? Editor.SelectedPanelWidth : SelectedPanelData.PanelLength; // 36;
    const Shape = SelectedPanelData.VariableLength ? SelectedPanelData.Shape(PanelWidth) : SelectedPanelData.Shape;

    this.Panel?.dispose();
    // delete this.Panel;

    const Panel = this.Panel = createShapedRoofPanelSolid_LengthByX(
        "pbr-template",
        PanelWidth, SelectedPanelData.Overlap, Shape,
        DrawLength,
        ExtrudeLength,
        PanelThickness,
        (x) => this.GetHeightAtX(x), // * ExtrudeLength / this.RUN,
        (x) => this.GetBottomAtX(x), // * ExtrudeLength / this.RUN,
        this.ActiveEditor.Scene,
        true,
        makeUniformRunBands(DrawLength, 10, "left-sample")
    );

    if (this.MAT) this.MAT.baseColor.set(this.RoofColor.r, this.RoofColor.g, this.RoofColor.b);

    let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ(0, PanelThickness, -ExtrudeLength)).ToBabylon();

    Panel.position.set(P_BBL[0].x, P_BBL[0].y, P_BBL[0].z);
    Panel.rotationQuaternion = P_BBL[1]; //.copyFrom(this.BBL[1]);
    Panel.material = this.MAT; // new BABYLON.PBRMetallicRoughnessMaterial("PanelMaterial", Editor.ActiveEditor.Scene); // Editor.RoofPBR_Material;
}

type P2 = { x: number; y: number };
type P3 = { x: number; y: number; z: number };
type PanelProfileStep = [number, number?, number?, number?];

function buildRepeatedPanelTopPolyline(
    PanelLength: number, Overlap: number, Shape: PanelProfileStep[],
    drawLength: number
): P2[] {
    const points: P2[] = [];

    let x = Overlap;
    let y = 0;

    points.push({ x, y });

    const moduleWidth = PanelLength;
    const maxPanels = Math.ceil(drawLength / moduleWidth);

    for (let i = 0; i < maxPanels; i++) {
        for (const step of Shape) {
            const outer = step[0], rise = step[1] ?? 0, inner = step[2] ?? 0;
            const fall = step[3] ?? rise;

            if (x >= drawLength) break;

            x += outer / 2 - inner / 2;
            y += rise;
            pushIfNew(points, { x: Math.min(x, drawLength), y });

            if (x >= drawLength) break;

            if (inner !== 0) {
                x += inner;
                pushIfNew(points, { x: Math.min(x, drawLength), y });
            }

            if (x >= drawLength) break;

            x += outer / 2 - inner / 2;
            y -= fall;
            pushIfNew(points, { x: Math.min(x, drawLength), y });

            if (x >= drawLength) break;
        }
    }

    points[points.length - 1].x = drawLength;
    return simplifyOpenPolyline(points);
}

function pushIfNew(points: P2[], p: P2, eps = 1e-8) {
    const prev = points[points.length - 1];
    if (!prev || Math.abs(prev.x - p.x) > eps || Math.abs(prev.y - p.y) > eps)
        points.push(p);
}

function simplifyOpenPolyline(points: P2[], eps = 1e-8): P2[] {
    const out: P2[] = [];
    for (const p of points) {
        const prev = out[out.length - 1];
        if (!prev || Math.abs(prev.x - p.x) > eps || Math.abs(prev.y - p.y) > eps) {
            out.push({ x: p.x, y: p.y });
        }
    }
    return out;
}

function pushTriFlat(
    positions: number[],
    indices: number[],
    normals: number[],
    a: P3,
    b: P3,
    c: P3
) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abz = b.z - a.z;

    const acx = c.x - a.x;
    const acy = c.y - a.y;
    const acz = c.z - a.z;

    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;

    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    const base = positions.length / 3;

    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    indices.push(base, base + 1, base + 2);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
}

function pushQuadFlat(
    positions: number[],
    indices: number[],
    normals: number[],
    a: P3,
    b: P3,
    c: P3,
    d: P3
) {
    pushTriFlat(positions, indices, normals, a, b, c);
    pushTriFlat(positions, indices, normals, a, c, d);
}

function createShapedRoofPanelSurface(
    name: string,
    PanelLength: number, Overlap: number, Shape: PanelProfileStep[],
    drawLength: number,
    runLength: number,
    getHeightAtX: (x: number) => number,
    scene: BABYLON.Scene,
    updatable = false
) {
    const section = buildRepeatedPanelTopPolyline(PanelLength, Overlap, Shape, drawLength);

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const a0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
        const b0: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: 0 };
        const b1: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: runLength };
        const a1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };

        pushQuadFlat(positions, indices, normals, a0, b0, b1, a1);
    }

    const mesh = new BABYLON.Mesh(name, scene);

    const vd = new BABYLON.VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.applyToMesh(mesh, updatable);

    return mesh;
}

function createShapedRoofPanelSolid(
    name: string,
    PanelLength: number, Overlap: number, Shape: PanelProfileStep[],
    drawLength: number,
    runLength: number,
    thickness: number,
    getHeightAtX: (x: number) => number,
    scene: BABYLON.Scene,
    updatable = false
) {
    const section = buildRepeatedPanelTopPolyline(PanelLength, Overlap, Shape, drawLength);

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    // Top surface
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const a0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
        const b0: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: 0 };
        const b1: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: runLength };
        const a1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };

        pushQuadFlat(positions, indices, normals, a0, b0, b1, a1);
    }

    // Bottom surface
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const a0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: 0 };
        const b0: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y - thickness, z: 0 };
        const b1: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y - thickness, z: runLength };
        const a1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: runLength };

        pushQuadFlat(positions, indices, normals, a1, b1, b0, a0);
    }

    // Front edge z = 0
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const ta: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
        const tb: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: 0 };
        const bb: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y - thickness, z: 0 };
        const ba: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: 0 };

        pushQuadFlat(positions, indices, normals, ta, ba, bb, tb);
    }

    // Back edge z = runLength
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const ta: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };
        const tb: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: runLength };
        const bb: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y - thickness, z: runLength };
        const ba: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: runLength };

        pushQuadFlat(positions, indices, normals, ta, tb, bb, ba);
    }

    // Left cap x = 0 side
    {
        const a = section[0];
        const top0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
        const top1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };
        const bot1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: runLength };
        const bot0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: 0 };

        pushQuadFlat(positions, indices, normals, top0, top1, bot1, bot0);
    }

    // Right cap x = drawLength side
    {
        const a = section[section.length - 1];
        const top0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
        const top1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };
        const bot1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: runLength };
        const bot0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: 0 };

        pushQuadFlat(positions, indices, normals, top0, bot0, bot1, top1);
    }

    const mesh = new BABYLON.Mesh(name, scene);

    const vd = new BABYLON.VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.applyToMesh(mesh, updatable);

    return mesh;
}

function clamp(v: number, min: number, max: number): number { return v < min ? min : v > max ? max : v; }

function normalizeRunBands(runBands: RunBand[] | undefined, drawLength: number): RunBand[] | null {
    if (!runBands || runBands.length === 0) return null;

    const bands = [...runBands]
        .map(b => ({
            xMin: Math.min(b.xMin, b.xMax),
            xMax: Math.max(b.xMin, b.xMax),
            fixedLength: b.fixedLength,
            sampleAtX: b.sampleAtX,
        }))
        .filter(b => b.xMax > b.xMin);

    bands.sort((a, b) => a.xMin - b.xMin);

    // Optional safety clamp to panel width
    for (const band of bands) {
        band.xMin = clamp(band.xMin, 0, drawLength);
        band.xMax = clamp(band.xMax, 0, drawLength);
    }

    return bands.length ? bands : null;
}

interface RunBand {
    xMin: number;
    xMax: number;

    // Optional exact run length for this whole band.
    fixedLength?: number;

    // Optional sample position to evaluate getRunLengthAtX once for this band.
    // If omitted and fixedLength is also omitted, band center is used.
    sampleAtX?: number;
}

function getRunLengthAtXWithBands(
    x: number,
    drawLength: number,
    maxRunLength: number,
    getRunLengthAtX: (x: number) => number,
    runBands?: RunBand[]
): number {
    const bands = normalizeRunBands(runBands, drawLength);

    if (!bands) {
        return clamp(getRunLengthAtX(x), 0, maxRunLength);
    }

    for (const band of bands) {
        if (x >= band.xMin && x <= band.xMax) {
            if (Number.isFinite(band.fixedLength)) {
                return clamp(band.fixedLength!, 0, maxRunLength);
            }

            const sampleX = Number.isFinite(band.sampleAtX)
                ? band.sampleAtX!
                : (band.xMin + band.xMax) * 0.5;

            return clamp(getRunLengthAtX(sampleX), 0, maxRunLength);
        }
    }

    // Fallback for areas not covered by any band
    return clamp(getRunLengthAtX(x), 0, maxRunLength);
}

export function createShapedRoofPanelSolid_LengthByX(
    name: string,
    PanelLength: number, Overlap: number, Shape: PanelProfileStep[],
    drawLength: number,
    maxRunLength: number,
    thickness: number,
    getRunLengthAtX: (x: number) => number,
    getBottomLengthAtX: (x: number) => number,
    scene: BABYLON.Scene,
    updatable = false,
    runBands?: RunBand[]
) {
    const section = buildRepeatedPanelTopPolyline(PanelLength, Overlap, Shape, drawLength);

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    const getZ = (x: number) =>
        getRunLengthAtXWithBands(x, drawLength, maxRunLength, getRunLengthAtX, runBands);
    const getBottomZ = (x: number) =>
        getRunLengthAtXWithBands(x, drawLength, maxRunLength, getBottomLengthAtX, runBands);

    // Top surface
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const za = getZ(a.x);
        const zb = getZ(b.x);
        const z1a = getBottomZ(a.x);
        const z1b = getBottomZ(b.x);

        const a0: P3 = { x: a.x, y: a.y, z: z1a };
        const b0: P3 = { x: b.x, y: b.y, z: z1b };
        const b1: P3 = { x: b.x, y: b.y, z: zb };
        const a1: P3 = { x: a.x, y: a.y, z: za };

        pushQuadFlat(positions, indices, normals, a0, b0, b1, a1);
    }

    // Bottom surface
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const za = getZ(a.x);
        const zb = getZ(b.x);
        const z1a = getBottomZ(a.x);
        const z1b = getBottomZ(b.x);

        const a0: P3 = { x: a.x, y: a.y - thickness, z: z1a };
        const b0: P3 = { x: b.x, y: b.y - thickness, z: z1b };
        const b1: P3 = { x: b.x, y: b.y - thickness, z: zb };
        const a1: P3 = { x: a.x, y: a.y - thickness, z: za };

        pushQuadFlat(positions, indices, normals, a1, b1, b0, a0);
    }

    // Front edge at z = 0
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const z1a = getBottomZ(a.x);
        const z1b = getBottomZ(b.x);

        const ta: P3 = { x: a.x, y: a.y, z: z1a };
        const tb: P3 = { x: b.x, y: b.y, z: z1b };
        const bb: P3 = { x: b.x, y: b.y - thickness, z: z1b };
        const ba: P3 = { x: a.x, y: a.y - thickness, z: z1a };

        pushQuadFlat(positions, indices, normals, ta, ba, bb, tb);
    }

    // Back edge (stepped or continuous)
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const za = getZ(a.x);
        const zb = getZ(b.x);

        const ta: P3 = { x: a.x, y: a.y, z: za };
        const tb: P3 = { x: b.x, y: b.y, z: zb };
        const bb: P3 = { x: b.x, y: b.y - thickness, z: zb };
        const ba: P3 = { x: a.x, y: a.y - thickness, z: za };

        pushQuadFlat(positions, indices, normals, ta, tb, bb, ba);
    }

    // Left cap
    {
        const a = section[0];
        const zEnd = getZ(a.x);
        const zBottomEnd = getBottomZ(a.x);

        const top0: P3 = { x: a.x, y: a.y, z: zBottomEnd };
        const top1: P3 = { x: a.x, y: a.y, z: zEnd };
        const bot1: P3 = { x: a.x, y: a.y - thickness, z: zEnd };
        const bot0: P3 = { x: a.x, y: a.y - thickness, z: zBottomEnd };

        pushQuadFlat(positions, indices, normals, top0, top1, bot1, bot0);
    }

    // Right cap
    {
        const a = section[section.length - 1];
        const zEnd = getZ(a.x);
        const zBottomEnd = getBottomZ(a.x);

        const top0: P3 = { x: a.x, y: a.y, z: zBottomEnd };
        const top1: P3 = { x: a.x, y: a.y, z: zEnd };
        const bot1: P3 = { x: a.x, y: a.y - thickness, z: zEnd };
        const bot0: P3 = { x: a.x, y: a.y - thickness, z: zBottomEnd };

        pushQuadFlat(positions, indices, normals, top0, bot0, bot1, top1);
    }

    const mesh = new BABYLON.Mesh(name, scene);

    const vd = new BABYLON.VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.applyToMesh(mesh, updatable);

    return mesh;
}

export function makeUniformRunBands(
    drawLength: number,
    bandWidth: number,
    mode: "center-sample" | "left-sample" | "right-sample" = "center-sample"
): RunBand[] {
    const bands: RunBand[] = [];

    for (let xMin = 0; xMin < drawLength; xMin += bandWidth) {
        const xMax = Math.min(drawLength, xMin + bandWidth);

        let sampleAtX: number;
        if (mode === "left-sample") sampleAtX = xMin;
        else if (mode === "right-sample") sampleAtX = xMax;
        else sampleAtX = (xMin + xMax) * 0.5;

        bands.push({ xMin, xMax, sampleAtX });
    }

    return bands;
}