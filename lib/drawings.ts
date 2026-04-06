// @ts-nocheck
/* eslint-disable prefer-const */
import { CFrame, Vector3 } from "./positioning";

export let PanelProfiles = {
    "pbr-panel": {
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
    "standing-seam": {
        VariableLength: true,
        PanelLength: 16,
        Overlap: 0, // .125 * 5 / 2,
        Shape: (X: number) => [
            [.5, .875, .25],
            [X - .5],
            // [.5, .875, .25],
        ]
        // Shape: [
        //     [.5, .875, .25],
        //     [16 - .5],
        //     // [.5, .875, .25],
        // ]
    },
    "5v-crimp": {
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
    "r-panel": {
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

type PanelProfileStep = [number, number?, number?, number?];

export interface PanelProfile {
    VariableLength: boolean;
    PanelLength: number;
    Overlap: number;
    Shape: PanelProfileStep[] | ((number) => PanelProfileStep[]);
}

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

export class SketchPlane {
    static AllDrawings: SketchPlane[] = [];

    ActiveEditor: any;

    ID!: string;
    PRIMARY = "PITCH";
    ENABLED = true;

    IntersectionDist(OtherLine: SketchPlane, CenterDifference: Vector3) {
        // return this.IntersectionDist3D(OtherLine, CenterDifference);
        // let CenterDifference = Outer ? OtherLine._OuterFocusCenter.TranslateSub(this._OuterFocusCenter) : OtherLine._InnerFocusCenter.TranslateSub(this._InnerFocusCenter);
        let Denom = Math.sin(OtherLine._Angle - this._Angle); if (Math.abs(Denom) < 1e-10) return null;
        return (CenterDifference.X * Math.sin(OtherLine._Angle) + CenterDifference.Z * Math.cos(OtherLine._Angle)) / Denom;
    }

    DistIntersection(OtherLine: SketchPlane, Outer: boolean = false) {
        return this.IntersectionDist(OtherLine, Outer ? OtherLine._OuterFocusCenter.TranslateSub(this._OuterFocusCenter) : OtherLine._InnerFocusCenter.TranslateSub(this._InnerFocusCenter));
    }

    IntersectionDist3D(OtherLine: SketchPlane, CenterDifference: Vector3) {
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

    constructor(ActiveEditor: any, X: number, Y: number, Z: number, Angle = 0) { // IsParallel = true) {
        this.ActiveEditor = ActiveEditor;

        this._Angle = Angle;
        this._Length = 0;
        this.CenterHeight = Y;
        this.InnerFocusCenter = new Vector3(X, Y, Z);

        if (this.BabylonInitialize) this.BabylonInitialize();
        this.Update();
    }

    _RoofColor: { r: number, g: number, b: number } = { r: 1, g: 1, b: 1 };

    get RoofColor() { return this._RoofColor; };
    set RoofColor(value: { r: number, g: number, b: number }) {
        this._RoofColor.r = value.r, this._RoofColor.g = value.g, this._RoofColor.b = value.b;
        if (this.MAT) this.MAT.baseColor.set(value.r, value.g, value.b);
    };
    SelectedProfile: string = "StandingSeam";
    SelectedPanelWidth: number = 16;

    LeftSidePoints?: Vector3[];
    RightSidePoints?: Vector3[];

    GetHeightAtX(X: number) {
        if (this.LeftSidePoints && this.RightSidePoints) {
            // let LeftX = Infinity;
            // let RightX = -Infinity;
            // for (const V3 of this.LeftSidePoints) LeftX = Math.min(LeftX, V3.X), RightX = Math.max(RightX, V3.X);
            // for (const V3 of this.RightSidePoints) LeftX = Math.min(LeftX, V3.X), RightX = Math.max(RightX, V3.X);
            const Top = getTopBottomAtX(this.LeftSidePoints, this.RightSidePoints, X).top?.point.Z;
            if (Top != Top || Top == null) return (this.RUN ** 2 + this.RISE ** 2) ** .5
            return Top;
        }

        return (this.RISE ** 2 + this.RUN ** 2) ** .5;
    }

    GetBottomAtX(X: number) {
        if (this.LeftSidePoints && this.RightSidePoints) {
            // let LeftX = Infinity;
            // let RightX = -Infinity;
            // for (const V3 of this.LeftSidePoints) LeftX = Math.min(LeftX, V3.X), RightX = Math.max(RightX, V3.X);
            // for (const V3 of this.RightSidePoints) LeftX = Math.min(LeftX, V3.X), RightX = Math.max(RightX, V3.X);
            const Bottom = getTopBottomAtX(this.LeftSidePoints, this.RightSidePoints, X).bottom?.point.Z;
            if (Bottom != Bottom || Bottom == null) return 0;
            return Bottom;
        }

        return 0;
    }

    CF_A0!: CFrame;
    CF_B0!: CFrame;

    CF_A1!: CFrame;
    CF_B1!: CFrame;

    Update() {
        this.CF_A0 = CFrame.Angles(0, this._Angle, 0).TranslateAdd(this._InnerFocusPointA);
        this.CF_B0 = CFrame.Angles(0, this._Angle, 0).TranslateAdd(this._InnerFocusPointB);

        this.CF_A1 = CFrame.Angles(0, this._Angle, 0).TranslateAdd(this._OuterFocusPointA);
        this.CF_B1 = CFrame.Angles(0, this._Angle, 0).TranslateAdd(this._OuterFocusPointB);

        if (this.UpdateBabylon) this.UpdateBabylon();
    }

    Delete() {
        if (this.DeleteBabylon) this.DeleteBabylon();
    }

    _DrawFromPoint: Vector3 = new Vector3(); get DrawFromPoint() { return this._DrawFromPoint; };

    UpdateXZ(OverrideLengthAnchor?: -1 | 0 | 1, OverrideRunAnchor?: -1 | 0 | 1) {
        this.DrawMatrix(this._DrawFromPoint.X, this._DrawFromPoint.Z, OverrideLengthAnchor ?? this.LengthAnchor, OverrideRunAnchor ?? this.RunAnchor);
    }

    RiseAnchor: -1 | 0 | 1 = -1;
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

        this.Update();
        if (this.UpdateFocusLine) this.UpdateFocusLine();
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


    _PITCH = 1;
    _RISE = 1;
    _RUN = 1;

    get PITCH() { return this._PITCH * 12; };
    get RISE() { return this._RISE; };
    get RUN() { return this._RUN; };

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
        this.UpdateXZ();
        this._TopHeight = this._CenterHeight + this._RISE / 2;
        this._BottomHeight = this._CenterHeight - this._RISE / 2;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
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
        this.UpdateXZ();
        this._TopHeight = this._CenterHeight + this._RISE / 2;
        this._BottomHeight = this._CenterHeight - this._RISE / 2;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
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
        this.UpdateXZ();
        this._TopHeight = this._CenterHeight + this._RISE / 2;
        this._BottomHeight = this._CenterHeight - this._RISE / 2;
        this._InnerFocusCenter.Y = this._InnerFocusPointA.Y = this._InnerFocusPointB.Y = this._TopHeight;
        this._MiddleFocusCenter.Y = this._MiddleFocusPointA.Y = this._MiddleFocusPointB.Y = this._CenterHeight;
        this._OuterFocusCenter.Y = this._OuterFocusPointA.Y = this._OuterFocusPointB.Y = this._BottomHeight;
    };

    _Length = 0;
    get Length() { return this._Length; };
    set Length(value: number) {
        this._Length = value;
        this.UpdateXZ();
    };

    _Angle = 0;
    get Angle() { return this._Angle; };
    set Angle(value: number) {
        this._Angle = value;
        this.UpdateXZ();
    };
}

// Alias for backwards compatibility — SketchPlane was formerly SketchLine
export const SketchLine = SketchPlane;