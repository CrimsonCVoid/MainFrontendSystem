/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class Vector3 {
    ToCFrame() { return CFrame.fromVector3(this); };
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

    get x() { return this._X; }; set x(value: number) { this._X = value; };
    get y() { return this._Y; }; set y(value: number) { this._Y = value; };
    get z() { return this._Z; }; set z(value: number) { this._Z = value; };
    get X() { return this._X; }; set X(value: number) { this._X = value; };
    get Y() { return this._Y; }; set Y(value: number) { this._Y = value; };
    get Z() { return this._Z; }; set Z(value: number) { this._Z = value; };

    get Magnitude() { return (this.X ** 2 + this.Y ** 2 + this.Z ** 2) ** .5; };

    get Unit() {
        let Magnitude = this.Magnitude;
        if (Magnitude > 0) return new Vector3(this.X / Magnitude, this.Y / Magnitude, this.Z / Magnitude);
        else return new Vector3();
    }

    Lerp(v3: Vector3, t: number) { return new Vector3(this.X + (v3.X - this.X) * t, this.Y + (v3.Y - this.Y) * t, this.Z + (v3.Z - this.Z) * t); };
    Dot(v3: Vector3) { return this.X * v3.X + this.Y * v3.Y + this.Z * v3.Z; };
    Cross(v3: Vector3) { return new Vector3(this.Y * v3.Z - this.Z * v3.Y, this.Z * v3.X - this.X * v3.Z, this.X * v3.Y - this.Y * v3.X); };

    Scale(X: number) { return new Vector3(this.X * X, this.Y * X, this.Z * X); };
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

    DistanceFromPointXZ(A: Vector3) { return ((this.x - A.x) ** 2 + (this.z - A.z) ** 2) ** .5; };
}

export class CFrame {
    static RIGHT = new Vector3(1, 0, 0);
    static UP = new Vector3(0, 1, 0);
    static BACK = new Vector3(0, 0, 1);

    _X = 0; _Y = 0; _Z = 0;
    R00 = 1; R01 = 0; R02 = 0; //_X = 0;
    R10 = 0; R11 = 1; R12 = 0; //_Y = 0;
    R20 = 0; R21 = 0; R22 = 1; //_Z = 0;

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

    constructor(params?: any[]) {
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