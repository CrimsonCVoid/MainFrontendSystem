<<<<<<< HEAD
=======
// @ts-nocheck
>>>>>>> Website/main
/* eslint-disable prefer-const */
import * as BABYLON from "@babylonjs/core";
import { CFrame, segmentIntersection2D, Vector3 } from "./positioning";
import { Editor } from "./editor";
import * as BABYLON_EARCUT from "./earcut";
<<<<<<< HEAD
// import * as PDF_EXPORTER from "./pdf-export";
=======
import * as PDF_EXPORTER from "./pdf-export";
>>>>>>> Website/main

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

<<<<<<< HEAD
let SelectedProfile = "R"; // "StandingSeam";

let PanelProfiles: Record<string, PanelProfile> = {
    "pbr-panel": {
=======
export let SelectedProfile = "StandingSeam";
export function setSelectedProfile(key: string) { SelectedProfile = key; }
export function getSelectedProfile() { return SelectedProfile; }

export let PanelProfiles = {
    "PBR": {
>>>>>>> Website/main
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
<<<<<<< HEAD
    "standing-seam": {
=======
    "StandingSeam": {
>>>>>>> Website/main
        PanelLength: 16,
        Overlap: 0, // .125 * 5 / 2,
        Shape: [
            [.5, .875, .25],
            [16 - .5],
            // [.5, .875, .25],
        ]
    },
<<<<<<< HEAD
    "5v-crimp": {
=======
    "5V": {
>>>>>>> Website/main
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
<<<<<<< HEAD
    "r-panel": {
=======
    "R": {
>>>>>>> Website/main
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

<<<<<<< HEAD









type PanelProfileStep = [number, number?, number?, number?];

interface PanelProfile {
    PanelLength: number;
    Overlap: number;
    Shape: PanelProfileStep[];
}

type P2 = { x: number; y: number };
type P3 = { x: number; y: number; z: number };

function buildRepeatedPanelTopPolyline(
    profile: PanelProfile,
    drawLength: number
): P2[] {
    const points: P2[] = [];

    let x = profile.Overlap;
    let y = 0;

    points.push({ x, y });

    const moduleWidth = profile.PanelLength;
    const maxPanels = Math.ceil(drawLength / moduleWidth);

    for (let i = 0; i < maxPanels; i++) {
        for (const step of profile.Shape) {
            const outer = step[0];
            const rise = step[1] ?? 0;
            const inner = step[2] ?? 0;
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
    if (!prev || Math.abs(prev.x - p.x) > eps || Math.abs(prev.y - p.y) > eps) {
        points.push(p);
    }
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
    profile: PanelProfile,
    drawLength: number,
    runLength: number,
    getHeightAtX: (x: number) => number,
    scene: BABYLON.Scene,
    updatable = false
) {
    const section = buildRepeatedPanelTopPolyline(profile, drawLength);

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
    profile: PanelProfile,
    drawLength: number,
    runLength: number,
    thickness: number,
    getHeightAtX: (x: number) => number,
    scene: BABYLON.Scene,
    updatable = false
) {
    const section = buildRepeatedPanelTopPolyline(profile, drawLength);

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

function clamp(v: number, min: number, max: number): number {
    return v < min ? min : v > max ? max : v;
}

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

function createShapedRoofPanelSolid_LengthByX(
    name: string,
    profile: PanelProfile,
    drawLength: number,
    maxRunLength: number,
    thickness: number,
    getRunLengthAtX: (x: number) => number,
    scene: BABYLON.Scene,
    updatable = false,
    runBands?: RunBand[]
) {
    const section = buildRepeatedPanelTopPolyline(profile, drawLength);

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    const getZ = (x: number) =>
        getRunLengthAtXWithBands(x, drawLength, maxRunLength, getRunLengthAtX, runBands);

    // Top surface
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const za = getZ(a.x);
        const zb = getZ(b.x);

        const a0: P3 = { x: a.x, y: a.y, z: 0 };
        const b0: P3 = { x: b.x, y: b.y, z: 0 };
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

        const a0: P3 = { x: a.x, y: a.y - thickness, z: 0 };
        const b0: P3 = { x: b.x, y: b.y - thickness, z: 0 };
        const b1: P3 = { x: b.x, y: b.y - thickness, z: zb };
        const a1: P3 = { x: a.x, y: a.y - thickness, z: za };

        pushQuadFlat(positions, indices, normals, a1, b1, b0, a0);
    }

    // Front edge at z = 0
    for (let i = 0; i < section.length - 1; i++) {
        const a = section[i];
        const b = section[i + 1];

        const ta: P3 = { x: a.x, y: a.y, z: 0 };
        const tb: P3 = { x: b.x, y: b.y, z: 0 };
        const bb: P3 = { x: b.x, y: b.y - thickness, z: 0 };
        const ba: P3 = { x: a.x, y: a.y - thickness, z: 0 };

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

        const top0: P3 = { x: a.x, y: a.y, z: 0 };
        const top1: P3 = { x: a.x, y: a.y, z: zEnd };
        const bot1: P3 = { x: a.x, y: a.y - thickness, z: zEnd };
        const bot0: P3 = { x: a.x, y: a.y - thickness, z: 0 };

        pushQuadFlat(positions, indices, normals, top0, top1, bot1, bot0);
    }

    // Right cap
    {
        const a = section[section.length - 1];
        const zEnd = getZ(a.x);

        const top0: P3 = { x: a.x, y: a.y, z: 0 };
        const top1: P3 = { x: a.x, y: a.y, z: zEnd };
        const bot1: P3 = { x: a.x, y: a.y - thickness, z: zEnd };
        const bot0: P3 = { x: a.x, y: a.y - thickness, z: 0 };

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

// function createShapedRoofPanelSolid(
//     name: string,
//     profile: PanelProfile,
//     drawLength: number,
//     runLength: number,
//     thickness: number,
//     getHeightAtX: (x: number) => number,
//     scene: BABYLON.Scene,
//     updatable = false
// ) {
//     const section = buildRepeatedPanelTopPolyline(profile, drawLength);

//     const positions: number[] = [];
//     const indices: number[] = [];
//     const normals: number[] = [];

//     // Top surface
//     for (let i = 0; i < section.length - 1; i++) {
//         const a = section[i];
//         const b = section[i + 1];

//         const a0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
//         const b0: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: 0 };
//         const b1: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: runLength };
//         const a1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };

//         pushQuadFlat(positions, indices, normals, a0, b0, b1, a1);
//     }

//     // Bottom surface
//     for (let i = 0; i < section.length - 1; i++) {
//         const a = section[i];
//         const b = section[i + 1];

//         const a0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: 0 };
//         const b0: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y - thickness, z: 0 };
//         const b1: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y - thickness, z: runLength };
//         const a1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: runLength };

//         pushQuadFlat(positions, indices, normals, a1, b1, b0, a0);
//     }

//     // Front edge z = 0
//     for (let i = 0; i < section.length - 1; i++) {
//         const a = section[i];
//         const b = section[i + 1];

//         const ta: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
//         const tb: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: 0 };
//         const bb: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y - thickness, z: 0 };
//         const ba: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: 0 };

//         pushQuadFlat(positions, indices, normals, ta, ba, bb, tb);
//     }

//     // Back edge z = runLength
//     for (let i = 0; i < section.length - 1; i++) {
//         const a = section[i];
//         const b = section[i + 1];

//         const ta: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };
//         const tb: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y, z: runLength };
//         const bb: P3 = { x: b.x, y: getHeightAtX(b.x) + b.y - thickness, z: runLength };
//         const ba: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: runLength };

//         pushQuadFlat(positions, indices, normals, ta, tb, bb, ba);
//     }

//     // Left cap x = 0 side
//     {
//         const a = section[0];
//         const top0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
//         const top1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };
//         const bot1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: runLength };
//         const bot0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: 0 };

//         pushQuadFlat(positions, indices, normals, top0, top1, bot1, bot0);
//     }

//     // Right cap x = drawLength side
//     {
//         const a = section[section.length - 1];
//         const top0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: 0 };
//         const top1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y, z: runLength };
//         const bot1: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: runLength };
//         const bot0: P3 = { x: a.x, y: getHeightAtX(a.x) + a.y - thickness, z: 0 };

//         pushQuadFlat(positions, indices, normals, top0, bot0, bot1, top1);
//     }

//     const mesh = new BABYLON.Mesh(name, scene);

//     const vd = new BABYLON.VertexData();
//     vd.positions = positions;
//     vd.indices = indices;
//     vd.normals = normals;
//     vd.applyToMesh(mesh, updatable);

//     return mesh;
// }




interface XEnvelopeHit {
    point: Vector3;
    side: "left" | "right";
    segmentIndex: number;
}

interface XEnvelopeResult {
    x: number;
    bottom: XEnvelopeHit | null;
    top: XEnvelopeHit | null;
    hits: XEnvelopeHit[];
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function getSegmentHitAtX(
    a: Vector3,
    b: Vector3,
    x: number,
    side: "left" | "right",
    segmentIndex: number,
    epsilon = 1e-8
): XEnvelopeHit[] {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);

    if (x < minX - epsilon || x > maxX + epsilon) return [];

    const dx = b.x - a.x;

    // Segment is vertical in X.
    // If query X matches it, the whole segment lies on that X.
    // For top/bottom purposes, return both ends.
    if (Math.abs(dx) <= epsilon) {
        if (Math.abs(x - a.x) > epsilon) return [];

        return [
            { point: new Vector3(x, a.y, a.z), side, segmentIndex },
            { point: new Vector3(x, b.y, b.z), side, segmentIndex },
        ];
    }

    const t = (x - a.x) / dx;
    if (t < -epsilon || t > 1 + epsilon) return [];

    return [{
        point: new Vector3(
            x,
            lerp(a.y, b.y, t),
            lerp(a.z, b.z, t),
        ),
        side,
        segmentIndex,
    }];
}

export function getTopBottomAtX(
    leftSide: Vector3[],
    rightSide: Vector3[],
    x: number,
    epsilon = 1e-8
): XEnvelopeResult {
    const hits: XEnvelopeHit[] = [];

    for (let i = 0; i < leftSide.length - 1; i++) {
        hits.push(...getSegmentHitAtX(leftSide[i], leftSide[i + 1], x, "left", i, epsilon));
    }

    for (let i = 0; i < rightSide.length - 1; i++) {
        hits.push(...getSegmentHitAtX(rightSide[i], rightSide[i + 1], x, "right", i, epsilon));
    }

    if (hits.length === 0) {
        return { x, bottom: null, top: null, hits: [] };
    }

    let bottom = hits[0];
    let top = hits[0];

    for (let i = 1; i < hits.length; i++) {
        if (hits[i].point.z < bottom.point.z) bottom = hits[i];
        if (hits[i].point.z > top.point.z) top = hits[i];
    }

    return { x, bottom, top, hits };
}

function makeUniformRunBands(
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

// let SketchDirection = new CFrame();

export class ExtrudedLine {
    ActiveEditor: Editor;

    ID!: string;
    PRIMARY = "PITCH";
    ENABLED = true;

    FocusSketchLine: SketchLine;

    // Length: number = 0;
    // Angle: number = 0;

    InnerFocusLineSettings: LineSettingsPeanut = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    MiddleFocusLineSettings: LineSettingsPeanut = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    OuterFocusLineSettings: LineSettingsPeanut = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    TopLineSettings: LineSettingsPeanut = { points: [new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    BottomLineSettings: LineSettingsPeanut = { points: [new BABYLON.Vector3(), new BABYLON.Vector3()], updatable: true };
    LineASettings: LineSettingsPeanut;
    LineBSettings: LineSettingsPeanut;

    Polygon!: BABYLON.Mesh;
    PolygonSettings: PolygonSettingsPeanut;

    PanelSettings: ExtrudedPolygonSettingsPeanut;

    DistIntersection(OtherLine: ExtrudedLine, Outer: boolean = false) {
        return this.IntersectionDist(OtherLine, Outer ? OtherLine._OuterFocusCenter.TranslateSub(this._OuterFocusCenter) : OtherLine._InnerFocusCenter.TranslateSub(this._InnerFocusCenter));
    }

    IntersectionDist3D(OtherLine: ExtrudedLine, CenterDifference: Vector3) {
        const thisDirX = -Math.cos(this._Angle);
        const thisDirZ = Math.sin(this._Angle);

        const otherRiseX = -Math.sin(OtherLine._Angle);
        const otherRiseZ = Math.cos(OtherLine._Angle);

        const dx0 = CenterDifference.X;
        const dz0 = CenterDifference.Z;

        // Height on this roof along its own centerline usually stays constant
        // because movement is along line direction, not rise direction.
        // Height on other roof changes depending on how this line cuts across its rise direction.

        const otherRunAtT =
            (dx0 + thisDirX) * otherRiseX +
            (dz0 + thisDirZ) * otherRiseZ;

        const otherRunAt0 =
            dx0 * otherRiseX +
            dz0 * otherRiseZ;

        const dOtherRunDt = otherRunAtT - otherRunAt0;

        const denom = OtherLine.PITCH * dOtherRunDt;

        if (Math.abs(denom) < 1e-10) return null;

        return (CenterDifference.Y - OtherLine.PITCH * otherRunAt0) / denom;
    }

    IntersectionDist(OtherLine: ExtrudedLine, CenterDifference: Vector3) {
        // return this.IntersectionDist3D(OtherLine, CenterDifference);
        // let CenterDifference = Outer ? OtherLine._OuterFocusCenter.TranslateSub(this._OuterFocusCenter) : OtherLine._InnerFocusCenter.TranslateSub(this._InnerFocusCenter);
        let Denom = Math.sin(OtherLine._Angle - this._Angle); if (Math.abs(Denom) < 1e-10) return null;
        return (CenterDifference.X * Math.sin(OtherLine._Angle) + CenterDifference.Z * Math.cos(OtherLine._Angle)) / Denom;
    }

    get ExtrudeA() {
        // if (!this.LineConnectA) return 0;
        // return this._TopLength;

        return this._OffsetInnerA - this._OffsetOuterA;
        // return this.LineConnectA.RUN * -Math.sign(this._OffsetInnerA - this._OffsetOuterA);
        // return this.LineConnectA.RUN;
        // if (Math.sign(this._OffsetOuterA - this._OffsetInnerA) < 0) return 0;
        // return this.LineConnectA.RUN;
    };
    get ExtrudeB() {
        // if (!this.LineConnectB) return 0;
        // return (this._OffsetOuterB + this._OffsetInnerB);
        return -(this._OffsetInnerB - this._OffsetOuterB);
        // return this.LineConnectB.RUN * Math.sign(this._OffsetOuterB + this._OffsetInnerB);
        // return this.LineConnectB.RUN;
        // return this.LineConnectB.RUN;
    };

    _V3A0 = new Vector3();
    _V3B0 = new Vector3();
    _V3A1 = new Vector3();
    _V3B1 = new Vector3();

    UpdateOffsets() {
        this._V3A0.X = this._InnerFocusPointA.X + Math.cos(this._Angle) * this._OffsetInnerA;
        this._V3A0.Z = this._InnerFocusPointA.Z - Math.sin(this._Angle) * this._OffsetInnerA;
        this._V3A0.Y = this._InnerFocusPointA.Y;

        this._V3B0.X = this._InnerFocusPointB.X + Math.cos(this._Angle) * this._OffsetInnerB;
        this._V3B0.Z = this._InnerFocusPointB.Z - Math.sin(this._Angle) * this._OffsetInnerB;
        this._V3B0.Y = this._InnerFocusPointB.Y;
        this._TopLength = this._V3A0.DistanceFromPointXZ(this._V3B0);

        this._V3A1.X = this._OuterFocusPointA.X + Math.cos(this._Angle) * this._OffsetOuterA;
        this._V3A1.Z = this._OuterFocusPointA.Z - Math.sin(this._Angle) * this._OffsetOuterA;
        this._V3A1.Y = this._OuterFocusPointA.Y;

        this._V3B1.X = this._OuterFocusPointB.X + Math.cos(this._Angle) * this._OffsetOuterB;
        this._V3B1.Z = this._OuterFocusPointB.Z - Math.sin(this._Angle) * this._OffsetOuterB;
        this._V3B1.Y = this._OuterFocusPointB.Y;
        this._BottomLength = this._V3A1.DistanceFromPointXZ(this._V3B1);

        this.Update();
    }

    _OffsetInnerA: number = 0; get OffsetInnerA() { return this._OffsetInnerA; };
    set OffsetInnerA(value: number) {
        this._OffsetInnerA = value;
        this.UpdateOffsets();
    };

    _OffsetInnerB: number = 0; get OffsetInnerB() { return this._OffsetInnerB; };
    set OffsetInnerB(value: number) {
        this._OffsetInnerB = value;
        this.UpdateOffsets();
    };

    _OffsetOuterA: number = 0; get OffsetOuterA() { return this._OffsetOuterA; };
    set OffsetOuterA(value: number) {
        this._OffsetOuterA = value;
        this.UpdateOffsets();
    };

    _OffsetOuterB: number = 0; get OffsetOuterB() { return this._OffsetOuterB; };
    set OffsetOuterB(value: number) {
        this._OffsetOuterB = value;
        this.UpdateOffsets();
    };

    UpdateData() {
        // if (this._LineConnectA) {
        //     this.OffsetInnerA = this.IntersectionDist(this._LineConnectA, this._LineConnectA._InnerFocusCenter.TranslateSub(this._InnerFocusPointA)) ?? 0;
        //     this.OffsetOuterA = this.IntersectionDist(this._LineConnectA, this._LineConnectA._OuterFocusCenter.TranslateSub(this._OuterFocusPointA)) ?? 0;
        // } else {
        //     this.OffsetInnerA = 0;
        //     this.OffsetOuterA = 0;
        // }
        // if (this._LineConnectB) {
        //     this.OffsetInnerB = this.IntersectionDist(this._LineConnectB, this._LineConnectB._InnerFocusCenter.TranslateSub(this._InnerFocusPointB)) ?? 0;
        //     this.OffsetOuterB = this.IntersectionDist(this._LineConnectB, this._LineConnectB._OuterFocusCenter.TranslateSub(this._OuterFocusPointB)) ?? 0;
        // } else {
        //     this.OffsetInnerB = 0;
        //     this.OffsetOuterB = 0;
        // }

        // this.OffsetInnerA = this._OffsetInnerA;
        // this.OffsetInnerB = this._OffsetInnerB;
        // this.OffsetOuterA = this._OffsetOuterA;
        // this.OffsetOuterB = this._OffsetOuterB;
        // this._TopLength + this.ExtrudeA + this.ExtrudeB; // this.V3A1.DistanceFromPointXZ(this.V3B1);
        this.UpdateOffsets();

    }

    constructor(FocusSketchLine: SketchLine, FocusPointA: Vector3, FocusPointB: Vector3, Angle = 0) { // IsParallel = true) {
        this.ActiveEditor = FocusSketchLine.ActiveEditor;
        this.FocusSketchLine = FocusSketchLine;

        this._Angle = Angle;
        this._Length = FocusPointA.DistanceFromPoint(FocusPointB);
        let Averaged = FocusPointA.Average(FocusPointB);
        this.CenterHeight = Averaged.Y;
        this.InnerFocusCenter = Averaged;

        const ShowDebugLines = false;

        this.UpdateOffsets();

        this.Modify = Editor.ActiveEditor.LabelMarkerXYZ(Averaged.X, Averaged.Y, Averaged.Z, FocusSketchLine.ID)

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
=======
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

    FocusCF: CFrame;

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

        let SurfID, Size, Points;
        SurfID = `SURFACE_${Math.floor(Math.random() * 0xff_ff_ff_ff)}`;
        let FocusCF = this.FocusCF = ExtrudedLine.FocusSketchLine.CF0.ToWorldSpace(CFrame.Angles(0, 0, -Math.PI / 2));
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

        let FocusCF = (this.ExtrudedLine.IsParallel ? this.ExtrudedLine.CF0.ToWorldSpace(CFrame.Angles(0, -Math.PI / 2, 0)) : this.ExtrudedLine.CF0).ToWorldSpace(RoofAngle); // EdgeCF; // HeadingCF.Rotation.TranslateAdd(Averaged);


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
        this.Polygon.position.copyFrom(this.BBL[0]);
        this.Polygon.rotationQuaternion = this.BBL[1];

        let PanelThickness = .0179;
        // shape.push(new BABYLON.Vector3(-X, 0, 0));

        let SelectedPanelData = PanelProfiles[SelectedProfile];
        let PanelLength = SelectedPanelData.PanelLength; // 36;
        let MaxPanels = Math.ceil(BottomLength / PanelLength);




        let shape = []; // new BABYLON.Vector3(0, 0, 0)];

        let X = SelectedPanelData.Overlap; // 0; // -PBR_Panel[0][0] / 2;
        let Y = PanelThickness + .1;

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
        this.PanelSettings = {
            shape: shape,
            path: [
>>>>>>> Website/main
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, 0, 1e-6),
                // new BABYLON.Vector3(0, 0, 10),
                // new BABYLON.Vector3(0, 0, -Size.Z),
                // new BABYLON.Vector3(0, 0, -Size.Z + .001),
            ],
<<<<<<< HEAD
=======
            capFunction: (shapePath: BABYLON.Vector3[]) => {
                let mapped: BABYLON.Vector3[] = [];
                for (let v of shapePath) {
                    let Height = 0;
                    if (v.x <= this.ExtrudedLine.ExtrudeB) {
                        Height = (v.x) / this.ExtrudedLine.ExtrudeB * ExtrudeLength;
                    } else if (v.x <= this.ExtrudedLine.ExtrudeB + MainLength) {
                        Height = ExtrudeLength;
                    } else {
                        Height = (BottomLength - v.x) / this.ExtrudedLine.ExtrudeA * ExtrudeLength;
                    }
                    mapped.push(new BABYLON.Vector3(v.x, v.y + PanelThickness, -Height));
                };
                return mapped;
            },
>>>>>>> Website/main
            cap: BABYLON.Mesh.CAP_END,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE, // DEFAULTSIDE,
            updatable: true,
        };
<<<<<<< HEAD

        this.MAT = new BABYLON.PBRMetallicRoughnessMaterial("PanelMaterial", Editor.ActiveEditor.Scene); // new BABYLON.StandardMaterial("material", this.ActiveEditor.Scene);
        // this.MAT.useLogarithmicDepth = true;
        this.MAT.metallic = .5;
        this.MAT.roughness = 0.25;
        this.MAT.backFaceCulling = true;
        this.MAT.baseColor = Editor.RoofColor;
        this.Update();
    }

    MAT: BABYLON.PBRMetallicRoughnessMaterial;

    SelectedProfile: string = "standing-seam";

    UpdatePanelMesh() {
        if (this.LineASettings) this.LineASettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.LineASettings);
        if (this.LineBSettings) this.LineBSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.LineBSettings);
        this.Polygon?.dispose();

        let ExtrudeA = this.ExtrudeA;
        let ExtrudeB = this.ExtrudeB;
        let MainLength = this.TopLength;
        let ExtrudeLength = (this.RISE ** 2 + this.RUN ** 2) ** .5;
        let DrawLength = MainLength + Math.max(0, ExtrudeA) + Math.max(0, ExtrudeB);

        // let X_L = -Math.min(0, ExtrudeA);
        // let X_EA = Math.max(0, ExtrudeA);
        // let X_EB = X_EA + MainLength;
        // let X_R = X_EB + ExtrudeB;

        let X_L = - ExtrudeA;
        let X_EA = 0;
        let X_EB = X_EA + MainLength;
        let X_R = X_EB + ExtrudeB;

        let RoofAngle = CFrame.Angles(Math.atan2(-this.RISE, this.RUN), 0, 0);
        let FocusCF = this.CF_A0.ToWorldSpace(RoofAngle); // .ToWorldSpace(CFrame.Angles(0, Math.PI, 0)); // .ToWorldSpace(RoofAngle);

        // if (true) return;
        // if (!this.ENABLED) {
        let BBL = FocusCF.ToBabylon(); // I had to name this variable BBL. LOL
        // this.Polygon = BABYLON.MeshBuilder.CreatePolygon("POLY", this.PolygonSettings, null, BABYLON_EARCUT.earcut);
        // this.Polygon.material = this.MAT; // Editor.ActiveEditor.RoofPBR_Material;
        // this.Polygon.position.copyFrom(BBL[0]);
        // this.Polygon.rotationQuaternion = BBL[1];
        // this.PanelSettings?.instance?.dispose();
        // return;
        // };

        let PanelThickness = 1; // * .0179;
        // shape.push(new BABYLON.Vector3(-X, 0, 0));

        let SelectedPanelData = PanelProfiles[this.SelectedProfile] ?? PanelProfiles["standing-seam"]; // SelectedProfile];
        let PanelLength = SelectedPanelData.PanelLength; // 36;
        let MaxPanels = Math.ceil(DrawLength / PanelLength);

        PanelLength *= MaxPanels;

        this.Panel?.dispose();
        delete this.Panel;

        const Panel = this.Panel = createShapedRoofPanelSolid_LengthByX(
            "pbr-template",
            SelectedPanelData,
            DrawLength,
            ExtrudeLength,
            PanelThickness,
            (x) => this.GetHeightAtX(x) * ExtrudeLength / this.RUN,
            Editor.ActiveEditor.Scene,
            true,
            makeUniformRunBands(DrawLength, 10, "left-sample")
        );

        let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ(this.ExtrudeA, PanelThickness, -ExtrudeLength)).ToBabylon();

        Panel.position.set(P_BBL[0].x, P_BBL[0].y, P_BBL[0].z);
        Panel.rotationQuaternion = P_BBL[1]; //.copyFrom(this.BBL[1]);
        Panel.material = this.MAT; // new BABYLON.PBRMetallicRoughnessMaterial("PanelMaterial", Editor.ActiveEditor.Scene); // Editor.RoofPBR_Material;
    }

    Zonings: Vector3[][] = [];

    UpdateForZonings() {
        // if (!this.LineSettings.instance) return;
        // TEMP //
        if (this.Zonings.length == 0) return;
        this.UpdatePanelMesh();
    }

    // GetHeightAtX(X: number, Raw = false) {
    //     // return this.GetBottomAtX(X);
    //     let MainLength = this.TopLength;
    //     let BottomLength = MainLength + this.ExtrudeA + this.ExtrudeB; // this.BottomLength; // MainLength + this.ExtrudeA + this.ExtrudeB;
    //     let ExtrudeLength = (this.RISE ** 2 + this.RUN ** 2) ** .5;
    //     let Height = 0;
    //     if (X <= this.ExtrudeB && this.ExtrudeB != 0) {
    //         Height = X / this.ExtrudeB * ExtrudeLength;
    //         if (!Raw)
    //             for (let ZoningPoint of this.Zonings) {
    //                 let Actual1X = -ZoningPoint[1].X + this.ExtrudeB + MainLength;
    //                 if (Actual1X > X) continue;
    //                 Height = Math.max(Height, ExtrudeLength - ((ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5));
    //             }
    //     } else if (X <= this.ExtrudeB + MainLength) {
    //         Height = ExtrudeLength;
    //     } else if (this.ExtrudeA != 0) {
    //         Height = (BottomLength - X) / this.ExtrudeA * ExtrudeLength;
    //         if (!Raw)
    //             for (let ZoningPoint of this.Zonings) {
    //                 let Actual1X = -ZoningPoint[1].X + this.ExtrudeB + MainLength;
    //                 if (Actual1X < X) continue;
    //                 Height = Math.max(Height, ExtrudeLength - ((ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5));
    //             }
    //     } // else Height = ExtrudeLength;
    //     return Height;
    // }

    LeftSidePoints?: Vector3[];
    RightSidePoints?: Vector3[];

    GetHeightAtX(X: number, Raw = false) {
        if (this.LeftSidePoints && this.RightSidePoints) {
            // let LeftX = Infinity;
            // let RightX = -Infinity;
            // for (const V3 of this.LeftSidePoints) LeftX = Math.min(LeftX, V3.X), RightX = Math.max(RightX, V3.X);
            // for (const V3 of this.RightSidePoints) LeftX = Math.min(LeftX, V3.X), RightX = Math.max(RightX, V3.X);
            const Top = getTopBottomAtX(this.LeftSidePoints, this.RightSidePoints, X).top?.point.Z;
            if (Top != Top || Top == null) return (this.RUN ** 2 + this.RISE ** 2) ** .5
            return Top;
        }
        // return this.GetBottomAtX(X);
        // let ExtrudeA = Math.max(0, this.ExtrudeA);
        // let ExtrudeB = Math.max(0, this.ExtrudeB);
        // let MainLength = this.TopLength;
        // let DrawLength = MainLength + ExtrudeA + ExtrudeB; // this.BottomLength; // MainLength + this.ExtrudeA + this.ExtrudeB;
        // let BottomLength = this.BottomLength;
        // let ExtrudeLength = (this.RISE ** 2 + this.RUN ** 2) ** .5;
        // let Height = 0;
        // if (X <= ExtrudeB && ExtrudeB != 0) {
        //     Height = X / this.ExtrudeB * ExtrudeLength;
        // } else if (X <= ExtrudeB + MainLength) {
        //     Height = ExtrudeLength;
        // } else if (ExtrudeA != 0) {
        //     Height = (BottomLength - X) / ExtrudeA * ExtrudeLength;
        // }
        // if (!Raw)
        //     for (let ZoningPoint of this.Zonings) {
        //         let Actual1X = -ZoningPoint[1].X + this.ExtrudeB + MainLength;
        //         if (Actual1X < X) continue; // Make this work according to the difference of ZoningPoint[0] and ZoningPoint[1].
        //         Height = Math.max(Height, ExtrudeLength - ((ZoningPoint[1].Y ** 2 + ZoningPoint[1].Z ** 2) ** .5));
        //     }
        let ExtrudeA = this.ExtrudeA;
        let ExtrudeB = this.ExtrudeB;
        let MainLength = this.TopLength;
        let ExtrudeLength = (this.RISE ** 2 + this.RUN ** 2) ** .5;
        let DrawLength = MainLength + Math.max(0, ExtrudeA) + Math.max(0, ExtrudeB);

        let X_L = -Math.min(0, ExtrudeA);
        let X_EA = Math.max(0, ExtrudeA);
        let X_EB = X_EA + MainLength;
        let X_R = X_EB + ExtrudeB;

        let Height = 0;

        if (X_L <= X && X <= X_EA && X_L != X_EA) {
            Height = ExtrudeLength * (X - X_L) / (X_EA - X_L);
        } else if (X_EA <= X && X <= X_EB) {
            Height = ExtrudeLength;
        } else if (X_EB <= X && X <= X_R && X_EB != X_R) {
            Height = ExtrudeLength - ExtrudeLength * (X - X_EB) / (X_R - X_EB);
        }

        // if (Height != Height) console.log("WTF IS WRONG", X, X_L, X_EA, X_EB, X_R, this)

        return Height;
    }

    CF_A0!: CFrame;
    CF_B0!: CFrame;

    CF_A1!: CFrame;
    CF_B1!: CFrame;

    Update() {
        // if (!this.LineSettings.instance) return;
        this.CF_A0 = CFrame.Angles(0, this._Angle, 0).TranslateAdd(this._V3A0);
        // this.CF1 = CFrame.fromVector3(this.FocusSketchLine[this.FocusPoint1]).ToWorldSpace(CFrame.Angles(0, this.FocusSketchLine.Angle + (this.Angle + 180 - 90) * Math.PI / 180, 0));
        this.CF_B0 = CFrame.Angles(0, this._Angle, 0).TranslateAdd(this._V3B0); // this.CF_A0.ToWorldSpace(CFrame.fromXYZ(this.Length, 0, 0)); // .ToWorldSpace(CFrame.Angles(0, Math.PI, 0));

        // let RUN = this.RUN;
        // let RISE = this._RISE;

        let CF_A1 = this.CF_A1 = CFrame.Angles(0, this._Angle, 0).TranslateAdd(this._V3A1); // this.CF_A0.ToWorldSpace(CFrame.fromXYZ(-this.ExtrudeA, -RISE, -RUN));
        let CF_B1 = this.CF_B1 = CFrame.Angles(0, this._Angle, 0).TranslateAdd(this._V3B1); // this.CF_B0.ToWorldSpace(CFrame.fromXYZ(this.ExtrudeB, -RISE, -RUN));
        // let CF_A1 = this.CF_A1 = this.CF_A0.ToWorldSpace(CFrame.fromXYZ(-RUN, -RISE, -this.ExtrudeA));
        // let CF_B1 = this.CF_B1 = this.CF_B0.ToWorldSpace(CFrame.fromXYZ(-RUN, -RISE, this.ExtrudeB));
        this.BottomLineSettings.points[0].set(CF_A1.X, CF_A1.Y, CF_A1.Z);
        this.BottomLineSettings.points[1].set(CF_B1.X, CF_B1.Y, CF_B1.Z);
        // this.TopLineSettings.points[0].set(this.V3A.X, this.V3A.Y, this.V3A.Z);
        // this.TopLineSettings.points[1].set(this.V3B.X, this.V3B.Y, this.V3B.Z);
        this.TopLineSettings.points[0].set(this.CF_A0.X, this.CF_A0.Y, this.CF_A0.Z);
        this.TopLineSettings.points[1].set(this.CF_B0.X, this.CF_B0.Y, this.CF_B0.Z);

        if (this.Modify) this.Modify[1].text = ""; // `${this.FocusSketchLine.ID}\n${this._Length}\nTL: ${this._TopLength}\nBL: ${this._BottomLength}\n${this.ExtrudeA}-${this.ExtrudeB}`;

        this.UpdatePanelMesh();

        this.InnerFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.InnerFocusLineSettings);
        this.MiddleFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.MiddleFocusLineSettings);
        this.OuterFocusLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.OuterFocusLineSettings);
        this.TopLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.TopLineSettings);
        this.BottomLineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.BottomLineSettings);
    }

    Delete() {
        this.InnerFocusLineSettings.instance?.dispose();
        this.MiddleFocusLineSettings.instance?.dispose();
        this.OuterFocusLineSettings.instance?.dispose();
        this.TopLineSettings.instance?.dispose();
        this.BottomLineSettings.instance?.dispose();
        this.LineASettings.instance?.dispose();
        this.LineBSettings.instance?.dispose();
        this.Polygon?.dispose();
        this.Panel?.dispose();
        delete this.Panel;
        // this.TESTYSETTINGS?.instance?.dispose();
        // this.TESTYSETTINGSSIDE?.instance?.dispose();
        // for (let PanelSettings of this.Panels) PanelSettings.instance?.dispose();
        // delete this;
    }

    _LineConnectA!: ExtrudedLine; get LineConnectA() { return this._LineConnectA; };
    _LineConnectB!: ExtrudedLine; get LineConnectB() { return this._LineConnectB; };

    set LineConnectA(value: ExtrudedLine) {
        this._LineConnectA = value;
        this.UpdateData();
    };
    set LineConnectB(value: ExtrudedLine) {
        this._LineConnectB = value;
        this.UpdateData();
    };

    _DrawFromPoint: Vector3 = new Vector3(); get DrawFromPoint() { return this._DrawFromPoint; };

    UpdateXZ(OverrideLengthAnchor?: -1 | 0 | 1, OverrideRunAnchor?: -1 | 0 | 1) {
        this.DrawMatrix(this._DrawFromPoint.X, this._DrawFromPoint.Z, OverrideLengthAnchor ?? this.LengthAnchor, OverrideRunAnchor ?? this.RunAnchor);
    }

    RiseAnchor: -1 | 0 | 1 = -1;
    // DrawFrom: "A" | "C" | "B" = "A";
    LengthAnchor: -1 | 0 | 1 = -1; // Might need to change to Get/Set to update _DrawFromPoint.
    RunAnchor: -1 | 0 | 1 = -1;

    DrawMatrix(X: number, Z: number, ABFactor: number, InnerOuterFactor: number) {
        // this.LengthAnchor = ABFactor;
        // this.RunAnchor = InnerOuterFactor;
        let LengthX = Math.cos(this._Angle) * this._Length / 2, LengthZ = -Math.sin(this._Angle) * this._Length / 2;
        let RunX = -Math.sin(this._Angle) * this._RUN / 2, RunZ = -Math.cos(this._Angle) * this._RUN / 2;

        this._InnerFocusPointA.X = X + LengthX * (-1 - ABFactor) + RunX * (-1 - InnerOuterFactor);
        this._InnerFocusPointA.Z = Z + LengthZ * (-1 - ABFactor) + RunZ * (-1 - InnerOuterFactor);
        this._InnerFocusCenter.X = X + LengthX * (0 - ABFactor) + RunX * (-1 - InnerOuterFactor);
        this._InnerFocusCenter.Z = Z + LengthZ * (0 - ABFactor) + RunZ * (-1 - InnerOuterFactor);
        this._InnerFocusPointB.X = X + LengthX * (1 - ABFactor) + RunX * (-1 - InnerOuterFactor);
        this._InnerFocusPointB.Z = Z + LengthZ * (1 - ABFactor) + RunZ * (-1 - InnerOuterFactor);

        this._MiddleFocusPointA.X = X + LengthX * (-1 - ABFactor) + RunX * (0 - InnerOuterFactor);
        this._MiddleFocusPointA.Z = Z + LengthZ * (-1 - ABFactor) + RunZ * (0 - InnerOuterFactor);
        this._MiddleFocusCenter.X = X + LengthX * (0 - ABFactor) + RunX * (0 - InnerOuterFactor);
        this._MiddleFocusCenter.Z = Z + LengthZ * (0 - ABFactor) + RunZ * (0 - InnerOuterFactor);
        this._MiddleFocusPointB.X = X + LengthX * (1 - ABFactor) + RunX * (0 - InnerOuterFactor);
        this._MiddleFocusPointB.Z = Z + LengthZ * (1 - ABFactor) + RunZ * (0 - InnerOuterFactor);

        this._OuterFocusPointA.X = X + LengthX * (-1 - ABFactor) + RunX * (1 - InnerOuterFactor);
        this._OuterFocusPointA.Z = Z + LengthZ * (-1 - ABFactor) + RunZ * (1 - InnerOuterFactor);
        this._OuterFocusCenter.X = X + LengthX * (0 - ABFactor) + RunX * (1 - InnerOuterFactor);
        this._OuterFocusCenter.Z = Z + LengthZ * (0 - ABFactor) + RunZ * (1 - InnerOuterFactor);
        this._OuterFocusPointB.X = X + LengthX * (1 - ABFactor) + RunX * (1 - InnerOuterFactor);
        this._OuterFocusPointB.Z = Z + LengthZ * (1 - ABFactor) + RunZ * (1 - InnerOuterFactor);

        this._DrawFromPoint.X = X;
        this._DrawFromPoint.Z = Z;

        this.UpdateData();
        this.UpdateFocusLine();
    }

    set InnerFocusPointA(value: Vector3) { this.DrawMatrix(value.X, value.Z, -1, -1); }; _InnerFocusPointA: Vector3 = new Vector3(); get InnerFocusPointA() { return this._InnerFocusPointA; };
    set InnerFocusPointB(value: Vector3) { this.DrawMatrix(value.X, value.Z, 0, -1); }; _InnerFocusPointB: Vector3 = new Vector3(); get InnerFocusPointB() { return this._InnerFocusPointB; };
    set InnerFocusCenter(value: Vector3) { this.DrawMatrix(value.X, value.Z, 1, -1); }; _InnerFocusCenter: Vector3 = new Vector3(); get InnerFocusCenter() { return this._InnerFocusCenter; };
    set MiddleFocusPointA(value: Vector3) { this.DrawMatrix(value.X, value.Z, -1, 0); }; _MiddleFocusPointA: Vector3 = new Vector3(); get MiddleFocusPointA() { return this._MiddleFocusPointA; };
    set MiddleFocusPointB(value: Vector3) { this.DrawMatrix(value.X, value.Z, 0, 0); }; _MiddleFocusPointB: Vector3 = new Vector3(); get MiddleFocusPointB() { return this._MiddleFocusPointB; };
    set MiddleFocusCenter(value: Vector3) { this.DrawMatrix(value.X, value.Z, 1, 0); }; _MiddleFocusCenter: Vector3 = new Vector3(); get MiddleFocusCenter() { return this._MiddleFocusCenter; };
    set OuterFocusPointA(value: Vector3) { this.DrawMatrix(value.X, value.Z, -1, 1); }; _OuterFocusPointA: Vector3 = new Vector3(); get OuterFocusPointA() { return this._OuterFocusPointA; };
    set OuterFocusPointB(value: Vector3) { this.DrawMatrix(value.X, value.Z, 0, 1); }; _OuterFocusPointB: Vector3 = new Vector3(); get OuterFocusPointB() { return this._OuterFocusPointB; };
    set OuterFocusCenter(value: Vector3) { this.DrawMatrix(value.X, value.Z, 1, 1); }; _OuterFocusCenter: Vector3 = new Vector3(); get OuterFocusCenter() { return this._OuterFocusCenter; };

    UpdateFocusLine() {
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

    _TopHeight = 0;
    get TopHeight() { return this._TopHeight; };
    set TopHeight(value: number) {
        this._TopHeight = value;
        this._CenterHeight = value - this._RISE / 2;
        this._BottomHeight = value - this._RISE;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
        this.UpdateXZ();
    };

    _CenterHeight = 0;
    get CenterHeight() { return this._CenterHeight; };
    set CenterHeight(value: number) {
        this._TopHeight = value + this._RISE / 2;
        this._CenterHeight = value;
        this._BottomHeight = value - this._RISE / 2;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
        this.UpdateXZ();
    };

    _BottomHeight = 0;
    get BottomHeight() { return this._BottomHeight; };
    set BottomHeight(value: number) {
        this._TopHeight = value + this._RISE;
        this._CenterHeight = value + this._RISE / 2;
        this._BottomHeight = value;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
        this.UpdateXZ();
    };


=======
        if (shape.length >= 2) {
            const extruded = BABYLON.MeshBuilder.ExtrudeShape(`PANEL`, this.PanelSettings, this.ActiveEditor.Scene);
            if (extruded) {
                this.PanelSettings.instance = extruded.convertToFlatShadedMesh();
                Editor.meshesRef.current.push([this.PanelSettings.instance, this.PanelSettings, "PANEL"]);
            }
        }

        if (this.ExtrudedLine.IsParallel) {
            this.TESTYSETTINGS?.instance?.dispose();
            this.TESTYSETTINGS = {
                shape: [
                    new BABYLON.Vector3(0, 0, 0),
                    new BABYLON.Vector3(-MainLength, 0, 0),
                ],
                path: [
                    new BABYLON.Vector3(0, 1, 0),
                    new BABYLON.Vector3(0, 1 - Math.sin(ANGLE) * 2, 2 * Math.cos(ANGLE)), // Math.cos(ANGLE) * 4),
                    // new BABYLON.Vector3(0, Math.sin(ANGLE) * 4 - 2, 0),
                    // new BABYLON.Vector3(0, Math.sin(ANGLE) * 4 - 4, Math.cos(ANGLE) * 4), // Math.cos(ANGLE) * 4),
                ],

                // capFunction: (shapePath: BABYLON.Vector3[]) => shapePath.map(v => new BABYLON.Vector3(v.x * 0, v.y * 1, v.z)),
                cap: BABYLON.Mesh.CAP_ALL,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE, // DEFAULTSIDE,
                updatable: true,
            };
            let P_BBL = this.ExtrudedLine.CF0.ToWorldSpace(CFrame.Angles(0, -Math.PI / 2, 0)).ToBabylon(); // FocusCF.ToWorldSpace(CFrame.fromXYZ(0, PanelThickness, 0)).ToBabylon();
            const testExtruded = BABYLON.MeshBuilder.ExtrudeShape(`PANEL`, this.TESTYSETTINGS, this.ActiveEditor.Scene);
            if (testExtruded) {
                this.TESTYSETTINGS.instance = testExtruded.convertToFlatShadedMesh();
                this.TESTYSETTINGS.instance.position = P_BBL[0];
                this.TESTYSETTINGS.instance.rotationQuaternion = P_BBL[1];
            }
        };

        // {
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
        // }

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



        let Panel = this.PanelSettings.instance as BABYLON.Mesh;
        // Panel.position.set(i * 36, i * 36, 0);
        // i * 36 - this.ExtrudedLine.ExtrudeA
        // let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ(this.ExtrudedLine.ExtrudeA, PanelThickness, ExtrudeLength)).ToBabylon();
        let P_BBL = FocusCF.ToWorldSpace(CFrame.fromXYZ(-this.ExtrudedLine.ExtrudeB - MainLength, PanelThickness, ExtrudeLength)).ToBabylon();
        Panel.position.set(P_BBL[0].x, P_BBL[0].y, P_BBL[0].z);
        Panel.rotationQuaternion = P_BBL[1]; //.copyFrom(this.BBL[1]);
        Panel.material = this.MAT;


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
>>>>>>> Website/main
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
<<<<<<< HEAD
        this.UpdateXZ();
        this._TopHeight = this._CenterHeight + this._RISE / 2;
        this._BottomHeight = this._CenterHeight - this._RISE / 2;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
=======
>>>>>>> Website/main
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
<<<<<<< HEAD
        this.UpdateXZ();
        this._TopHeight = this._CenterHeight + this._RISE / 2;
        this._BottomHeight = this._CenterHeight - this._RISE / 2;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
=======
>>>>>>> Website/main
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
<<<<<<< HEAD
        this.UpdateXZ();

        this._TopHeight = this._CenterHeight + this._RISE / 2;
        this._BottomHeight = this._CenterHeight - this._RISE / 2;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
    };

    // _InnerRUN = 0;
    // get InnerRUN() { return this._InnerRUN; }; // RUN FROM INNER \\
    // set InnerRUN(value: number) {
    //     this._InnerRUN = value;
    //     this._CenterRUN = value - this._RUN / 2;
    //     this._OuterRUN = value - this._RUN;
    //     this.UpdateData();
    //     this.UpdateFocusLine();
    // };

    // _CenterRUN = 0;
    // get CenterRUN() { return this._CenterRUN; };
    // set CenterRUN(value: number) {
    //     this._InnerRUN = value + this._RUN / 2;
    //     this._CenterRUN = value;
    //     this._OuterRUN = value - this._RUN / 2;
    //     this.UpdateData();
    //     this.UpdateFocusLine();
    // };

    // _OuterRUN = 0;
    // get OuterRUN() { return this._OuterRUN; };
    // set OuterRUN(value: number) {
    //     this._InnerRUN = value + this._RUN;
    //     this._CenterRUN = value + this._RUN / 2;
    //     this._OuterRUN = value;
    //     this.UpdateData();
    //     this.UpdateFocusLine();
    // };

    _TopLength = 0;
    get TopLength() { return this._TopLength; };
    set TopLength(value: number) {
        this._TopLength = value; // Length
    };

    _BottomLength = 0;
    get BottomLength() { return this._BottomLength; };
    set BottomLength(value: number) {
        this._BottomLength = value;
=======
    };

    FocusSketchLine: SketchLine;
    FocusPoint0: string;
    FocusPoint1: string;
    IsParallel = true; // PERPENDICULAR | PARALLEL

    // ExtrudeA = 0;
    // ExtrudeB = 0;

    get ExtrudeA() { return this.LineConnectA?.RUN ?? 0; };
    get ExtrudeB() { return this.LineConnectB?.RUN ?? 0; };

    LineConnectA!: ExtrudedLine;
    LineConnectB!: ExtrudedLine;

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
            // this.B0 = CFrame.fromXYZ(this.ExtrudeA, -RISE, -RUN);
            // this.A0 = CFrame.fromXYZ(-this.ExtrudeB, -RISE, RUN);
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
>>>>>>> Website/main
    };

    _Length = 0;
    get Length() { return this._Length; };
    set Length(value: number) {
        this._Length = value;
<<<<<<< HEAD
        this.UpdateXZ();
=======
        this.UpdateXY();
>>>>>>> Website/main
    };

    _Angle = 0;
    get Angle() { return this._Angle; };
    set Angle(value: number) {
        this._Angle = value;
<<<<<<< HEAD
        this.UpdateXZ();
    };

    // CF0 = new CFrame();
    // CF1 = new CFrame();
}

export class SketchLine {
    ActiveEditor: Editor;

    static ActiveSketch?: SketchLine | null;
    static AllDrawings: SketchLine[] = [];
    static DrawingScale = .29858;

    ID = Math.floor(Math.random() * 0xff_ff_ff_ff);

    _Pointer: Vector3;

    constructor(ActiveEditor: Editor, X: number, Y: number, Z: number, Automatic: boolean = false) {
        this.ActiveEditor = ActiveEditor;

        this.DrawLine = new ExtrudedLine(this, new Vector3(X, Y, Z), new Vector3(X, Y, Z))
        this._Pointer = new Vector3(X, Y, Z);
        this.Automatic = Automatic;
    }

    Automatic = false;
    DrawingMode = "LINE"; // LINE | EXTRUSION \\
    // HasLine = false;
    HasExtruded = false;

    DrawLine: ExtrudedLine;

    SnapAngle: number = 0;

    Format(X: number) { return (Math.round(X * 100) / 100).toString(); }

    Start() {
        if (this.Automatic) return;
        this.ActiveEditor.UI_Controls.LiveXLineSettings.points[0].copyFrom(this.DrawLine.TopLineSettings.points[0]);
        this.ActiveEditor.UI_Controls.LiveXLineSettings.points[1].copyFrom(this.DrawLine.TopLineSettings.points[1]);
        this.ActiveEditor.UI_Controls.LiveYLineSettings.points[0].copyFrom(this.DrawLine.TopLineSettings.points[0]);
        this.ActiveEditor.UI_Controls.LiveYLineSettings.points[1].copyFrom(this.DrawLine.TopLineSettings.points[1]);
=======
        this.UpdateXY();
    };

    UpdateXY(Override?: "0" | "1") {
        if ((Override ?? this.DrawFrom) == "0") {
            this.X1 = this._X0 + Math.cos(this._Angle) * this._Length;
            this.Y1 = this._Y0 + Math.sin(this._Angle) * this._Length;
        } else {
            this.X0 = this._X1 - Math.cos(this._Angle) * this._Length;
            this.Y0 = this._Y1 - Math.sin(this._Angle) * this._Length;
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

    DrawFrom: "0" | "1" = "0";

    constructor(ActiveEditor: Editor, X: number, Y: number, Z: number) {
        this.ActiveEditor = ActiveEditor;

        this.X0 = X; this.X1 = X;
        this.Y0 = Y; this.Y1 = Y;
        this.Z0 = Z; this.Z1 = Z;
        this._Pointer = CFrame.fromXYZ(this.X1, this.Z1, this.Y1);
        this.CF0 = CFrame.lookAt(this.V0, this.V1);
        this.CF1 = CFrame.lookAt(this.V1, this.V0);
        // this.LineSettings = { points: [new BABYLON.Vector3(), new BABYLON.Vector3(0, 1e-10, 0)], updatable: true };
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
>>>>>>> Website/main
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
<<<<<<< HEAD
    Update(X: number, Z: number, Shift = false) {
        if (this.Automatic) return;
        // this._Pointer.set(X, this.Z1, Y);
        this._Pointer.X = X;
        this._Pointer.Z = Z;
        switch (this.DrawingMode) {
            case "EXTRUSION": {
                let LocalPosition = (this.DrawLine._DrawFromPoint.DistanceFromPointXZ(this._Pointer) < this.DrawLine._DrawFromPoint.DistanceFromPointXZ(this._Pointer) ? this.DrawLine.CF_A0 : this.DrawLine.CF_B0).ToObjectSpace(this._Pointer.ToCFrame());
                this.DrawLine.RUN = Math.max(0, -LocalPosition.Z);
                break;
            }
            case "LINE": {
                // let DrawingFromPoint
                let DistanceFromPointer = this._Pointer.DistanceFromPointXZ(this.DrawLine._DrawFromPoint);
                let LookVector = CFrame.lookAt(this.DrawLine._DrawFromPoint, this._Pointer).LookVector; // let LookCFrame = (DistanceFromPointer <= .1 ? CFrame.identity : CFrame.lookAt(this.V0, this._Pointer.Position));
                let X1D = LookVector.X; let Y1D = LookVector.Z;
                if (!Shift) {
                    let E2 = CFrame.Angles(0, -this.SnapAngle, 0).ToObjectSpace(this.DrawLine._DrawFromPoint.ToCFrame().ToObjectSpace(this._Pointer.ToCFrame()));
                    if (Math.abs(E2.X) < Math.abs(E2.Z)) { DistanceFromPointer = Math.abs(E2.Z); X1D = -Math.sin(this.SnapAngle) * Math.sign(E2.Z); Y1D = Math.cos(this.SnapAngle) * Math.sign(E2.Z); }
                    else { DistanceFromPointer = Math.abs(E2.X); X1D = Math.cos(this.SnapAngle) * Math.sign(E2.X); Y1D = Math.sin(this.SnapAngle) * Math.sign(E2.X); }
                }
                this.DrawLine.Length = Math.round(DistanceFromPointer);
                this.DrawLine.Angle = Math.atan2(-Y1D, X1D);
=======
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
>>>>>>> Website/main
                break;
            }
        }

<<<<<<< HEAD
        this.DrawLine.Update();
        this.UpdateLines();

        this.ActiveEditor.UI_Controls.LineLength.text = this.Format(this.DrawLine.Length);
        this.ActiveEditor.UI_Controls.Info1.text = this.Format(this.DrawLine._InnerFocusCenter.Y);

        // if (!this.HasLine) return;

        this.ActiveEditor.UI_Controls.Info2.text = this.Format(this.DrawLine.RiseAnchor * this.DrawLine.RISE);

        this.ActiveEditor.UI_Controls.LiveXData.Marker.position.copyFrom(this.DrawLine.BottomLineSettings.points[0].add(this.DrawLine.BottomLineSettings.points[1]).scale(.5));
        this.ActiveEditor.UI_Controls.LiveYData.Marker.position.copyFrom(this.DrawLine.BottomLineSettings.points[0].add(this.DrawLine.BottomLineSettings.points[1]).scale(.5));
        let AltPitch = this.DrawLine.RISE / this.DrawLine.RUN * 12; let AltPitchRounded = this.Format(AltPitch);
        let Line1Length = this.Format(this.DrawLine.BottomLineSettings.points[1].subtract(this.DrawLine.BottomLineSettings.points[0]).length());
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = this.DrawLine.ExtrudeB == 0 ? Line1Length : `${AltPitchRounded != this.Format(AltPitch) ? `~${AltPitchRounded}` : AltPitch}\n${Line1Length}\n+${this.Format(this.DrawLine.ExtrudeB)}`;
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = `${this.DrawLine.PITCH}\n${this.Format(this.DrawLine.Length)}\n-${this.Format(this.DrawLine.RISE)}`;
=======
        this.UpdateLines();

        this.ActiveEditor.UI_Controls.LineLength.text = this.Format(((this.X0 - this.X1) ** 2 + (this.Y0 - this.Y1) ** 2 + (this.Z0 - this.Z1) ** 2) ** .5);
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
>>>>>>> Website/main

        // }
    }
    UpdateLines() {
<<<<<<< HEAD
        if (this.Automatic) return;
        if (this.DrawingMode == "LINE") {
            // this.LineSettings.instance = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = `${Math.round(this.DrawLine.Length * 100) / 100}`;
            this.ActiveEditor.UI_Controls.LiveDistanceData.Marker.position.copyFrom(this.DrawLine.InnerFocusCenter.ToBabylon());
        }
    }
    UpdateInterceptions() {
        // let ClosestSketches = SketchLine.AllDrawings.map((Sketch2) => {
        //     let OffsetInnerA = this.DrawLine.IntersectionDist(Sketch2.DrawLine, Sketch2.DrawLine._MiddleFocusCenter.TranslateSub(this.DrawLine._MiddleFocusPointA));
        //     let OffsetInnerB = this.DrawLine.IntersectionDist(Sketch2.DrawLine, Sketch2.DrawLine._MiddleFocusCenter.TranslateSub(this.DrawLine._MiddleFocusPointB));

        //     let OffsetFromOtherInnerA = Sketch2.DrawLine.IntersectionDist(this.DrawLine, this.DrawLine._MiddleFocusCenter.TranslateSub(Sketch2.DrawLine._MiddleFocusPointA));
        //     let OffsetFromOtherInnerB = Sketch2.DrawLine.IntersectionDist(this.DrawLine, this.DrawLine._MiddleFocusCenter.TranslateSub(Sketch2.DrawLine._MiddleFocusPointB));

        //     return [
        //         Sketch2,
        //         OffsetInnerA, OffsetInnerB, // +X -> -X // A+X -> B+X // 1-2 or 3-4 //

        //         OffsetFromOtherInnerA, OffsetFromOtherInnerB,
        //     ];
        // }).filter((X: any[]) => {
        //     if (X[3] == null || X[0] == this) return false;
        //     if (X[0].DrawLine._BottomHeight > this.DrawLine._CenterHeight || this.DrawLine._CenterHeight > X[0].DrawLine._TopHeight) return false;
        //     if (Math.abs(X[1]) > this.DrawLine.Length && Math.abs(X[3]) > this.DrawLine.Length) return false;
        //     if (Math.abs(X[2]) > this.DrawLine.Length && Math.abs(X[4]) > this.DrawLine.Length) return false;

        //     return true;
        // });
        // console.log(this.ID, this.DrawLine.Length, ClosestSketches);
        // if (ClosestSketches.length == 0) return;

        // let ClosestToA = [];
        // let ClosestToB = [];

        // for (let Data of ClosestSketches) {
        //     if (Math.abs(Data[1]) < Math.abs(Data[2])) {
        //         if (Math.abs(Data[1]) <= this.DrawLine.Length)
        //             if (Math.abs(Data[3]) <= Data[0].DrawLine.Length)
        //                 ClosestToA.push(Data);
        //     } else {
        //         if (Math.abs(Data[2]) <= this.DrawLine.Length)
        //             if (Math.abs(Data[4]) <= Data[0].DrawLine.Length)
        //                 ClosestToB.push(Data);
        //     }
        // }

        // console.log(ClosestToA, ClosestToB);

        // ClosestToA = ClosestToA.sort((A: any, B: any) => Math.abs(A[1]) - Math.abs(B[1]));
        // if (ClosestToA[0])
        //     this.DrawLine.LineConnectA = (ClosestToA[0][0] as SketchLine).DrawLine;

        // ClosestToB = ClosestToB.sort((A: any, B: any) => Math.abs(A[2]) - Math.abs(B[2]));
        // if (ClosestToB[0])
        //     this.DrawLine.LineConnectB = (ClosestToB[0][0] as SketchLine).DrawLine;



        let ClosestSketches = SketchLine.AllDrawings.map((Sketch2) => {
            let OffsetInnerA = this.DrawLine.IntersectionDist(Sketch2.DrawLine, Sketch2.DrawLine._InnerFocusCenter.TranslateSub(this.DrawLine._InnerFocusPointA));
            let OffsetInnerB = this.DrawLine.IntersectionDist(Sketch2.DrawLine, Sketch2.DrawLine._InnerFocusCenter.TranslateSub(this.DrawLine._InnerFocusPointB));
            let OffsetOuterA = this.DrawLine.IntersectionDist(Sketch2.DrawLine, Sketch2.DrawLine._OuterFocusCenter.TranslateSub(this.DrawLine._OuterFocusPointA));
            let OffsetOuterB = this.DrawLine.IntersectionDist(Sketch2.DrawLine, Sketch2.DrawLine._OuterFocusCenter.TranslateSub(this.DrawLine._OuterFocusPointB));


            let OffsetFromOtherInnerA = Sketch2.DrawLine.IntersectionDist(this.DrawLine, this.DrawLine._InnerFocusCenter.TranslateSub(Sketch2.DrawLine._InnerFocusPointA));
            let OffsetFromOtherInnerB = Sketch2.DrawLine.IntersectionDist(this.DrawLine, this.DrawLine._InnerFocusCenter.TranslateSub(Sketch2.DrawLine._InnerFocusPointB));
            let OffsetFromOtherOuterA = Sketch2.DrawLine.IntersectionDist(this.DrawLine, this.DrawLine._OuterFocusCenter.TranslateSub(Sketch2.DrawLine._OuterFocusPointA));
            let OffsetFromOtherOuterB = Sketch2.DrawLine.IntersectionDist(this.DrawLine, this.DrawLine._OuterFocusCenter.TranslateSub(Sketch2.DrawLine._OuterFocusPointB));

            return [
                Sketch2,
                OffsetInnerA, OffsetInnerB, // +X -> -X // A+X -> B+X // 1-2 or 3-4 //
                OffsetOuterA, OffsetOuterB,

                OffsetFromOtherInnerA, OffsetFromOtherInnerB, OffsetFromOtherOuterA, OffsetFromOtherOuterB
            ];
        }).filter((X: any[]) => {
            if (X[3] == null || X[0] == this) return false;
            if (X[0].DrawLine._BottomHeight > this.DrawLine._CenterHeight || this.DrawLine._CenterHeight > X[0].DrawLine._TopHeight) return false;
            if (Math.abs(X[1]) > this.DrawLine.Length / 2 && Math.abs(X[5]) > X[0].DrawLine.Length) return false;
            if (Math.abs(X[2]) > this.DrawLine.Length / 2 && Math.abs(X[6]) > X[0].DrawLine.Length) return false;

            // Always must intersect with either the outer or inner line.

            // IF NOT INNER, CHECK OUTER. //
            let WithinInnerA = X[1] >= 0;
            let WithinInnerB = X[2] <= 0;
            let WithinOuterA = X[3] >= 0;
            let WithinOuterB = X[4] <= 0;

            if (!(WithinInnerA || WithinOuterA) || !(WithinInnerB || WithinOuterB)) return false;

            let OtherWithinInnerA = X[5] >= 0;
            let OtherWithinInnerB = X[6] <= 0;
            let OtherWithinOuterA = X[7] >= 0;
            let OtherWithinOuterB = X[8] <= 0;

            if (!(OtherWithinInnerA || OtherWithinOuterA) || !(OtherWithinInnerB || OtherWithinOuterB)) return false;

            // if (!((WithinInnerA || WithinOuterA) && (OtherWithinInnerA || OtherWithinOuterA)) || !((WithinInnerB || WithinOuterB) && (OtherWithinInnerB || OtherWithinOuterB))) return false;

            // if (!WithinInnerA && !WithinOuterA) return false;

            // X.push(X[3] - X[1], X[1] + X[3])

            // if (X[])
            // if (X[1] < 0) return false; //  && X[3] < 0
            // if (X[2] > 0) return false; //  && X[4] > 0

            // if (X[5] < 0) return false; //  && X[7] < 0
            // if (X[6] > 0) return false; //  && X[8] > 0

            // if (Math.abs(X[4]) > X[0].DrawLine.Length / 2) return false;

            // if (Math.abs(X[2]) > this.DrawLine.Length) return false;
            // if (Math.abs(X[1]) > this.DrawLine.Length) return false;

            return true;
        });
        // console.log(this.ID, this.DrawLine.Length, ClosestSketches);
        if (ClosestSketches.length == 0) return;

        // Outer goes as close as it can within, inner goes to the closest inner point if outer intersects


        // ClosestSketches = ClosestSketches.sort((A: any, B: any) => Math.abs(A[3] - A[1]) - Math.abs(B[3] - B[1]));
        // ClosestSketches = ClosestSketches.sort((A: any, B: any) => (B[3] - B[1]) - (A[3] - A[1]));
        // console.log(this.ID, this.DrawLine.Length, ClosestSketches);

        let ClosestToA = [];
        let ClosestToB = [];

        for (let Data of ClosestSketches) {
            if (Math.min(Math.abs(Data[1]), Math.abs(Data[3])) < Math.min(Math.abs(Data[2]), Math.abs(Data[4]))) {
                if (Math.abs(Data[1]) <= this.DrawLine.Length && Math.abs(Data[3]) <= this.DrawLine.Length)
                    if (Math.abs(Data[5]) <= Data[0].DrawLine.Length || Math.abs(Data[7]) <= Data[0].DrawLine.Length)
                        ClosestToA.push(Data);
            } else {
                if (Math.abs(Data[2]) <= this.DrawLine.Length && Math.abs(Data[4]) <= this.DrawLine.Length)
                    if (Math.abs(Data[6]) <= Data[0].DrawLine.Length || Math.abs(Data[8]) <= Data[0].DrawLine.Length)
                        ClosestToB.push(Data);
            }
        }

        // console.log(ClosestToA, ClosestToB);

        // ClosestSketches = ClosestSketches.sort((A: any, B: any) => A[1] - B[1]);
        // // ClosestSketches = ClosestSketches.sort((A: any, B: any) => Math.abs(A[1]) - Math.abs(B[1]));
        // // // ClosestSketches = ClosestSketches.sort((A: any, B: any) => A[3] - B[3]);
        // // // ClosestSketches = ClosestSketches.sort((A: any, B: any) => Math.min(A[3] - B[3], A[1] - B[1]));
        // // ClosestSketches = ClosestSketches.sort((A: any, B: any) => (A[1] - A[3]) - (B[1] - B[3]));

        // ClosestToA = ClosestToA.sort((A: any, B: any) => Math.abs(A[1]) - Math.abs(B[1]));
        // ClosestToA = ClosestToA.sort((A: any, B: any) => Math.min(A[3] - B[3], A[1] - B[1]));
        ClosestToA = ClosestToA.sort((A: any, B: any) => Math.min(Math.abs(B[1]), Math.abs(B[3])) - Math.min(Math.abs(A[1]), Math.abs(A[3])));
        let OffsetInnerA = 0;
        let OffsetOuterA = 0;
        for (let Close of ClosestToA) {
            // OffsetInnerA = Math.max(OffsetInnerA, Close[1]);
            // OffsetOuterA = Math.min(OffsetOuterA, Close[3]);
            OffsetInnerA = Close[1];
            OffsetOuterA = Close[3];
            break;
        }
        // this.DrawLine.OffsetInnerA = OffsetInnerA;
        // this.DrawLine.OffsetOuterA = OffsetOuterA;
        // if (ClosestToA[0]) {
        //     this.DrawLine.OffsetInnerA = ClosestToA[0][1] ?? 0;
        //     this.DrawLine.OffsetOuterA = ClosestToA[0][3] ?? 0;
        // }
        // this.DrawLine.LineConnectA = (ClosestToA[0][0] as SketchLine).DrawLine;

        ClosestToB = ClosestToB.sort((A: any, B: any) => Math.min(Math.abs(A[2]), Math.abs(A[4])) - Math.min(Math.abs(B[2]), Math.abs(B[4])));

        let OffsetInnerB = 0;
        let OffsetOuterB = 0;
        for (let Close of ClosestToB) {
            // OffsetInnerB = Math.min(OffsetInnerB, Close[2]);
            // OffsetOuterB = Math.max(OffsetOuterB, Close[4]);
            OffsetInnerB = Close[2];
            OffsetOuterB = Close[4];
            break;
        }
        // this.DrawLine.OffsetInnerB = OffsetInnerB;
        // this.DrawLine.OffsetOuterB = OffsetOuterB;

        // if (ClosestToB[0]) {
        //     // this.DrawLine.OffsetInnerB = ClosestToB[0][2] ?? 0;
        //     // this.DrawLine.OffsetOuterB = ClosestToB[0][4] ?? 0;
        // }
        this.DrawLine.UpdateData();
        // this.DrawLine.LineConnectB = (ClosestToB[0][0] as SketchLine).DrawLine;

        // ClosestSketches = ClosestSketches.sort((A: any, B: any) => B[2] - A[2]);
        // // // ClosestSketches = ClosestSketches.sort((A: any, B: any) => B[4] - A[4]);
        // // // ClosestSketches = ClosestSketches.sort((A: any, B: any) => Math.min(B[4] - A[4], B[2] - A[2]));
        // if (Math.abs(ClosestSketches[0][2]) <= this.DrawLine.Length)
        //     this.DrawLine.LineConnectB = (ClosestSketches[0][0] as SketchLine).DrawLine;

        // ORIGINAL LENGTH? // 3-4 or 1-2
        // TOP LENGTH //

        // if (ClosestSketches[0][1] < ClosestSketches[0][2]) {
        //     // Editor.ActiveEditor.LabelMarkerXYZ(InterceptionX, 0, InterceptionZ, "A");
        //     this.DrawLine.LineConnectA = Closest.DrawLine;
        // } else {
        //     // Editor.ActiveEditor.LabelMarkerXYZ(InterceptionX, 0, InterceptionZ, "B");
        //     this.DrawLine.LineConnectB = Closest.DrawLine;
        // }

        // let DistFromClosest = ClosestSketches[0][1] as number;
        // let ThisCenter = this.DrawLine._InnerFocusCenter;
        // let InterceptionX = ThisCenter.X + Math.cos(this.DrawLine.Angle) * DistFromClosest;
        // let InterceptionZ = ThisCenter.Z - Math.sin(this.DrawLine.Angle) * DistFromClosest;
        // if (ClosestSketches[0][1] < ClosestSketches[0][2]) { // (this.DrawLine._InnerFocusPointA.X - InterceptionX) ** 2 + (this.DrawLine._InnerFocusPointA.Z - InterceptionZ) ** 2 < (this.DrawLine._InnerFocusPointB.X - InterceptionX) ** 2 + (this.DrawLine._InnerFocusPointB.Z - InterceptionZ) ** 2) { // DistFromClosest < 0) { // ((InterceptionX - this.DrawLine.XA) ** 2 + (InterceptionZ - this.DrawLine.ZA) ** 2) ** .5 < ((InterceptionX - this.DrawLine.XB) ** 2 + (InterceptionZ - this.DrawLine.ZB) ** 2) ** .5) {
        //     // Editor.ActiveEditor.LabelMarkerXYZ(InterceptionX, 0, InterceptionZ, "A");
        //     this.DrawLine.LineConnectA = Closest.DrawLine;
        // } else {
        //     // Editor.ActiveEditor.LabelMarkerXYZ(InterceptionX, 0, InterceptionZ, "B");
        //     this.DrawLine.LineConnectB = Closest.DrawLine;
        // }

    }
    Commit() {
=======
        if (this.DrawingMode == "LINE") {
            this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = `${Math.round(((this.X0 - this.X1) ** 2 + (this.Y0 - this.Y1) ** 2 + (this.Z0 - this.Z1) ** 2) ** .5 * 100) / 100}`;
            this.ActiveEditor.UI_Controls.LiveDistanceData.Marker.position.copyFrom(this.LineSettings.points[0].add(this.LineSettings.points[1]).scale(.5));
        }
        // if (this.DrawingMode == "EXTRUSION") {
        if (!this.HasLine) return;
        let YYY = this.AnchorPoint * Math.max(this.Lines["0"].RISE, this.Lines["1"].RISE, this.Lines["A"].RISE, this.Lines["B"].RISE);
        this.V0.Y = this.Z1 + YYY;
        this.V1.Y = this.Z1 + YYY;
        this.LineSettings.points[0].y = this.Z1 + YYY;
        this.LineSettings.points[1].y = this.Z1 + YYY;
        this.ActiveEditor.UI_Controls.LiveDistanceData.Marker.position.copyFrom(this.LineSettings.points[0].add(this.LineSettings.points[1]).scale(.5));
        this.Line = BABYLON.MeshBuilder.CreateLines("LINE", this.LineSettings);
        this.CF0 = CFrame.lookAt(this.V0, this.V1);
        this.CF1 = CFrame.lookAt(this.V1, this.V0);

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
        this.CF0 = CFrame.lookAt(this.V0, this.V1);
        this.CF1 = CFrame.lookAt(this.V1, this.V0);
>>>>>>> Website/main
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = "";
        if (this.HasExtruded) {
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = "";
            SketchLine.AllDrawings.push(this);
<<<<<<< HEAD
            for (let Sketch of SketchLine.AllDrawings) Sketch.UpdateInterceptions();
            // this.UpdateInterceptions();
=======
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
>>>>>>> Website/main
            return true;
        }
        if (this.DrawingMode == "EXTRUSION") {
            this.DrawingMode = "LINE";
            this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = "";
        } else if (this.DrawingMode == "LINE") {
            this.DrawingMode = "EXTRUSION";
<<<<<<< HEAD
            // this.HasLine = true; // Going to get rid of this in a bit and set the position to the pointer upon switching.

=======
            this.HasLine = true; // Going to get rid of this in a bit and set the position to the pointer upon switching.




            // let V0 = new Vector3(this.X0, this.Z0, this.Y0);
            // let V1 = new Vector3(this.X1, this.Z0, this.Y1);
            // this.CF0 = CFrame.lookAt(V0, V1);
            // this.CF1 = CFrame.lookAt(V1, V0);
>>>>>>> Website/main
            this.ActiveEditor.UI_Controls.LiveXData.Label.text = "";
            this.ActiveEditor.UI_Controls.LiveYData.Label.text = "";
            // LiveDistanceData.Label.text = "";
            if (this.HasExtruded) return;
            this.HasExtruded = true;
<<<<<<< HEAD
        }
    }
    Delete() {
        this.DrawLine?.Delete();
        if (this.Automatic) return;
=======

            this.Lines["0"] = new ExtrudedLine(this, "V0", "V1", false); this.Lines["0"].PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText0.text; // "RUN";
            this.Lines["1"] = new ExtrudedLine(this, "V1", "V0", false); this.Lines["1"].PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText1.text; // "RUN";
            this.Lines["A"] = new ExtrudedLine(this, "V1", "V0", true); this.Lines["A"].PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText2.text;
            this.Lines["B"] = new ExtrudedLine(this, "V0", "V1", true); this.Lines["B"].PRIMARY = this.ActiveEditor.UI_Controls.PrimaryText3.text;

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

            // this.Lines["A"] = new ExtrudedLine(this, "V0", "V1", true);
            // this.Lines["B"] = new ExtrudedLine(this, "V1", "V0", true);
            this.Lines["0"].ENABLED = this.ActiveEditor.UI_Controls.Checkbox0.isChecked;
            this.Lines["1"].ENABLED = this.ActiveEditor.UI_Controls.Checkbox1.isChecked;
            this.Lines["A"].ENABLED = this.ActiveEditor.UI_Controls.Checkbox2.isChecked;
            this.Lines["B"].ENABLED = this.ActiveEditor.UI_Controls.Checkbox3.isChecked;
        }
    }
    Delete() {
        this.Line?.dispose();
        this.Lines["0"]?.Delete();
        this.Lines["1"]?.Delete();
        this.Lines["A"]?.Delete();
        this.Lines["B"]?.Delete();
>>>>>>> Website/main
        this.ActiveEditor.UI_Controls.LiveXData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveYData.Label.text = "";
        this.ActiveEditor.UI_Controls.LiveDistanceData.Label.text = "";
        // delete this;
    }
<<<<<<< HEAD
}
=======

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
                    console.log(S1I, S2I, BoundInter2D);
                }

                if (!SketchRelations.Applied) continue;

                let CenterAInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]);
                if (CenterAInter2D && (0 <= CenterAInter2D.t1 && CenterAInter2D.t1 <= 1 && 0 <= CenterAInter2D.t2 && CenterAInter2D.t2 <= 1)) {
                    // this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 1], Sketch1Points[S1I * 4 + 2]]);
                    // this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]]);
                    this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 1].Lerp(Sketch1Points[S1I * 4 + 2], CenterAInter2D.t1), Sketch2Points[S2I * 4 + 0].Lerp(Sketch2Points[S2I * 4 + 3], CenterAInter2D.t2)]);
                    SketchRelations.Add(Sketch1.ID, Side1, "A-CINTERSECT", Sketch2.ID, Side2, "CINTERSECT");
                    console.log(S1I, S2I, CenterAInter2D);
                }

                let CenterBInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]);
                if (CenterBInter2D && (0 <= CenterBInter2D.t1 && CenterBInter2D.t1 <= 1 && 0 <= CenterBInter2D.t2 && CenterBInter2D.t2 <= 1)) {
                    // this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3]]);
                    // this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 1], Sketch2Points[S2I * 4 + 2]]);
                    SketchRelations.Add(Sketch1.ID, Side1, "CINTERSECT", Sketch2.ID, Side2, "B-CINTERSECT");
                    console.log(S1I, S2I, CenterBInter2D);
                }

                let CenterInter2D = segmentIntersection2D(Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3], Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]);
                if (CenterInter2D && (0 <= CenterInter2D.t1 && CenterInter2D.t1 <= 1 && 0 <= CenterInter2D.t2 && CenterInter2D.t2 <= 1)) {
                    // this.ActiveEditor.DrawLine([Sketch1Points[S1I * 4 + 0], Sketch1Points[S1I * 4 + 3]]).color = new BABYLON.Color3(1, 1, 1);
                    // this.ActiveEditor.DrawLine([Sketch2Points[S2I * 4 + 0], Sketch2Points[S2I * 4 + 3]]).color = new BABYLON.Color3(1, 1, 1);
                    SketchRelations.Add(Sketch1.ID, Side1, "CINTERSECT", Sketch2.ID, Side2, "CINTERSECT");
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
>>>>>>> Website/main
