/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */

type xyz_Class = { x: number, y: number, z: number };

export class Vector3 {
    ToCFrame() { return CFrame.fromVector3(this); };
    ToBabylon!: () => any;
    ToBabylonXZY!: () => any;
    constructor(X = 0, Y = 0, Z = 0) {
        this.X = X;
        this.Y = Y;
        this.Z = Z;
    }

    _X = 0;
    _Y = 0;
    _Z = 0;

    get XY() { return new Vector3(this._X, this._Y); };
    get XZ() { return new Vector3(this._X, 0, this._Z); };
    get XZY() { return new Vector3(this._X, this._Z, this._Y); };

    set x(value: number) { this._X = value; };
    set y(value: number) { this._Y = value; };
    set z(value: number) { this._Z = value; };
    set X(value: number) { this._X = value; };
    set Y(value: number) { this._Y = value; };
    set Z(value: number) { this._Z = value; };

    get x() { return this._X; };
    get y() { return this._Y; };
    get z() { return this._Z; };
    get X() { return this._X; };
    get Y() { return this._Y; };
    get Z() { return this._Z; };

    get Magnitude() { return (this.X ** 2 + this.Y ** 2 + this.Z ** 2) ** .5; };

    get Unit() {
        let Magnitude = this.Magnitude;
        if (Magnitude > 0) return new Vector3(this.X / Magnitude, this.Y / Magnitude, this.Z / Magnitude);
        else return new Vector3();
    }

    ApplyXYZ(X: number, Y: number, Z: number) {
        this.X = X; this.Y = Y; this.Z = Z;
        return this;
    }

    Lerp(v3: Vector3, t: number) { return new Vector3(this.X + (v3.X - this.X) * t, this.Y + (v3.Y - this.Y) * t, this.Z + (v3.Z - this.Z) * t); };
    Dot(v3: Vector3) { return this.X * v3.X + this.Y * v3.Y + this.Z * v3.Z; };
    Cross(v3: Vector3) { return new Vector3(this.Y * v3.Z - this.Z * v3.Y, this.Z * v3.X - this.X * v3.Z, this.X * v3.Y - this.Y * v3.X); };
    Min(v3: Vector3) { return new Vector3(Math.min(this.X, v3.X), Math.min(this.Y, v3.Y), Math.min(this.Z, v3.Z)); };
    Max(v3: Vector3) { return new Vector3(Math.max(this.X, v3.X), Math.max(this.Y, v3.Y), Math.max(this.Z, v3.Z)); };

    Scale(X: number) { return new Vector3(this.X * X, this.Y * X, this.Z * X); };
    ScaleByZ(Z: number) { return new Vector3(this.X, this.Y, this.Z * Z); };
    ScaleByVector(v3: Vector3) { return new Vector3(this.X * v3.X, this.Y * v3.Y, this.Z * v3.Z); };
    TranslateAdd(Add: Vector3) { return new Vector3(this.X + Add.X, this.Y + Add.Y, this.Z + Add.Z); };
    TranslateSub(Sub: Vector3) { return new Vector3(this.X - Sub.X, this.Y - Sub.Y, this.Z - Sub.Z); };
    Average(V3: Vector3) { return new Vector3((this.X + V3.X) / 2, (this.Y + V3.Y) / 2, (this.Z + V3.Z) / 2); };
    static AverageAll(V3s: Vector3[]) {
        let X = 0, Y = 0, Z = 0;
        for (let v of V3s) {
            X += v.x;
            Y += v.y;
            Z += v.z;
        }
        let Count = V3s.length; if (Count == 0) Count = 1;
        return new Vector3(X / Count, Y / Count, Z / Count);
    };
    static Bounds(V3s: Vector3[]) {
        let MinX!: number, MinY!: number, MinZ!: number;
        let MaxX!: number, MaxY!: number, MaxZ!: number;
        for (let V3 of V3s) {
            if (MinX == null) MinX = V3.x, MinY = V3.y, MinZ = V3.z, MaxX = V3.x, MaxY = V3.y, MaxZ = V3.z;
            MinX = Math.min(MinX, V3.x), MinY = Math.min(MinY, V3.y), MinZ = Math.min(MinZ, V3.z);
            MaxX = Math.max(MaxX, V3.x), MaxY = Math.max(MaxY, V3.y), MaxZ = Math.max(MaxZ, V3.z);
        }
        return [new Vector3(MinX, MinY, MinZ), new Vector3(MaxX, MaxY, MaxZ)];
    }
    static CenterBounds(V3s: Vector3[]) {
        let Bounds = Vector3.Bounds(V3s);
        return Bounds[0].Average(Bounds[1]);
    }
    Edit(V3: Vector3) { this.X = V3.X; this.Y = V3.Y; this.Z = V3.Z; return this; };
    EditXY(V3: Vector3) { this.X = V3.X; this.Y = V3.Y; return this; };

    ToList() { return [this.X, this.Y, this.Z]; };



    DistanceFromPoint(A: xyz_Class) { return ((this.x - A.x) ** 2 + (this.y - A.y) ** 2 + (this.z - A.z) ** 2) ** .5; };
    DistanceFromPointV2(A: Vector3) { return ((this.x - A.x) ** 2 + (this.y - A.y) ** 2) ** .5; };
    DistanceFromPointXZ(A: Vector3) { return ((this.x - A.x) ** 2 + (this.z - A.z) ** 2) ** .5; };


    PointOnSegment(a: xyz_Class, b: xyz_Class, eps = 1e-10) {
        const cross = (b.z - a.z) * (this.x - a.x) -
            (b.x - a.x) * (this.z - a.z);

        if (Math.abs(cross) > eps) return false; // not colinear

        const dot = (this.x - a.x) * (b.x - a.x) +
            (this.z - a.z) * (b.z - a.z);
        if (dot < -eps) return false;

        const lenSq = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
        if (dot > lenSq + eps) return false;

        return true;
    };
    PointInPolygon(poly: xyz_Class[], epsilon = 1e-10) {
        let inside = false;

        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            // console.log(i, j);
            const xi = poly[i].x, yi = poly[i].z;
            const xj = poly[j].x, yj = poly[j].z;
            // Check if point is exactly on a boundary edge
            // if (this.PointOnSegment(poly[j], poly[i], epsilon)) return true;

            // Check if the ray intersects the edge
            const intersect =
                ((yi > this.z) !== (yj > this.z)) &&
                (this.x < (xj - xi) * (this.z - yi) / (yj - yi + epsilon) + xi);

            if (intersect) inside = !inside; // true; // 
        }

        return inside;
    };
    // LineInPolygon(end: Vector3, poly: Vector3[], epsilon = 1e-10) {
    //     let inside = false;

    //     for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    //         // console.log(i, j);
    //         const xi = poly[i].x, yi = poly[i].z;
    //         const xj = poly[j].x, yj = poly[j].z;
    //         // Check if point is exactly on a boundary edge
    //         // if (this.PointOnSegment(poly[j], poly[i], epsilon)) return true;

    //         // Check if the ray intersects the edge
    //         const intersect =
    //             ((yi > this.z) !== (yj > this.z)) &&
    //             (this.x < (xj - xi) * (this.z - yi) / (yj - yi + epsilon) + xi);

    //         if (intersect) inside = !inside; // true; // 
    //     }

    //     return inside;
    // };
}








export type SegmentIntersectionInfoType = {
    Result2D: Vector3 | null;
    Alpha2D0: number | null;
    Alpha2D1: number | null;
    Within2D: boolean | null;

    Result3D: Vector3 | null;
    Alpha3D0: number | null;
    Alpha3D1: number | null;
    Within3D: boolean | null;

    P0_DiffZ: number;
    P1_DiffZ: number;
}
// export function SegmentIntersectionInfo() { };
export function SegmentIntersectionInfo(P1: Vector3, P2: Vector3, P3: Vector3, P4: Vector3, Epsilon: number) {
    let S2D = segmentIntersection2D(P1, P2, P3, P4);
    let S3D = segmentIntersection3D(P1, P2, P3, P4, Epsilon);
    let Info = { Result2D: S2D?.point, Alpha2D0: S2D?.t1, Alpha2D1: S2D?.t2, Within2D: S2D != null && (0 <= S2D.t1 && S2D.t1 <= 1 && 0 <= S2D.t2 && S2D.t2 <= 1) } as SegmentIntersectionInfoType;
    if (S3D != null) {
        Info.Result3D = S3D.point;
        Info.Alpha3D0 = S3D.t1;
        Info.Alpha3D1 = S3D.t2;
        Info.Within3D = 0 <= S3D.t1 && S3D.t1 <= 1 && 0 <= S3D.t2 && S3D.t2 <= 1;
    }
    Info.P0_DiffZ = Math.abs(P1.Z - P3.Z);
    Info.P1_DiffZ = Math.abs(P2.Z - P4.Z);
    return Info;
}

export function segmentIntersection2D(p1: xyz_Class, p2: xyz_Class, p3: xyz_Class, p4: xyz_Class) {
    const x1 = p1.x, y1 = p1.z;
    const x2 = p2.x, y2 = p2.z;
    const x3 = p3.x, y3 = p3.z;
    const x4 = p4.x, y4 = p4.z;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (Math.abs(denom) < 1e-10)
        return null; // Parallel or colinear (infinite or none)

    const px =
        ((x1 * y2 - y1 * x2) * (x3 - x4) -
            (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;

    const py =
        ((x1 * y2 - y1 * x2) * (y3 - y4) -
            (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

    // let t1 = (new Vector3(px, 0, py).TranslateSub(p1)).ScaleByVector(p2.TranslateSub(p1));
    // let t1 = 

    return {
        point: new Vector3(px, py),
        t1: (((px - x1) ** 2 + (py - y1) ** 2) ** .5) / (((x2 - x1) ** 2 + (y2 - y1) ** 2) ** .5) * Math.min(x1 <= px && px <= x2 || x2 <= px && px <= x1 ? 1 : -1, y1 <= py && py <= y2 || y2 <= py && py <= y1 ? 1 : -1),
        t2: (((px - x3) ** 2 + (py - y3) ** 2) ** .5) / (((x4 - x3) ** 2 + (y4 - y3) ** 2) ** .5) * Math.min(x3 <= px && px <= x4 || x4 <= px && px <= x3 ? 1 : -1, y3 <= py && py <= y4 || y4 <= py && py <= y3 ? 1 : -1),
        p1: p1, p2: p2, p3: p3, p4: p4
    };
    // return { point: new Vector3(px, py), t1: (point-p1)/(p2-p1), t2: (px - x3) / (x4 - x3), p1: p1, p2: p2, p3: p3, p4: p4 };
    // return { point: new Vector3(px, py), t1: (px - x1) / (x2 - x1), t2: (px - x3) / (x4 - x3), p1: p1, p2: p2, p3: p3, p4: p4 };
}

function segmentIntersection3D(p1: Vector3, p2: Vector3, p3: Vector3, p4: Vector3, epsilon = 1e-6) {
    // Direction vectors
    const u = p2.TranslateSub(p1); // segment 1 direction
    const v = p4.TranslateSub(p3); // segment 2 direction
    const w0 = p1.TranslateSub(p3);

    const a = u.Dot(u); // always >= 0
    const b = u.Dot(v);
    const c = v.Dot(v); // always >= 0
    const d = u.Dot(w0);
    const e = v.Dot(w0);

    const D = a * c - b * b; // denominator for the system

    // If D is near zero, lines are almost parallel
    if (Math.abs(D) < epsilon) {
        // Parallel or almost parallel: either no intersection, or infinite overlap.
        // You can add extra logic here if you care about colinear overlap.
        return null;
    }

    // Parameters of closest points on the infinite lines
    const s = (b * e - c * d) / D; // parameter on line1 (p1 + s*u)
    const t = (a * e - b * d) / D; // parameter on line2 (p3 + t*v)

    // Check if closest points are within the segment ranges
    if (s < -epsilon || s > 1 + epsilon || t < -epsilon || t > 1 + epsilon) {
        return null; // closest approach is outside one or both segments
    }

    // Compute the actual closest points
    const closest1 = p1.TranslateAdd(u.Scale(s));
    const closest2 = p3.TranslateAdd(v.Scale(t));

    // Distance between closest points
    const dist = closest1.DistanceFromPoint(closest2);

    if (dist > epsilon) {
        // Lines are skew or just don't quite meet
        return null;
    }

    // Intersection point (average of the two closest points to reduce numerical error)
    const intersection = new Vector3(
        0.5 * (closest1.x + closest2.x),
        0.5 * (closest1.y + closest2.y),
        0.5 * (closest1.z + closest2.z),
    );

    return { point: intersection, t1: s, t2: t };
}

// function segmentIntersection3DMapped2D(p1: Vector3, p2: Vector3, p3: Vector3, p4: Vector3, epsilon = 1e-6) {
//     // Direction vectors
//     const u = p2.TranslateSub(p1); u.Y = 0; // segment 1 direction
//     const v = p4.TranslateSub(p3); v.Y = 0; // segment 2 direction
//     const w0 = p1.TranslateSub(p3); w0.Y = 0;

//     const a = u.Dot(u); // always >= 0
//     const b = u.Dot(v);
//     const c = v.Dot(v); // always >= 0
//     const d = u.Dot(w0);
//     const e = v.Dot(w0);

//     const D = a * c - b * b; // denominator for the system

//     // If D is near zero, lines are almost parallel
//     // Parallel or almost parallel: either no intersection, or infinite overlap.
//     // You can add extra logic here if you care about colinear overlap.
//     if (Math.abs(D) < epsilon) return null;

//     // Parameters of closest points on the infinite lines
//     const s = (b * e - c * d) / D; // parameter on line1 (p1 + s*u)
//     const t = (a * e - b * d) / D; // parameter on line2 (p3 + t*v)

//     // Check if closest points are within the segment ranges
//     if (s < -epsilon || s > 1 + epsilon || t < -epsilon || t > 1 + epsilon) return null; // closest approach is outside one or both segments

//     // Compute the actual closest points
//     const closest1 = p1.TranslateAdd(u.Scale(s)); closest1.Y = 0;
//     const closest2 = p3.TranslateAdd(v.Scale(t)); closest2.Y = 0;

//     // Distance between closest points
//     const dist = closest1.DistanceFromPoint(closest2);

//     // Lines are skew or just don't quite meet
//     if (dist > epsilon) return null;

//     // Intersection point (average of the two closest points to reduce numerical error)
//     const intersection = closest1.Average(closest2);

//     return { point: intersection, t1: s, t2: t };
// }














export class CFrame {
    static RIGHT = new Vector3(1, 0, 0);
    static UP = new Vector3(0, 1, 0);
    static BACK = new Vector3(0, 0, 1);

    _X = 0; _Y = 0; _Z = 0;
    R00 = 1; R01 = 0; R02 = 0; //_X = 0;
    R10 = 0; R11 = 1; R12 = 0; //_Y = 0;
    R20 = 0; R21 = 0; R22 = 1; //_Z = 0;
    ToBabylon!: () => any[];

    set X(value: number) { this._X = value; this._Position.X = value; };
    set Y(value: number) { this._Y = value; this._Position.Y = value; };
    set Z(value: number) { this._Z = value; this._Position.Z = value; };

    get x() { return this._X; };
    get y() { return this._Y; };
    get z() { return this._Z; };
    get X() { return this._X; };
    get Y() { return this._Y; };
    get Z() { return this._Z; };

    _Position: Vector3 = new Vector3();
    _LookVector: Vector3 = new Vector3(0, 0, -1);
    _RightVector: Vector3 = new Vector3(1, 0, 0);
    _UpVector: Vector3 = new Vector3(0, 1, 0);

    set Position(value: Vector3) { this._X = value.X; this._Y = value.Y; this._Z = value.Z; this._Position = value; };
    set LookVector(value: Vector3) { this._LookVector = value; };
    set RightVector(value: Vector3) { this._RightVector = value; };
    set UpVector(value: Vector3) { this._UpVector = value; };

    get Position() { return this._Position; };
    get LookVector() { return this._LookVector; };
    get RightVector() { return this._RightVector; };
    get UpVector() { return this._UpVector; };

    FlattenPoints(V3s: Vector3[]) {
        let Flattened: Vector3[] = [];
        for (let V3 of V3s) Flattened.push(this.ToObjectSpace(CFrame.fromVector3(V3)).Position);
        return Flattened;
    };

    Vector3Bounds(V3s: Vector3[]) { return Vector3.Bounds(this.FlattenPoints(V3s)); };

    constructor(params?: any[]) {
        // this.R00 = 1; this.R01 = 0; this.R02 = 0;
        // this.R10 = 0; this.R11 = 1; this.R12 = 0;
        // this.R20 = 0; this.R21 = 0; this.R22 = 1;
        // this.CreationType = "Default";
        let length = params == null ? 0 : params.length;
        if (params == null || params.length == 0) return;
        if (length > 12) console.error("Invalid number of arguments: " + length);
        else if (length == 0) { /*this.X = 0; this.Y = 0; this.Z = 0;*/ } // this.CreationType = "0-Default";
        else if (length == 1) {
            let pos = params[0];
            this._X = pos.x; this._Y = pos.y; this._Z = pos.z;
            // this.CreationType = "1-Vector3";
        }
        else if (length == 2) {
            let pos = params[0], lookAt = params[1];
            let zAxis = pos.TranslateSub(lookAt).Unit;
            let xAxis = CFrame.UP.Cross(zAxis);
            let yAxis = zAxis.Cross(xAxis);
            if (xAxis.Magnitude == 0) {
                if (zAxis.Y < 0) {
                    xAxis = new Vector3(0, 0, -1);
                    yAxis = new Vector3(1, 0, 0);
                    zAxis = new Vector3(0, -1, 0);
                }
                else {
                    xAxis = new Vector3(0, 0, 1);
                    yAxis = new Vector3(1, 0, 0);
                    zAxis = new Vector3(0, 1, 0);
                }
            }
            this.R00 = xAxis.X; this.R01 = yAxis.X; this.R02 = zAxis.X; this._X = pos.X;
            this.R10 = xAxis.Y; this.R11 = yAxis.Y; this.R12 = zAxis.Y; this._Y = pos.Y;
            this.R20 = xAxis.Z; this.R21 = yAxis.Z; this.R22 = zAxis.Z; this._Z = pos.Z;
            // this.CreationType = "2-LookAt";
        }
        else if (length == 3) { this.X = params[0]; this.Y = params[1]; this.Z = params[2]; } // this.CreationType = "3-XYZ";
        else if (length == 7) {
            let X = params[0], Y = params[1], Z = params[2], qX = params[3], qY = params[4], qZ = params[5], qW = params[6];
            this._X = X;
            this._Y = Y;
            this._Z = Z;
            this.R00 = 1 - 2 * qY ** 2 - 2 * qZ ** 2;
            this.R01 = 2 * (qX * qY - qZ * qW);
            this.R02 = 2 * (qX * qZ + qY * qW);
            this.R10 = 2 * (qX * qY + qZ * qW);
            this.R11 = 1 - 2 * qX ** 2 - 2 * qZ ** 2;
            this.R12 = 2 * (qY * qZ - qX * qW);
            this.R20 = 2 * (qX * qZ - qY * qW);
            this.R21 = 2 * (qY * qZ + qX * qW);
            this.R22 = 1 - 2 * qX ** 2 - 2 * qY ** 2;
            // this.CreationType = "7-Quaternion";
        }
        else if (length == 12) {
            let X = params[0], Y = params[1], Z = params[2], R00 = params[3], R01 = params[4], R02 = params[5], R10 = params[6], R11 = params[7], R12 = params[8], R20 = params[9], R21 = params[10], R22 = params[11];
            this.R00 = R00; this.R01 = R01; this.R02 = R02; this._X = X;
            this.R10 = R10; this.R11 = R11; this.R12 = R12; this._Y = Y;
            this.R20 = R20; this.R21 = R21; this.R22 = R22; this._Z = Z;
            // this.CreationType = "12-Components";
            // console.log(params);
        }
        else console.error("Malformed CFrame.");

        this._Position = new Vector3(this.X, this.Y, this.Z);
        this._LookVector = new Vector3(-this.R02, -this.R12, -this.R22);
        this._RightVector = new Vector3(this.R00, this.R10, this.R20);
        this._UpVector = new Vector3(this.R01, this.R11, this.R21);
    };

    get Rotation() { return CFrame.fromComponents(0, 0, 0, this.R00, this.R01, this.R02, this.R10, this.R11, this.R12, this.R20, this.R21, this.R22); };

    static identity = new CFrame();

    static fromXYZ(X = 0, Y = 0, Z = 0) { return new CFrame([X, Y, Z]); };
    static fromVector3(pos: Vector3) { return new CFrame([pos]); };
    static lookAt(pos: Vector3, lookAt: Vector3) { return new CFrame([pos, lookAt]); };
    // static lookAlong(pos, direction) { return new CFrame(); };
    static fromQuaternion(qX: number, qY: number, qZ: number, qW: number) { return new CFrame([0, 0, 0, qX, qY, qZ, qW]); };
    static fromComponents(X: number, Y: number, Z: number, R00: number, R01: number, R02: number, R10: number, R11: number, R12: number, R20: number, R21: number, R22: number) { return new CFrame([X, Y, Z, R00, R01, R02, R10, R11, R12, R20, R21, R22]); };

    Distance(A: CFrame | Vector3) { return ((this.X - A.X) ** 2 + (this.Y - A.Y) ** 2 + (this.Z - A.Z) ** 2) ** .5; };
    // Could probably do a custom version that ACTUALLY takes into account the rotation.

    ToQuaternion() {
        let trace = this.R00 + this.R11 + this.R22;
        if (trace > 0) {
            let s = (1 + trace) ** .5;
            let r = 0.5 / s;
            return [(this.R21 - this.R12) * r, (this.R02 - this.R20) * r, (this.R10 - this.R01) * r, s * 0.5];
        }
        let big = Math.max(this.R00, this.R11, this.R22);
        if (big == this.R00) {
            let s = (1 + this.R00 - this.R11 - this.R22) ** .5;
            let r = 0.5 / s;
            return [0.5 * s, (this.R10 + this.R01) * r, (this.R02 + this.R20) * r, (this.R21 - this.R12) * r];
        }
        else if (big == this.R11) {
            let s = (1 - this.R00 + this.R11 - this.R22) ** .5;
            let r = 0.5 / s;
            return [(this.R10 + this.R01) * r, 0.5 * s, (this.R21 + this.R12) * r, (this.R02 - this.R20) * r];
        }
        else /*if (big == this.R22)*/ {
            let s = (1 - this.R00 - this.R11 + this.R22) ** .5;
            let r = 0.5 / s;
            return [(this.R02 + this.R20) * r, (this.R21 + this.R12) * r, 0.5 * s, (this.R10 - this.R01) * r];
        };
    };

    static fromAxisAngle(axis: Vector3, theta: number) {
        axis = axis.Unit;
        let r = CFrame.RIGHT.Scale(Math.cos(theta)).TranslateAdd(axis.Scale(CFrame.RIGHT.Dot(axis) * (1 - Math.cos(theta)))).TranslateAdd(axis.Cross(CFrame.RIGHT).Scale(Math.sin(theta)));
        let t = CFrame.UP.Scale(Math.cos(theta)).TranslateAdd(axis.Scale(CFrame.UP.Dot(axis) * (1 - Math.cos(theta)))).TranslateAdd(axis.Cross(CFrame.UP).Scale(Math.sin(theta)));
        let b = CFrame.BACK.Scale(Math.cos(theta)).TranslateAdd(axis.Scale(CFrame.BACK.Dot(axis) * (1 - Math.cos(theta)))).TranslateAdd(axis.Cross(CFrame.BACK).Scale(Math.sin(theta)));
        return CFrame.fromComponents(0, 0, 0, r.X, t.X, b.X, r.Y, t.Y, b.Y, r.Z, t.Z, b.Z);
    };

    static Angles(rx: number, ry: number, rz: number) {
        let R00 = Math.cos(ry) * Math.cos(rz);
        let R01 = -Math.cos(ry) * Math.sin(rz);
        let R02 = Math.sin(ry);
        let R10 = Math.cos(rz) * Math.sin(rx) * Math.sin(ry) + Math.cos(rx) * Math.sin(rz);
        let R11 = Math.cos(rx) * Math.cos(rz) - Math.sin(rx) * Math.sin(ry) * Math.sin(rz);
        let R12 = -Math.cos(ry) * Math.sin(rx);
        let R20 = Math.sin(rx) * Math.sin(rz) - Math.cos(rx) * Math.cos(rz) * Math.sin(ry);
        let R21 = Math.cos(rz) * Math.sin(rx) + Math.cos(rx) * Math.sin(ry) * Math.sin(rz);
        let R22 = Math.cos(rx) * Math.cos(ry);

        return CFrame.fromComponents(0, 0, 0, R00, R01, R02, R10, R11, R12, R20, R21, R22);
    };

    static fromEulerAnglesXYZ(rx: number, ry: number, rz: number) { return CFrame.Angles(rx, ry, rz); };
    static fromEulerAnglesYXZ(rx: number, ry: number, rz: number) {
        let cx = Math.cos(rx), sx = Math.sin(rx);
        let cy = Math.cos(ry), sy = Math.sin(ry);
        let cz = Math.cos(rz), sz = Math.sin(rz);

        return CFrame.fromComponents(0, 0, 0,
            cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx,
            cx * sz, cx * cz, -sx,
            -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx
        );
    };

    Inverse() {
        let det = this.R00 * this.R11 * this.R22 + this.R01 * this.R12 * this.R20 + this.R02 * this.R10 * this.R21 - this.R00 * this.R12 * this.R21 - this.R01 * this.R10 * this.R22 - this.R02 * this.R11 * this.R20;
        if (det == 0) return this;
        let R00 = (this.R11 * this.R22 - this.R12 * this.R21) / det;
        let R01 = (this.R02 * this.R21 - this.R01 * this.R22) / det;
        let R02 = (this.R01 * this.R12 - this.R02 * this.R11) / det;
        let bX = (this.R01 * this.Y * this.R22 + this.R02 * this.R11 * this.Z + this.X * this.R12 * this.R21 - this.R01 * this.R12 * this.Z - this.R02 * this.Y * this.R21 - this.X * this.R11 * this.R22) / det;
        let R10 = (this.R12 * this.R20 - this.R10 * this.R22) / det;
        let R11 = (this.R00 * this.R22 - this.R02 * this.R20) / det;
        let R12 = (this.R02 * this.R10 - this.R00 * this.R12) / det;
        let bY = (this.R00 * this.R12 * this.Z + this.R02 * this.Y * this.R20 + this.X * this.R10 * this.R22 - this.R00 * this.Y * this.R22 - this.R02 * this.R10 * this.Z - this.X * this.R12 * this.R20) / det;
        let R20 = (this.R10 * this.R21 - this.R11 * this.R20) / det;
        let R21 = (this.R01 * this.R20 - this.R00 * this.R21) / det;
        let R22 = (this.R00 * this.R11 - this.R01 * this.R10) / det;
        let bZ = (this.R00 * this.Y * this.R21 + this.R01 * this.R10 * this.Z + this.X * this.R11 * this.R20 - this.R00 * this.R11 * this.Z - this.R01 * this.Y * this.R20 - this.X * this.R10 * this.R21) / det;
        return CFrame.fromComponents(bX, bY, bZ, R00, R01, R02, R10, R11, R12, R20, R21, R22);
    };

    ToWorldSpace(cf: CFrame) { // CFrame * cf
        let R00 = this.R00 * cf.R00 + this.R01 * cf.R10 + this.R02 * cf.R20;
        let R01 = this.R00 * cf.R01 + this.R01 * cf.R11 + this.R02 * cf.R21;
        let R02 = this.R00 * cf.R02 + this.R01 * cf.R12 + this.R02 * cf.R22;
        let X = this.R00 * cf.X + this.R01 * cf.Y + this.R02 * cf.Z + this.X;
        let R10 = this.R10 * cf.R00 + this.R11 * cf.R10 + this.R12 * cf.R20;
        let R11 = this.R10 * cf.R01 + this.R11 * cf.R11 + this.R12 * cf.R21;
        let R12 = this.R10 * cf.R02 + this.R11 * cf.R12 + this.R12 * cf.R22;
        let Y = this.R10 * cf.X + this.R11 * cf.Y + this.R12 * cf.Z + this.Y;
        let R20 = this.R20 * cf.R00 + this.R21 * cf.R10 + this.R22 * cf.R20;
        let R21 = this.R20 * cf.R01 + this.R21 * cf.R11 + this.R22 * cf.R21;
        let R22 = this.R20 * cf.R02 + this.R21 * cf.R12 + this.R22 * cf.R22;
        let Z = this.R20 * cf.X + this.R21 * cf.Y + this.R22 * cf.Z + this.Z;
        return CFrame.fromComponents(X, Y, Z, R00, R01, R02, R10, R11, R12, R20, R21, R22);
    }

    ToObjectSpace(cf: CFrame) { return this.Inverse().ToWorldSpace(cf); }; // CFrame:Inverse() * cf

    PointToWorldSpace(v3: Vector3) { // CFrame * v3
        let right = new Vector3(this.R00, this.R10, this.R20);
        let top = new Vector3(this.R01, this.R11, this.R21);
        let back = new Vector3(this.R02, this.R12, this.R22);
        return this.Position.TranslateAdd(right.Scale(v3.X)).TranslateAdd(top.Scale(v3.Y)).TranslateAdd(back.Scale(v3.Z)); // Need to include Rotation.
    };

    PointToObjectSpace(v3: Vector3) { return this.Inverse().PointToWorldSpace(v3); }; // CFrame:Inverse() * v3
    VectorToWorldSpace(v3: Vector3) { return this.Rotation.PointToWorldSpace(v3); }; // CFrame.Rotation * v3? // (CFrame - CFrame.Position) * v3 
    VectorToObjectSpace(v3: Vector3) { return this.Rotation.PointToObjectSpace(v3); }; // CFrame.Rotation:Inverse() * v3? // (CFrame:Inverse() - CFrame:Inverse().Position) * v3

    TranslateAdd(v3: Vector3) { return CFrame.fromComponents(this.X + v3.X, this.Y + v3.Y, this.Z + v3.Z, this.R00, this.R01, this.R02, this.R10, this.R11, this.R12, this.R20, this.R21, this.R22); };
    TranslateSub(v3: Vector3) { return CFrame.fromComponents(this.X - v3.X, this.Y - v3.Y, this.Z - v3.Z, this.R00, this.R01, this.R02, this.R10, this.R11, this.R12, this.R20, this.R21, this.R22); };

    GetComponents() { return [this.X, this.Y, this.Z, this.R00, this.R01, this.R02, this.R10, this.R11, this.R12, this.R20, this.R21, this.R22]; };

    ToEulerAnglesXYZ() {
        let X = Math.atan2(-this.R12, this.R22);
        let Y = Math.asin(this.R02);
        let Z = Math.atan2(-this.R01, this.R00);
        return [X, Y, Z];
    };

    ToEulerAnglesZYX() {
        let X = Math.atan2(this.R10, this.R00);
        let Y = Math.asin(-this.R20);
        let Z = Math.atan2(this.R21, this.R22);
        return [X, Y, Z];
    };
}