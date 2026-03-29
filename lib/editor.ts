// import * as BABYLON from "@babylonjs/core/index.js";

import * as BABYLON from "@babylonjs/core";
import * as BABYLON_UI from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";

// import { PanelEngine } from "./panelview.bl.js";
// import { Scene, Camera, Engine, RoofUI } from "./roofedit.bl.js";
// import { CFrame, Vector3 } from "./positioning";
// import * from "./Editor.d.ts";
import { SketchLine } from "./drawings";

// import { CreateMarker } from "./editor-utils"; // SwitchMap

import TestingConfig from "./EditorUI.json";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Test } from "./backend"; // DebuggingClass
import { earcut } from "./earcut";
import { CFrame, Vector3 } from "./positioning";

type xyz_Class = { x: number, y: number, z: number };

// async function Test() {

// }

type BABYLON_LineOptions = {
    points: BABYLON.Vector3[];
    updatable?: boolean;
    instance?: BABYLON.Nullable<BABYLON.LinesMesh>;
    colors?: BABYLON.Color4[];
    useVertexAlpha?: boolean;
    material?: BABYLON.Material;
}

type BABYLON_DashedLineOptions = {
    points: BABYLON.Vector3[];
    dashSize?: number;
    gapSize?: number;
    dashNb?: number;
    updatable?: boolean;
    instance?: BABYLON.LinesMesh;
    useVertexAlpha?: boolean;
    material?: BABYLON.Material;
}

type EditorControls = {
    Rectangle1: BABYLON_UI.Rectangle;
    Rectangle2: BABYLON_UI.Rectangle;
    Rectangle3: BABYLON_UI.Rectangle;

    Line: BABYLON_UI.Line;
    Line0: BABYLON_UI.Line;
    Line1: BABYLON_UI.Line;
    Line2: BABYLON_UI.Line;
    Line3: BABYLON_UI.Line;

    Textblock0: BABYLON_UI.TextBlock;
    Textblock1: BABYLON_UI.TextBlock;
    Textblock2: BABYLON_UI.TextBlock;
    Textblock3: BABYLON_UI.TextBlock;

    Primary0: BABYLON_UI.Button;
    Primary1: BABYLON_UI.Button;
    Primary2: BABYLON_UI.Button;
    Primary3: BABYLON_UI.Button;

    PrimaryText0?: BABYLON_UI.TextBlock;
    PrimaryText1?: BABYLON_UI.TextBlock;
    PrimaryText2?: BABYLON_UI.TextBlock;
    PrimaryText3?: BABYLON_UI.TextBlock;

    Line0A: BABYLON_UI.Line;
    Line0B: BABYLON_UI.Line;
    Line1A: BABYLON_UI.Line;
    Line1B: BABYLON_UI.Line,

    Checkbox0: BABYLON_UI.Checkbox,
    Checkbox1: BABYLON_UI.Checkbox,
    Checkbox2: BABYLON_UI.Checkbox,
    Checkbox3: BABYLON_UI.Checkbox,

    Rise0: BABYLON_UI.InputText,
    Rise1: BABYLON_UI.InputText,
    Rise2: BABYLON_UI.InputText,
    Rise3: BABYLON_UI.InputText,

    Run0: BABYLON_UI.InputText,
    Run1: BABYLON_UI.InputText,
    Run2: BABYLON_UI.InputText,
    Run3: BABYLON_UI.InputText,

    Pitch0: BABYLON_UI.InputText,
    Pitch1: BABYLON_UI.InputText,
    Pitch2: BABYLON_UI.InputText,
    Pitch3: BABYLON_UI.InputText,

    PrimaryVert: BABYLON_UI.Button;
    LineLength: BABYLON_UI.InputText;
    Info1: BABYLON_UI.InputText;
    Info2: BABYLON_UI.InputText;

    LiveDistanceData: {
        Marker: BABYLON.Mesh;
        Label: BABYLON_UI.TextBlock;
    };
    LiveXData: {
        Marker: BABYLON.Mesh;
        Label: BABYLON_UI.TextBlock;
    };
    LiveYData: {
        Marker: BABYLON.Mesh;
        Label: BABYLON_UI.TextBlock;
    };
    LiveXLineSettings: BABYLON_DashedLineOptions;
    LiveXLine: BABYLON.LinesMesh;
    LiveYLineSettings: BABYLON_DashedLineOptions;
    LiveYLine: BABYLON.LinesMesh;
};

export class Editor {
    static ActiveEditor: Editor;
    // static MapDebugging: DebuggingClass;

    Engine: BABYLON.Engine;
    Scene: BABYLON.Scene;
    Camera: BABYLON.ArcRotateCamera;
    RoofUI: AdvancedDynamicTexture;
    UI_Controls: EditorControls;

    // Root: BABYLON.TransformNode;
    static RoofPBR_Material: BABYLON.PBRMetallicRoughnessMaterial;

    PanelEngine?: BABYLON.Engine;

    DesignGrid: BABYLON.Mesh;

    DrawLine(Points: BABYLON.Vector3[]) {
        let L1LS: BABYLON_LineOptions = { points: Points, updatable: true };
        let L1Line = L1LS.instance = BABYLON.MeshBuilder.CreateLines("LINE", L1LS, this.Scene);
        L1Line.color = new BABYLON.Color3(1, 0, 0);
        return L1Line;
    }

    pickOnGround(px: number, py: number) {
        const pick = this.Scene.pick(px, py, m => m === this.DesignGrid);
        return pick?.hit ? pick.pickedPoint : null;
    }

    LabelMarkerXYZ(X: number, Y: number, Z: number, Text: string = "Vertex") {
        let marker = BABYLON.MeshBuilder.CreateSphere("marker", { diameter: 0.01 }, this.Scene);
        marker.isVisible = false; // don’t show it
        marker.position.set(X, Y, Z);
        // marker.position.set(V3.X, V3.Y, V3.Z);
        let text = new BABYLON_UI.TextBlock();
        text.text = Text;
        // text.textHorizontalAlignment = BABYLON_UI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.RoofUI.addControl(text);
        text.linkWithMesh(marker); // text follows invisible mesh
        text.color = "white"; // "Black";
        return [marker, text];
    }

    LabelMarker(V3: xyz_Class, Text: string = "Vertex") {
        return this.LabelMarkerXYZ(V3.x, V3.z, V3.y, Text);
    }

    CreateMarker(Name: string = "") {
        const Marker = BABYLON.MeshBuilder.CreateSphere(Name + "Marker", { diameter: 0.01 }, this.Scene);
        Marker.isVisible = false;
        Marker.isPickable = false;

        const Label = new BABYLON_UI.TextBlock(Name + "Label");
        Label.color = "white";
        Label.fontSize = 18;
        Label.outlineWidth = 4;
        Label.outlineColor = "black";
        this.RoofUI.addControl(Label);
        Label.linkWithMesh(Marker);
        return { Marker: Marker, Label: Label };
    }

    constructor(Engine: BABYLON.Engine, Scene: BABYLON.Scene, Camera: BABYLON.ArcRotateCamera, RoofUI: AdvancedDynamicTexture, window: Window) {
        this.Engine = Engine;
        this.Scene = Scene;
        this.Camera = Camera;
        this.RoofUI = RoofUI;
        console.log("WINDOWWWWWWWWWWWWWWWWWWWWWWW", window);
        // Editor.MapDebugging = new DebuggingClass();

        let DesignGrid = this.DesignGrid = BABYLON.Mesh.CreateGround("ground", 10000, 10000, 10, Scene);
        var gridMaterial = new GridMaterial("gridMaterial", Scene);
        gridMaterial.mainColor = BABYLON.Color4.FromInts(230, 230, 235, 255);
        gridMaterial.lineColor = BABYLON.Color4.FromInts(25, 25, 30);
        gridMaterial.opacity = .8;
        DesignGrid.material = gridMaterial
        // DesignGrid.isVisible = false;

        // this.Root = new BABYLON.TransformNode("ROOT", Scene);


        RoofUI.parseSerializedObject(TestingConfig); // await RoofUI.parseFromURLAsync("EditorUI.json");
        let EditorUI = RoofUI;

        const DrawingCursor = BABYLON.MeshBuilder.CreateSphere("DrawingCursor", { diameter: .5 }, Scene);
        DrawingCursor.isVisible = false;
        DrawingCursor.isPickable = false;


        const LiveXLineSettings: BABYLON_DashedLineOptions = { points: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 1e-10)], updatable: true };
        let LiveXLine = LiveXLineSettings.instance = BABYLON.MeshBuilder.CreateDashedLines("LiveXLine", LiveXLineSettings, Scene);
        LiveXLine.color = new BABYLON.Color3(0, 0, 1);



        const LiveYLineSettings: BABYLON_DashedLineOptions = { points: [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(0, 0, 1e-10)], updatable: true };
        let LiveYLine = LiveYLineSettings.instance = BABYLON.MeshBuilder.CreateDashedLines("LiveYLine", LiveYLineSettings, Scene);
        LiveYLine.color = new BABYLON.Color3(0, 0, 1);

        let UI_Controls: EditorControls = this.UI_Controls = {
            Rectangle1: EditorUI.getControlByName("Rectangle1") as BABYLON_UI.Rectangle,
            Rectangle2: EditorUI.getControlByName("Rectangle2") as BABYLON_UI.Rectangle,
            Rectangle3: EditorUI.getControlByName("Rectangle3") as BABYLON_UI.Rectangle,

            Line: EditorUI.getControlByName("Line") as BABYLON_UI.Line,
            Line0: EditorUI.getControlByName("Line0") as BABYLON_UI.Line,
            Line1: EditorUI.getControlByName("Line1") as BABYLON_UI.Line,
            Line2: EditorUI.getControlByName("Line2") as BABYLON_UI.Line,
            Line3: EditorUI.getControlByName("Line3") as BABYLON_UI.Line,

            Textblock0: EditorUI.getControlByName("Textblock0") as BABYLON_UI.TextBlock,
            Textblock1: EditorUI.getControlByName("Textblock1") as BABYLON_UI.TextBlock,
            Textblock2: EditorUI.getControlByName("Textblock2") as BABYLON_UI.TextBlock,
            Textblock3: EditorUI.getControlByName("Textblock3") as BABYLON_UI.TextBlock,

            Primary0: EditorUI.getControlByName("Primary0") as BABYLON_UI.Button,
            Primary1: EditorUI.getControlByName("Primary1") as BABYLON_UI.Button,
            Primary2: EditorUI.getControlByName("Primary2") as BABYLON_UI.Button,
            Primary3: EditorUI.getControlByName("Primary3") as BABYLON_UI.Button,

            // PrimaryText0 as BABYLON_UI.TextBlock,
            // PrimaryText1: null as BABYLON_UI.TextBlock,
            // PrimaryText2: null as BABYLON_UI.TextBlock,
            // PrimaryText3: null as BABYLON_UI.TextBlock,

            Line0A: EditorUI.getControlByName("Line0A") as BABYLON_UI.Line,
            Line0B: EditorUI.getControlByName("Line0B") as BABYLON_UI.Line,
            Line1A: EditorUI.getControlByName("Line1A") as BABYLON_UI.Line,
            Line1B: EditorUI.getControlByName("Line1B") as BABYLON_UI.Line,

            Checkbox0: EditorUI.getControlByName("Checkbox0") as BABYLON_UI.Checkbox,
            Checkbox1: EditorUI.getControlByName("Checkbox1") as BABYLON_UI.Checkbox,
            Checkbox2: EditorUI.getControlByName("Checkbox2") as BABYLON_UI.Checkbox,
            Checkbox3: EditorUI.getControlByName("Checkbox3") as BABYLON_UI.Checkbox,

            Rise0: EditorUI.getControlByName("Rise0") as BABYLON_UI.InputText,
            Rise1: EditorUI.getControlByName("Rise1") as BABYLON_UI.InputText,
            Rise2: EditorUI.getControlByName("Rise2") as BABYLON_UI.InputText,
            Rise3: EditorUI.getControlByName("Rise3") as BABYLON_UI.InputText,

            Run0: EditorUI.getControlByName("Run0") as BABYLON_UI.InputText,
            Run1: EditorUI.getControlByName("Run1") as BABYLON_UI.InputText,
            Run2: EditorUI.getControlByName("Run2") as BABYLON_UI.InputText,
            Run3: EditorUI.getControlByName("Run3") as BABYLON_UI.InputText,

            Pitch0: EditorUI.getControlByName("Pitch0") as BABYLON_UI.InputText,
            Pitch1: EditorUI.getControlByName("Pitch1") as BABYLON_UI.InputText,
            Pitch2: EditorUI.getControlByName("Pitch2") as BABYLON_UI.InputText,
            Pitch3: EditorUI.getControlByName("Pitch3") as BABYLON_UI.InputText,

            PrimaryVert: EditorUI.getControlByName("PrimaryVert") as BABYLON_UI.Button,
            LineLength: EditorUI.getControlByName("LineLength") as BABYLON_UI.InputText,
            Info1: EditorUI.getControlByName("Info1") as BABYLON_UI.InputText,
            Info2: EditorUI.getControlByName("Info2") as BABYLON_UI.InputText,

            LiveDistanceData: this.CreateMarker("LiveDistance"),
            LiveXData: this.CreateMarker("LiveX"),
            LiveYData: this.CreateMarker("LiveY"),

            LiveXLineSettings: LiveXLineSettings,
            LiveXLine: LiveXLine,

            LiveYLineSettings: LiveYLineSettings,
            LiveYLine: LiveYLine,
        }

        let PrimaryText0 = UI_Controls.PrimaryText0 = UI_Controls.Primary0.children[0] as BABYLON_UI.TextBlock;
        let PrimaryText1 = UI_Controls.PrimaryText1 = UI_Controls.Primary1.children[0] as BABYLON_UI.TextBlock;
        let PrimaryText2 = UI_Controls.PrimaryText2 = UI_Controls.Primary2.children[0] as BABYLON_UI.TextBlock;
        let PrimaryText3 = UI_Controls.PrimaryText3 = UI_Controls.Primary3.children[0] as BABYLON_UI.TextBlock;

        // Camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        Camera.minZ = 0.1;
        Camera.maxZ = 100000;

        // let FlatMapElement = window.document.getElementById("flatmap");

        // let mapContainer = window.document.createElement("div");
        // // overlayMeshDiv.innerHTML = `<p style="padding: 60px; font-size: 80px;">This is an overlay. It is positioned in front of the canvas. This allows it to have transparency and to be non-rectangular, but it will always show over any other content in the scene</p>`;
        // mapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        // mapContainer.style.width = '100%';
        // mapContainer.style.height = '100%';
        // mapContainer.style.border = 'none';
        // mapContainer.style.overflow = 'hidden';
        // mapContainer.style.pointerEvents = "none";
        // // mapContainer.style.zIndex = -1;
        // // mapContainer.style.

        // let mapDiv = window.document.createElement("div");
        // mapDiv.style.position = "absolute";
        // mapDiv.style.inset = "0";
        // mapDiv.style.width = "100%";
        // mapDiv.style.height = "100%";

        // mapContainer.appendChild(mapDiv);

        let RenderWidth = Engine.getRenderWidth();
        let RenderHeight = Engine.getRenderHeight();

        const updateOrtho = () => {
            RenderWidth = Engine.getRenderWidth();
            RenderHeight = Engine.getRenderHeight();
            const ratio = RenderWidth / RenderHeight;
            const zoom = Camera.radius / SketchLine.DrawingScale; // use radius as scale

            Camera.orthoLeft = -zoom * ratio;
            Camera.orthoRight = zoom * ratio;
            Camera.orthoBottom = -zoom;
            Camera.orthoTop = zoom;


            // console.log(zoom, 1500 / zoom)
            // let Scale = 1 / Camera.radius * SketchLine.DrawingScale / ratio * 1450; // zoom; // * .9366666; // 25; // * .9;
            // Editor.MapDebugging.FlatMapElement.style.scale = Scale.toString();
            // // console.log(Camera.orthoTop, Scale);
            // // May still not be perfect, but honestly, idrk anymore.
            // Editor.MapDebugging.FlatMapElement.style.left = -(Editor.MapDebugging.FlatMapElement.clientWidth - RenderWidth) / 2 + "px";
            // Editor.MapDebugging.FlatMapElement.style.top = -(Editor.MapDebugging.FlatMapElement.clientHeight - RenderHeight) / 2 + "px";
        };

        // Scene.onBeforeRenderObservable.add(() => {
        //     Editor.MapDebugging.FlatMapElement.style.rotate = Camera.alpha + "rad";
        //     // FlatMapElement.style.transform // Need to look into using skew.
        //     // console.log(Camera.alpha);

        //     let Scale = 1500 / Camera.radius * .921 * .8;

        //     let CheapCF = CFrame.Angles(0, -Camera.alpha, 0).ToWorldSpace(CFrame.fromXYZ(-Camera.target.z * Scale, 0, -Camera.target.x * Scale));
        //     Editor.MapDebugging.FlatMapElement.style.translate = `${CheapCF.x}px ${CheapCF.z}px`;
        //     if (!FirstRotation) DesignGrid.rotation.y = -Camera.alpha;
        // });

        // console.log(Camera);

        updateOrtho();

        Camera.onViewMatrixChangedObservable.add(updateOrtho);

        window.addEventListener("resize", () => {
            // Engine.resize();
            updateOrtho();
        });

        // console.log(BABYLON.PointerEventTypes.POINTERDOWN);
        // console.log(BABYLON.PointerEventTypes.POINTERMOVE);
        // console.log(BABYLON.PointerEventTypes.POINTERUP);

        let HoldingShift = false;
        let ChangingPitch = false;
        let CanDraw = true;
        let FirstRotation = false;

        Scene.onPointerObservable.add((pi) => {
            // if (this.RoofUI.isForegroundPicked) return; // Prevent drawing when interacting with GUI
            // pi.pickInfo?

            const p = this.pickOnGround(Scene.pointerX, Scene.pointerY);
            if (!p) return;
            DrawingCursor.position.x = Math.round(p.x);
            DrawingCursor.position.y = Math.round(p.y);
            DrawingCursor.position.z = Math.round(p.z);
            // DesignGrid.rotationQuaternion.copyFrom(BABYLON.Quaternion.FromEulerAngles(0, Camera.rotation.y, 0));
            // DesignGrid.rotate(BABYLON.Vector3.Up, Camera.rotation.y, BABYLON.Space.WORLD);
            if (pi.type === BABYLON.PointerEventTypes.POINTERDOWN && CanDraw) {
                if (pi.event.button !== 0) return;
                if (SketchLine.ActiveSketch) {
                    if (SketchLine.ActiveSketch.Commit()) {
                        console.log("COMMIT");
                        SketchLine.ActiveSketch = null;
                        // DesignGrid.position.y -= 20;
                        return;
                    }
                    console.log("EXTRUDE");
                    // DesignGrid.rotation.y = -Camera.alpha;
                    FirstRotation = true;
                } else {
                    // SketchLine.ActiveSketch = new SketchLine(Math.round(p.x), Math.round(p.z), Math.round(p.y));
                    if (!FirstRotation) {
                        DesignGrid.position.x = p.x;
                        DesignGrid.position.z = p.z;
                    };
                    SketchLine.ActiveSketch = new SketchLine(this, p.x, Math.round(p.y), p.z);
                    SketchLine.ActiveSketch.Start();
                }
            }

            if (pi.type === BABYLON.PointerEventTypes.POINTERMOVE && SketchLine.ActiveSketch) {
                SketchLine.ActiveSketch.SnapAngle = -DesignGrid.rotation.y; // Camera.alpha;
                SketchLine.ActiveSketch.Update(p.x, p.z, HoldingShift);
            }

            if (ChangingPitch && pi.type === BABYLON.PointerEventTypes.POINTERWHEEL && SketchLine.ActiveSketch) {
                // console.log(pi);
                // console.log(pi.event.wheelDelta);
                let IncrementValue = (HoldingShift ? .5 : 1) * (pi.event.wheelDelta / 120);
                SketchLine.ActiveSketch.DrawLine.PITCH = Math.max(0, SketchLine.ActiveSketch.DrawLine.PITCH + IncrementValue);
                SketchLine.ActiveSketch.UpdateWithPointer(HoldingShift);
            }
        });

        Camera.lowerBetaLimit = 0; // -Math.PI / 2;
        Camera.upperBetaLimit = Math.PI / 2;

        var PanelViewCollapsed = true;































        function indexToXZ(index, width) {
            const x = index % width;
            const z = Math.floor(index / width);
            return { x, z };
        }

        function xzToIndex(x, z, width) {
            return z * width + x;
        }

        function inBounds(x, z, width, height) {
            return x >= 0 && x < width && z >= 0 && z < height;
        }

        function getHeight(heightArray, x, z, width, height, edgeMode = "clamp") {
            if (inBounds(x, z, width, height)) {
                return heightArray[xzToIndex(x, z, width)];
            }

            if (edgeMode === "clamp") {
                const cx = Math.max(0, Math.min(width - 1, x));
                const cz = Math.max(0, Math.min(height - 1, z));
                return heightArray[xzToIndex(cx, cz, width)];
            }

            return null;
        }

        function getSobelGradientAtIndex(
            index,
            heightArray,
            width,
            height,
            cellSizeX = 1,
            cellSizeZ = 1,
            edgeMode = "clamp"
        ) {
            const { x, z } = indexToXZ(index, width);

            const h00 = getHeight(heightArray, x - 1, z - 1, width, height, edgeMode);
            const h10 = getHeight(heightArray, x, z - 1, width, height, edgeMode);
            const h20 = getHeight(heightArray, x + 1, z - 1, width, height, edgeMode);

            const h01 = getHeight(heightArray, x - 1, z, width, height, edgeMode);
            const h11 = getHeight(heightArray, x, z, width, height, edgeMode);
            const h21 = getHeight(heightArray, x + 1, z, width, height, edgeMode);

            const h02 = getHeight(heightArray, x - 1, z + 1, width, height, edgeMode);
            const h12 = getHeight(heightArray, x, z + 1, width, height, edgeMode);
            const h22 = getHeight(heightArray, x + 1, z + 1, width, height, edgeMode);

            if (
                h00 === null || h10 === null || h20 === null ||
                h01 === null || h11 === null || h21 === null ||
                h02 === null || h12 === null || h22 === null
            ) {
                return null;
            }

            // Sobel kernels:
            // Gx = [ [-1, 0, 1], [-2, 0, 2], [-1, 0, 1] ]
            // Gz = [ [-1,-2,-1], [ 0, 0, 0], [ 1, 2, 1] ]

            const gx =
                (-1 * h00) + (0 * h10) + (1 * h20) +
                (-2 * h01) + (0 * h11) + (2 * h21) +
                (-1 * h02) + (0 * h12) + (1 * h22);

            const gz =
                (-1 * h00) + (-2 * h10) + (-1 * h20) +
                (0 * h01) + (0 * h11) + (0 * h21) +
                (1 * h02) + (2 * h12) + (1 * h22);

            // Normalize to derivative-like values.
            // Standard Sobel span is effectively 8 samples across.
            const dYdX = gx / (8 * cellSizeX);
            const dYdZ = gz / (8 * cellSizeZ);

            const slope = Math.hypot(dYdX, dYdZ);

            let nx = -dYdX;
            let ny = 1;
            let nz = -dYdZ;

            const len = Math.hypot(nx, ny, nz);
            if (len !== 0) {
                nx /= len;
                ny /= len;
                nz /= len;
            }

            return {
                index,
                x,
                z,
                height: h11,
                dYdX,
                dYdZ,
                slope,
                normal: { x: nx, y: ny, z: nz },
                heights: [
                    h00, h10, h20,
                    h01, h11, h12,
                    h02, h21, h22,
                ]
            };
        }

        function getSobel5x5GradientAtIndex(
            index,
            heightArray,
            width,
            height,
            cellSizeX = 1,
            cellSizeZ = 1,
            edgeMode = "clamp"
        ) {
            const { x, z } = indexToXZ(index, width);

            // function H(dx, dz) {
            //     return getHeight(heightArray, x + dx, z + dz, width, height, edgeMode);
            // }

            // 5x5 grid
            const h = [];
            for (let dz = -2; dz <= 2; dz++) {
                for (let dx = -2; dx <= 2; dx++) {
                    // h.push(H(dx, dz));
                    h.push(getHeight(heightArray, x + dx, z + dz, width, height, edgeMode));
                }
            }

            if (h.includes(null)) return null;

            const [
                h00, h10, h20, h30, h40,
                h01, h11, h21, h31, h41,
                h02, h12, h22, h32, h42,
                h03, h13, h23, h33, h43,
                h04, h14, h24, h34, h44
            ]: number[] = h;

            const gx =
                (-1 * h00) + (-2 * h10) + (0 * h20) + (2 * h30) + (1 * h40) +
                (-4 * h01) + (-8 * h11) + (0 * h21) + (8 * h31) + (4 * h41) +
                (-6 * h02) + (-12 * h12) + (0 * h22) + (12 * h32) + (6 * h42) +
                (-4 * h03) + (-8 * h13) + (0 * h23) + (8 * h33) + (4 * h43) +
                (-1 * h04) + (-2 * h14) + (0 * h24) + (2 * h34) + (1 * h44);

            const gz =
                (-1 * h00) + (-4 * h10) + (-6 * h20) + (-4 * h30) + (-1 * h40) +
                (-2 * h01) + (-8 * h11) + (-12 * h21) + (-8 * h31) + (-2 * h41) +
                (0 * h02) + (0 * h12) + (0 * h22) + (0 * h32) + (0 * h42) +
                (2 * h03) + (8 * h13) + (12 * h23) + (8 * h33) + (2 * h43) +
                (1 * h04) + (4 * h14) + (6 * h24) + (4 * h34) + (1 * h44);

            // Normalize (scale factor ~48 for this kernel)
            const dYdX = gx / (48 * cellSizeX);
            const dYdZ = gz / (48 * cellSizeZ);

            const slope = Math.hypot(dYdX, dYdZ);

            let nx = -dYdX;
            let ny = 1;
            let nz = -dYdZ;

            const len = Math.hypot(nx, ny, nz);
            if (len !== 0) {
                nx /= len;
                ny /= len;
                nz /= len;
            }

            return {
                index,
                x,
                z,
                height: h22,
                dYdX,
                dYdZ,
                slope,
                normal: { x: nx, y: ny, z: nz },
                heights: h
            };
        }

        function getSobelGradients(heightArray, width, height, cellSizeX = 1, cellSizeZ = 1, edgeMode = "clamp") {
            const results = new Array(heightArray.length);

            for (let i = 0; i < heightArray.length; i++) {
                results[i] = getSobelGradientAtIndex(
                    i,
                    heightArray,
                    width,
                    height,
                    cellSizeX,
                    cellSizeZ,
                    edgeMode
                );
            }

            return results;
        }






















        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function dot3(a, b) {
            return a.x * b.x + a.y * b.y + a.z * b.z;
        }

        function angleBetweenNormals(a, b) {
            const d = clamp(dot3(a, b), -1, 1);
            return Math.acos(d); // radians
        }

        function slopeToAngleDegrees(slope) {
            return Math.atan(slope) * 180 / Math.PI;
        }

        function analyzeLocalSlopeChaos3x3(
            sobelData,
            width,
            height,
            options = {}
        ) {
            const settings = {
                maxAverageNormalDifferenceDegrees: options.maxAverageNormalDifferenceDegrees ?? 8,
                maxAverageSlopeAngleDifferenceDegrees: options.maxAverageSlopeAngleDifferenceDegrees ?? 6,
                maxSlopeStdDev: options.maxSlopeStdDev ?? 0.15,
                requireCenter: options.requireCenter ?? true
            };

            const results = new Array(sobelData.length);

            for (let index = 0; index < sobelData.length; index++) {
                const center = sobelData[index];
                const { x, z } = indexToXZ(index, width);

                if (settings.requireCenter && (!center || !center.normal)) {
                    results[index] = null;
                    continue;
                }

                const neighbors = [];
                const normalDiffsDeg = [];
                const slopeAngleDiffsDeg = [];
                const slopeValues = [];

                for (let dz = -1; dz <= 1; dz++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const nz = z + dz;

                        if (!inBounds(nx, nz, width, height)) continue;

                        const ni = xzToIndex(nx, nz, width);
                        const item = sobelData[ni];

                        if (!item || !item.normal) continue;

                        neighbors.push(item);
                        slopeValues.push(item.slope);

                        if (center && center.normal && !(dx === 0 && dz === 0)) {
                            const normalDiffDeg =
                                angleBetweenNormals(center.normal, item.normal) * 180 / Math.PI;
                            normalDiffsDeg.push(normalDiffDeg);

                            const centerSlopeAngle = slopeToAngleDegrees(center.slope);
                            const neighborSlopeAngle = slopeToAngleDegrees(item.slope);
                            slopeAngleDiffsDeg.push(Math.abs(centerSlopeAngle - neighborSlopeAngle));
                        }
                    }
                }

                if (neighbors.length === 0) {
                    results[index] = null;
                    continue;
                }

                const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

                const averageNormalDifferenceDegrees = avg(normalDiffsDeg);
                const averageSlopeAngleDifferenceDegrees = avg(slopeAngleDiffsDeg);

                const averageSlope = avg(slopeValues);

                let slopeVariance = 0;
                for (const s of slopeValues) {
                    const d = s - averageSlope;
                    slopeVariance += d * d;
                }
                slopeVariance /= slopeValues.length;
                const slopeStdDev = Math.sqrt(slopeVariance);

                const chaotic =
                    averageNormalDifferenceDegrees > settings.maxAverageNormalDifferenceDegrees ||
                    averageSlopeAngleDifferenceDegrees > settings.maxAverageSlopeAngleDifferenceDegrees ||
                    slopeStdDev > settings.maxSlopeStdDev;

                results[index] = {
                    index,
                    x,
                    z,
                    averageSlope,
                    slopeStdDev,
                    averageNormalDifferenceDegrees,
                    averageSlopeAngleDifferenceDegrees,
                    neighborCount: neighbors.length,
                    chaotic
                };
            }

            return results;
        }




































        function segmentByNeighborPredicate5x5(data, width, height, shouldConnect, options = {}) {
            const minGroupSize = options.minGroupSize ?? 1;
            const maxGroupSize = options.maxGroupSize ?? Infinity;

            // radius=2 => 5x5 neighborhood
            const radius = options.radius ?? 2;

            // If true, use a circular neighborhood instead of full 5x5 square.
            // radius=2 circular gives 12 neighbors instead of 24, which can reduce leakage.
            const circular = options.circular ?? false;

            const size = data.length;

            const labels = new Int32Array(size);
            labels.fill(-1);

            const assigned = new Uint8Array(size);
            const queued = new Uint32Array(size);

            const stackIndex = new Int32Array(size);
            const stackX = new Int32Array(size);
            const stackZ = new Int32Array(size);

            const groupBuffer = new Int32Array(size);
            const allGroupIndices = new Int32Array(size);

            const groupLabels = new Int32Array(size);
            const groupStarts = new Int32Array(size);
            const groupLengths = new Int32Array(size);

            // Precompute neighbor offsets once
            const offsetsDX = [];
            const offsetsDZ = [];
            const offsetsIndexDelta = [];

            for (let dz = -radius; dz <= radius; dz++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx === 0 && dz === 0) continue;
                    if (circular && (dx * dx + dz * dz > radius * radius)) continue;

                    offsetsDX.push(dx);
                    offsetsDZ.push(dz);
                    offsetsIndexDelta.push(dz * width + dx);
                }
            }

            const neighborCount = offsetsDX.length;

            let allGroupIndicesCount = 0;
            let groupCount = 0;
            let nextLabel = 0;
            let queueStamp = 1;

            for (let startIndex = 0, startZ = 0, startX = 0; startIndex < size; startIndex++) {
                if (assigned[startIndex] || !data[startIndex]) {
                    startX++;
                    if (startX === width) {
                        startX = 0;
                        startZ++;
                    }
                    continue;
                }

                assigned[startIndex] = 1;

                if (!shouldConnect(startIndex, startIndex, groupBuffer, 0, labels, -1, startIndex)) {
                    startX++;
                    if (startX === width) {
                        startX = 0;
                        startZ++;
                    }
                    continue;
                }

                let stackSize = 0;
                let groupSize = 0;

                stackIndex[stackSize] = startIndex;
                stackX[stackSize] = startX;
                stackZ[stackSize] = startZ;
                stackSize++;

                queued[startIndex] = queueStamp;
                labels[startIndex] = nextLabel;

                while (stackSize > 0) {
                    stackSize--;

                    const current = stackIndex[stackSize];
                    const x = stackX[stackSize];
                    const z = stackZ[stackSize];

                    groupBuffer[groupSize++] = current;

                    const isInterior =
                        x >= radius &&
                        z >= radius &&
                        x < width - radius &&
                        z < height - radius;

                    if (isInterior) {
                        // Fast path: no bounds checks
                        for (let k = 0; k < neighborCount; k++) {
                            const ni = current + offsetsIndexDelta[k];

                            if (
                                !assigned[ni] &&
                                queued[ni] !== queueStamp &&
                                shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
                            ) {
                                queued[ni] = queueStamp;
                                labels[ni] = nextLabel;
                                assigned[ni] = 1;

                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x + offsetsDX[k];
                                stackZ[stackSize] = z + offsetsDZ[k];
                                stackSize++;
                            }
                        }
                    } else {
                        // Safe path: bounds checks
                        for (let k = 0; k < neighborCount; k++) {
                            const nx = x + offsetsDX[k];
                            const nz = z + offsetsDZ[k];

                            if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;

                            const ni = nz * width + nx;

                            if (
                                !assigned[ni] &&
                                queued[ni] !== queueStamp &&
                                shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
                            ) {
                                queued[ni] = queueStamp;
                                labels[ni] = nextLabel;
                                assigned[ni] = 1;

                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = nx;
                                stackZ[stackSize] = nz;
                                stackSize++;
                            }
                        }
                    }
                }

                if (groupSize < minGroupSize || groupSize > maxGroupSize) {
                    for (let i = 0; i < groupSize; i++) {
                        const index = groupBuffer[i];
                        labels[index] = -1;
                        assigned[index] = 0;
                    }
                    queueStamp++;

                    startX++;
                    if (startX === width) {
                        startX = 0;
                        startZ++;
                    }
                    continue;
                }

                const groupStart = allGroupIndicesCount;
                for (let i = 0; i < groupSize; i++) {
                    allGroupIndices[allGroupIndicesCount++] = groupBuffer[i];
                }

                groupLabels[groupCount] = nextLabel;
                groupStarts[groupCount] = groupStart;
                groupLengths[groupCount] = groupSize;
                groupCount++;

                nextLabel++;
                queueStamp++;

                startX++;
                if (startX === width) {
                    startX = 0;
                    startZ++;
                }
            }

            return {
                labels,
                groupCount,
                groupLabels: groupLabels.subarray(0, groupCount),
                groupStarts: groupStarts.subarray(0, groupCount),
                groupLengths: groupLengths.subarray(0, groupCount),
                allGroupIndices: allGroupIndices.subarray(0, allGroupIndicesCount)
            };
        }

        function segmentByNeighborPredicate(data, width, height, shouldConnect, options = {}) {
            const minGroupSize = options.minGroupSize ?? 1;
            const maxGroupSize = options.maxGroupSize ?? Infinity;

            const size = data.length;

            const labels = new Int32Array(size);
            labels.fill(-1);

            const assigned = new Uint8Array(size);
            const queued = new Uint32Array(size);

            const stackIndex = new Int32Array(size);
            const stackX = new Int32Array(size);
            const stackZ = new Int32Array(size);

            const groupBuffer = new Int32Array(size);
            const allGroupIndices = new Int32Array(size);

            const groupLabels = new Int32Array(size);
            const groupStarts = new Int32Array(size);
            const groupLengths = new Int32Array(size);

            let allGroupIndicesCount = 0;
            let groupCount = 0;
            let nextLabel = 0;
            let queueStamp = 1;

            for (let startIndex = 0, startZ = 0, startX = 0; startIndex < size; startIndex++) {
                if (assigned[startIndex] || !data[startIndex]) {
                    startX++;
                    if (startX === width) {
                        startX = 0;
                        startZ++;
                    }
                    continue;
                }

                assigned[startIndex] = 1;

                if (!shouldConnect(startIndex, startIndex, groupBuffer, 0, labels, -1, startIndex)) {
                    startX++;
                    if (startX === width) {
                        startX = 0;
                        startZ++;
                    }
                    continue;
                }

                let stackSize = 0;
                let groupSize = 0;

                stackIndex[stackSize] = startIndex;
                stackX[stackSize] = startX;
                stackZ[stackSize] = startZ;
                stackSize++;

                queued[startIndex] = queueStamp;
                labels[startIndex] = nextLabel;

                while (stackSize > 0) {
                    stackSize--;

                    const current = stackIndex[stackSize];
                    const x = stackX[stackSize];
                    const z = stackZ[stackSize];

                    groupBuffer[groupSize++] = current;

                    let ni;

                    if (z > 0) {
                        const up = current - width;

                        if (x > 0) {
                            ni = up - 1;
                            if (!assigned[ni] && queued[ni] !== queueStamp &&
                                shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
                                queued[ni] = queueStamp;
                                labels[ni] = nextLabel;
                                assigned[ni] = 1;
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x - 1;
                                stackZ[stackSize] = z - 1;
                                stackSize++;
                            }
                        }

                        ni = up;
                        if (!assigned[ni] && queued[ni] !== queueStamp &&
                            shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
                            queued[ni] = queueStamp;
                            labels[ni] = nextLabel;
                            assigned[ni] = 1;
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x;
                            stackZ[stackSize] = z - 1;
                            stackSize++;
                        }

                        if (x < width - 1) {
                            ni = up + 1;
                            if (!assigned[ni] && queued[ni] !== queueStamp &&
                                shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
                                queued[ni] = queueStamp;
                                labels[ni] = nextLabel;
                                assigned[ni] = 1;
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x + 1;
                                stackZ[stackSize] = z - 1;
                                stackSize++;
                            }
                        }
                    }

                    if (x > 0) {
                        ni = current - 1;
                        if (!assigned[ni] && queued[ni] !== queueStamp &&
                            shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
                            queued[ni] = queueStamp;
                            labels[ni] = nextLabel;
                            assigned[ni] = 1;
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x - 1;
                            stackZ[stackSize] = z;
                            stackSize++;
                        }
                    }

                    if (x < width - 1) {
                        ni = current + 1;
                        if (!assigned[ni] && queued[ni] !== queueStamp &&
                            shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
                            queued[ni] = queueStamp;
                            labels[ni] = nextLabel;
                            assigned[ni] = 1;
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x + 1;
                            stackZ[stackSize] = z;
                            stackSize++;
                        }
                    }

                    if (z < height - 1) {
                        const down = current + width;

                        if (x > 0) {
                            ni = down - 1;
                            if (!assigned[ni] && queued[ni] !== queueStamp &&
                                shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
                                queued[ni] = queueStamp;
                                labels[ni] = nextLabel;
                                assigned[ni] = 1;
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x - 1;
                                stackZ[stackSize] = z + 1;
                                stackSize++;
                            }
                        }

                        ni = down;
                        if (!assigned[ni] && queued[ni] !== queueStamp &&
                            shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
                            queued[ni] = queueStamp;
                            labels[ni] = nextLabel;
                            assigned[ni] = 1;
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x;
                            stackZ[stackSize] = z + 1;
                            stackSize++;
                        }

                        if (x < width - 1) {
                            ni = down + 1;
                            if (!assigned[ni] && queued[ni] !== queueStamp &&
                                shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
                                queued[ni] = queueStamp;
                                labels[ni] = nextLabel;
                                assigned[ni] = 1;
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x + 1;
                                stackZ[stackSize] = z + 1;
                                stackSize++;
                            }
                        }
                    }
                }

                if (groupSize < minGroupSize || groupSize > maxGroupSize) {
                    for (let i = 0; i < groupSize; i++) {
                        const index = groupBuffer[i];
                        labels[index] = -1;
                        assigned[index] = 0;
                    }
                    queueStamp++;

                    startX++;
                    if (startX === width) {
                        startX = 0;
                        startZ++;
                    }
                    continue;
                }

                const groupStart = allGroupIndicesCount;
                for (let i = 0; i < groupSize; i++) {
                    allGroupIndices[allGroupIndicesCount++] = groupBuffer[i];
                }

                groupLabels[groupCount] = nextLabel;
                groupStarts[groupCount] = groupStart;
                groupLengths[groupCount] = groupSize;
                groupCount++;

                nextLabel++;
                queueStamp++;

                startX++;
                if (startX === width) {
                    startX = 0;
                    startZ++;
                }
            }

            return {
                labels,
                groupCount,
                groupLabels: groupLabels.subarray(0, groupCount),
                groupStarts: groupStarts.subarray(0, groupCount),
                groupLengths: groupLengths.subarray(0, groupCount),
                allGroupIndices: allGroupIndices.subarray(0, allGroupIndicesCount)
            };
        }

        function segmentRoofPlanesByFitWithAzimuth(heightData, mask, width, height, options = {}) {
            const size = width * height;

            const minGroupSize = options.minGroupSize ?? 8;
            const maxGroupSize = options.maxGroupSize ?? Infinity;

            const minValidHeight = options.minValidHeight ?? -Infinity;
            const maxValidHeight = options.maxValidHeight ?? Infinity;

            const maxNeighborHeightDiff = options.maxNeighborHeightDiff ?? 250; // mm
            const maxSeedHeightDiff = options.maxSeedHeightDiff ?? Infinity;

            const minFitPoints = options.minFitPoints ?? 6;
            const maxPlaneResidual = options.maxPlaneResidual ?? 120; // mm

            const useAzimuthConstraint = options.useAzimuthConstraint ?? true;
            const minAzimuthPoints = options.minAzimuthPoints ?? 10;
            const maxAzimuthDiffDeg = options.maxAzimuthDiffDeg ?? 15;

            const labels = new Int32Array(size);
            labels.fill(-1);

            const assigned = new Uint8Array(size);
            const queued = new Uint32Array(size);

            const stackIndex = new Int32Array(size);
            const stackX = new Int32Array(size);
            const stackZ = new Int32Array(size);

            const groupBuffer = new Int32Array(size);
            const allGroupIndices = new Int32Array(size);

            const groupLabels = new Int32Array(size);
            const groupStarts = new Int32Array(size);
            const groupLengths = new Int32Array(size);
            const groupAzimuths = new Float32Array(size);

            let allGroupIndicesCount = 0;
            let groupCount = 0;
            let nextLabel = 0;
            let queueStamp = 1;

            for (let startIndex = 0, startX = 0, startZ = 0; startIndex < size; startIndex++) {
                const seedHeight = heightData[startIndex];

                if (
                    assigned[startIndex] ||
                    (mask && !mask[startIndex]) ||
                    !Number.isFinite(seedHeight) ||
                    seedHeight < minValidHeight ||
                    seedHeight > maxValidHeight
                ) {
                    startX++;
                    if (startX === width) {
                        startX = 0;
                        startZ++;
                    }
                    continue;
                }

                assigned[startIndex] = 1;

                let stackSize = 0;
                let groupSize = 0;

                let n = 0;
                let sumX = 0, sumZ = 0, sumY = 0;
                let sumXX = 0, sumZZ = 0, sumXZ = 0;
                let sumXY = 0, sumZY = 0;

                let planeA = 0;
                let planeB = 0;
                let planeC = seedHeight;
                let planeValid = false;

                let groupAzimuthDeg = 0;
                let azimuthValid = false;


                function tryAddNeighbor(ni, nx, nz, currentHeight, seedHeight) {
                    if (assigned[ni] || queued[ni] === queueStamp) return false;
                    if (mask && !mask[ni]) return false;

                    const h = heightData[ni];
                    if (!Number.isFinite(h) || h < minValidHeight || h > maxValidHeight) return false;

                    if (Math.abs(h - currentHeight) > maxNeighborHeightDiff) return false;
                    if (maxSeedHeightDiff !== Infinity && Math.abs(h - seedHeight) > maxSeedHeightDiff) return false;

                    if (planeValid) {
                        const predicted = planeA * nx + planeB * nz + planeC;
                        if (Math.abs(h - predicted) > maxPlaneResidual) return false;
                    }

                    if (useAzimuthConstraint && planeValid && azimuthValid) {
                        const predictedY = planeA * nx + planeB * nz + planeC;

                        // approximate updated sums with this candidate included
                        const n2 = n + 1;
                        const sumX2 = sumX + nx;
                        const sumZ2 = sumZ + nz;
                        const sumY2 = sumY + h;
                        const sumXX2 = sumXX + nx * nx;
                        const sumZZ2 = sumZZ + nz * nz;
                        const sumXZ2 = sumXZ + nx * nz;
                        const sumXY2 = sumXY + nx * h;
                        const sumZY2 = sumZY + nz * h;

                        const solved2 = solvePlaneFromSums(n2, sumX2, sumZ2, sumY2, sumXX2, sumZZ2, sumXZ2, sumXY2, sumZY2);
                        if (solved2) {
                            const candidateAzimuth = vectorToAzimuthDeg(-solved2.a, -solved2.b);
                            if (azimuthDifferenceDeg(candidateAzimuth, groupAzimuthDeg) > maxAzimuthDiffDeg) {
                                return false;
                            }
                        } else {
                            // fallback to current plane residual only
                            if (Math.abs(h - predictedY) > maxPlaneResidual) return false;
                        }
                    }

                    queued[ni] = queueStamp;
                    labels[ni] = nextLabel;
                    assigned[ni] = 1;
                    return true;
                }

                stackIndex[stackSize] = startIndex;
                stackX[stackSize] = startX;
                stackZ[stackSize] = startZ;
                stackSize++;

                queued[startIndex] = queueStamp;
                labels[startIndex] = nextLabel;

                while (stackSize > 0) {
                    stackSize--;

                    const current = stackIndex[stackSize];
                    const x = stackX[stackSize];
                    const z = stackZ[stackSize];
                    const y = heightData[current];

                    groupBuffer[groupSize++] = current;

                    n++;
                    sumX += x;
                    sumZ += z;
                    sumY += y;
                    sumXX += x * x;
                    sumZZ += z * z;
                    sumXZ += x * z;
                    sumXY += x * y;
                    sumZY += z * y;

                    if (n >= minFitPoints) {
                        const solved = solvePlaneFromSums(n, sumX, sumZ, sumY, sumXX, sumZZ, sumXZ, sumXY, sumZY);
                        if (solved) {
                            planeA = solved.a;
                            planeB = solved.b;
                            planeC = solved.c;
                            planeValid = true;

                            if (useAzimuthConstraint && n >= minAzimuthPoints) {
                                groupAzimuthDeg = vectorToAzimuthDeg(-planeA, -planeB); // downslope
                                azimuthValid = true;
                            }
                        }
                    }

                    let ni;

                    if (z > 0) {
                        const up = current - width;

                        if (x > 0) {
                            ni = up - 1;
                            if (tryAddNeighbor(ni, x - 1, z - 1, y, seedHeight)) {
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x - 1;
                                stackZ[stackSize] = z - 1;
                                stackSize++;
                            }
                        }

                        ni = up;
                        if (tryAddNeighbor(ni, x, z - 1, y, seedHeight)) {
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x;
                            stackZ[stackSize] = z - 1;
                            stackSize++;
                        }

                        if (x < width - 1) {
                            ni = up + 1;
                            if (tryAddNeighbor(ni, x + 1, z - 1, y, seedHeight)) {
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x + 1;
                                stackZ[stackSize] = z - 1;
                                stackSize++;
                            }
                        }
                    }

                    if (x > 0) {
                        ni = current - 1;
                        if (tryAddNeighbor(ni, x - 1, z, y, seedHeight)) {
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x - 1;
                            stackZ[stackSize] = z;
                            stackSize++;
                        }
                    }

                    if (x < width - 1) {
                        ni = current + 1;
                        if (tryAddNeighbor(ni, x + 1, z, y, seedHeight)) {
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x + 1;
                            stackZ[stackSize] = z;
                            stackSize++;
                        }
                    }

                    if (z < height - 1) {
                        const down = current + width;

                        if (x > 0) {
                            ni = down - 1;
                            if (tryAddNeighbor(ni, x - 1, z + 1, y, seedHeight)) {
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x - 1;
                                stackZ[stackSize] = z + 1;
                                stackSize++;
                            }
                        }

                        ni = down;
                        if (tryAddNeighbor(ni, x, z + 1, y, seedHeight)) {
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x;
                            stackZ[stackSize] = z + 1;
                            stackSize++;
                        }

                        if (x < width - 1) {
                            ni = down + 1;
                            if (tryAddNeighbor(ni, x + 1, z + 1, y, seedHeight)) {
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x + 1;
                                stackZ[stackSize] = z + 1;
                                stackSize++;
                            }
                        }
                    }
                }

                if (groupSize < minGroupSize || groupSize > maxGroupSize) {
                    for (let i = 0; i < groupSize; i++) {
                        const index = groupBuffer[i];
                        labels[index] = -1;
                        assigned[index] = 0;
                    }

                    queueStamp++;
                    startX++;
                    if (startX === width) {
                        startX = 0;
                        startZ++;
                    }
                    continue;
                }

                const groupStart = allGroupIndicesCount;
                for (let i = 0; i < groupSize; i++) {
                    allGroupIndices[allGroupIndicesCount++] = groupBuffer[i];
                }

                groupLabels[groupCount] = nextLabel;
                groupStarts[groupCount] = groupStart;
                groupLengths[groupCount] = groupSize;
                groupAzimuths[groupCount] = azimuthValid ? groupAzimuthDeg : NaN;
                groupCount++;

                nextLabel++;
                queueStamp++;

                startX++;
                if (startX === width) {
                    startX = 0;
                    startZ++;
                }
            }

            return {
                labels,
                groupCount,
                groupLabels: groupLabels.subarray(0, groupCount),
                groupStarts: groupStarts.subarray(0, groupCount),
                groupLengths: groupLengths.subarray(0, groupCount),
                groupAzimuths: groupAzimuths.subarray(0, groupCount),
                allGroupIndices: allGroupIndices.subarray(0, allGroupIndicesCount)
            };

        }

        function azimuthDifferenceDeg(a, b) {
            let d = Math.abs(a - b) % 360;
            if (d > 180) d = 360 - d;
            return d;
        }

        function computeLocalPlaneMaps(heightData, mask, width, height, options = {}) {
            const radius = options.radius ?? 2;
            const maxResidual = options.maxResidual ?? 150; // mm
            const minPoints = options.minPoints ?? 6;
            const cellSizeX = options.cellSizeX ?? 1;
            const cellSizeZ = options.cellSizeZ ?? 1;

            const size = width * height;

            const slopeDegMap = new Float32Array(size);
            const pitch12Map = new Float32Array(size);
            const azimuthDegMap = new Float32Array(size);
            const planeA = new Float32Array(size);
            const planeB = new Float32Array(size);
            const planeC = new Float32Array(size);
            const valid = new Uint8Array(size);
            // const planePoints = [];

            slopeDegMap.fill(NaN);
            pitch12Map.fill(NaN);
            azimuthDegMap.fill(NaN);
            planeA.fill(NaN);
            planeB.fill(NaN);
            planeC.fill(NaN);

            for (let cz = 0; cz < height; cz++) {
                for (let cx = 0; cx < width; cx++) {
                    const centerIndex = cz * width + cx;
                    if (mask[centerIndex] == 0) continue; // Only filter the center index.
                    const centerHeight = heightData[centerIndex];
                    if (!Number.isFinite(centerHeight)) continue;

                    const points = [];

                    for (let dz = -radius; dz <= radius; dz++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const x = cx + dx;
                            const z = cz + dz;
                            if (x < 0 || x >= width || z < 0 || z >= height) continue;

                            const i = z * width + x;
                            const y = heightData[i];
                            if (!Number.isFinite(y)) continue;

                            points.push({
                                x: x * cellSizeX,
                                z: z * cellSizeZ,
                                y
                            });
                        }
                    }

                    if (points.length < minPoints) continue;

                    let fit = fitPlaneFromPoints(points);
                    if (!fit) continue;

                    // Reject outliers and refit
                    const filtered = [];
                    for (let i = 0; i < points.length; i++) {
                        const p = points[i];
                        const predicted = fit.a * p.x + fit.b * p.z + fit.c;
                        if (Math.abs(p.y - predicted) <= maxResidual) {
                            filtered.push(p);
                        }
                    }

                    if (filtered.length < minPoints) continue;

                    fit = fitPlaneFromPoints(filtered);
                    if (!fit) continue;

                    const slopeRun = Math.sqrt(fit.a * fit.a + fit.b * fit.b);
                    const slopeRad = Math.atan(slopeRun);
                    const slopeDeg = slopeRad * 180 / Math.PI;
                    const pitch12 = slopeRun * 12;
                    const azimuthDeg = vectorToAzimuthDeg(-fit.a, -fit.b); // downslope

                    slopeDegMap[centerIndex] = slopeDeg;
                    pitch12Map[centerIndex] = pitch12;
                    azimuthDegMap[centerIndex] = azimuthDeg;
                    planeA[centerIndex] = fit.a;
                    planeB[centerIndex] = fit.b;
                    planeC[centerIndex] = fit.c;
                    valid[centerIndex] = 1;
                    // planePoints[centerIndex] = filtered;
                }
            }

            return {
                slopeDegMap,
                pitch12Map,
                azimuthDegMap,
                planeA,
                planeB,
                planeC,
                valid,
                // planePoints
            };
        }

        function fitPlaneFromPoints(points) {
            let n = 0;
            let sumX = 0, sumZ = 0, sumY = 0;
            let sumXX = 0, sumZZ = 0, sumXZ = 0;
            let sumXY = 0, sumZY = 0;

            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                n++;
                sumX += p.x;
                sumZ += p.z;
                sumY += p.y;
                sumXX += p.x * p.x;
                sumZZ += p.z * p.z;
                sumXZ += p.x * p.z;
                sumXY += p.x * p.y;
                sumZY += p.z * p.y;
            }

            return solvePlaneFromSums(n, sumX, sumZ, sumY, sumXX, sumZZ, sumXZ, sumXY, sumZY);
        }

        function solvePlaneFromSums(n, sumX, sumZ, sumY, sumXX, sumZZ, sumXZ, sumXY, sumZY) {
            const m00 = sumXX, m01 = sumXZ, m02 = sumX;
            const m10 = sumXZ, m11 = sumZZ, m12 = sumZ;
            const m20 = sumX, m21 = sumZ, m22 = n;

            const b0 = sumXY, b1 = sumZY, b2 = sumY;

            const det =
                m00 * (m11 * m22 - m12 * m21) -
                m01 * (m10 * m22 - m12 * m20) +
                m02 * (m10 * m21 - m11 * m20);

            if (Math.abs(det) < 1e-12) return null;

            const inv00 = (m11 * m22 - m12 * m21) / det;
            const inv01 = -(m01 * m22 - m02 * m21) / det;
            const inv02 = (m01 * m12 - m02 * m11) / det;

            const inv10 = -(m10 * m22 - m12 * m20) / det;
            const inv11 = (m00 * m22 - m02 * m20) / det;
            const inv12 = -(m00 * m12 - m02 * m10) / det;

            const inv20 = (m10 * m21 - m11 * m20) / det;
            const inv21 = -(m00 * m21 - m01 * m20) / det;
            const inv22 = (m00 * m11 - m01 * m10) / det;

            return {
                a: inv00 * b0 + inv01 * b1 + inv02 * b2,
                b: inv10 * b0 + inv11 * b1 + inv12 * b2,
                c: inv20 * b0 + inv21 * b1 + inv22 * b2
            };
        }

        function vectorToAzimuthDeg(dx, dz) {
            const az = Math.atan2(dx, -dz) * 180 / Math.PI;
            return (az + 360) % 360;
        }
        function wrapAngleDiffDeg(a, b) {
            let d = Math.abs(a - b) % 360;
            return d > 180 ? 360 - d : d;
        }

        // function clamp(v, lo, hi) {
        //     return v < lo ? lo : (v > hi ? hi : v);
        // }

        function normalize3(x, y, z) {
            const len = Math.hypot(x, y, z);
            if (len <= 1e-12) return [0, 0, 0];
            return [x / len, y / len, z / len];
        }

        function angleBetweenNormalsDegFromPlaneAB(a1, b1, a2, b2) {
            // For plane y = A*x + B*z + C
            // normal ~ [-A, 1, -B]
            const [n1x, n1y, n1z] = normalize3(-a1, 1, -b1);
            const [n2x, n2y, n2z] = normalize3(-a2, 1, -b2);

            const dot = clamp(n1x * n2x + n1y * n2y + n1z * n2z, -1, 1);
            return Math.acos(dot) * (180 / Math.PI);
        }

        /**
         * planeMaps must contain:
         * {
         *   slopeDegMap: Float32Array,
         *   pitch12Map: Float32Array,
         *   azimuthDegMap: Float32Array,
         *   planeA: Float32Array,
         *   planeB: Float32Array,
         *   planeC: Float32Array,
         *   valid: Uint8Array | Array<boolean>
         * }
         */
        function computePlaneBoundaryMapsFromAB(planeMaps, width, height, options = {}) {
            const {
                slopeDegMap,
                pitch12Map,
                azimuthDegMap,
                planeA,
                planeB,
                planeC,
                valid
            } = planeMaps;

            const size = width * height;

            const weights = {
                normal: options.normalWeight ?? 1.0,
                azimuth: options.azimuthWeight ?? 0.35,
                slope: options.slopeWeight ?? 0.35,
                pitch12: options.pitch12Weight ?? 0.15,
                planeOffset: options.planeOffsetWeight ?? 0.25
            };

            const caps = {
                normal: options.normalCapDeg ?? 45,
                azimuth: options.azimuthCapDeg ?? 45,
                slope: options.slopeCapDeg ?? 20,
                pitch12: options.pitch12Cap ?? 4,
                planeOffset: options.planeOffsetCap ?? 2
            };

            const invalidValue = options.invalidValue ?? 0;

            const normalDiffX = new Float32Array(size);
            const normalDiffZ = new Float32Array(size);

            const azimuthDiffX = new Float32Array(size);
            const azimuthDiffZ = new Float32Array(size);

            const slopeDiffX = new Float32Array(size);
            const slopeDiffZ = new Float32Array(size);

            const pitch12DiffX = new Float32Array(size);
            const pitch12DiffZ = new Float32Array(size);

            const planeOffsetDiffX = new Float32Array(size);
            const planeOffsetDiffZ = new Float32Array(size);

            const boundaryScoreX = new Float32Array(size);
            const boundaryScoreZ = new Float32Array(size);

            const normalEdgeStrength = new Float32Array(size);
            const azimuthEdgeStrength = new Float32Array(size);
            const slopeEdgeStrength = new Float32Array(size);
            const pitch12EdgeStrength = new Float32Array(size);
            const planeOffsetEdgeStrength = new Float32Array(size);
            const boundaryScore = new Float32Array(size);

            function isValid(i) {
                return !!valid[i] &&
                    Number.isFinite(slopeDegMap[i]) &&
                    Number.isFinite(pitch12Map[i]) &&
                    Number.isFinite(azimuthDegMap[i]) &&
                    Number.isFinite(planeA[i]) &&
                    Number.isFinite(planeB[i]) &&
                    Number.isFinite(planeC[i]);
            }

            function normalize(v, cap) {
                return clamp(v / cap, 0, 1);
            }

            function scoreFromDiffs(nDiff, aDiff, sDiff, p12Diff, cDiff) {
                const n = normalize(nDiff, caps.normal);
                const a = normalize(aDiff, caps.azimuth);
                const s = normalize(sDiff, caps.slope);
                const p = normalize(p12Diff, caps.pitch12);
                const c = normalize(cDiff, caps.planeOffset);

                return (
                    weights.normal * n +
                    weights.azimuth * a +
                    weights.slope * s +
                    weights.pitch12 * p +
                    weights.planeOffset * c
                );
            }

            for (let z = 0; z < height; z++) {
                const row = z * width;

                for (let x = 0; x < width; x++) {
                    const i = row + x;

                    if (!isValid(i)) {
                        normalEdgeStrength[i] = invalidValue;
                        azimuthEdgeStrength[i] = invalidValue;
                        slopeEdgeStrength[i] = invalidValue;
                        pitch12EdgeStrength[i] = invalidValue;
                        planeOffsetEdgeStrength[i] = invalidValue;
                        boundaryScore[i] = invalidValue;
                        continue;
                    }

                    let maxNormal = 0;
                    let maxAzimuth = 0;
                    let maxSlope = 0;
                    let maxPitch12 = 0;
                    let maxPlaneOffset = 0;
                    let maxScore = 0;

                    // Right neighbor
                    if (x + 1 < width) {
                        const j = i + 1;

                        if (isValid(j)) {
                            const nDiff = angleBetweenNormalsDegFromPlaneAB(
                                planeA[i], planeB[i],
                                planeA[j], planeB[j]
                            );
                            const aDiff = wrapAngleDiffDeg(azimuthDegMap[i], azimuthDegMap[j]);
                            const sDiff = Math.abs(slopeDegMap[i] - slopeDegMap[j]);
                            const p12Diff = Math.abs(pitch12Map[i] - pitch12Map[j]);
                            const cDiff = Math.abs(planeC[i] - planeC[j]);

                            normalDiffX[i] = nDiff;
                            azimuthDiffX[i] = aDiff;
                            slopeDiffX[i] = sDiff;
                            pitch12DiffX[i] = p12Diff;
                            planeOffsetDiffX[i] = cDiff;

                            const s = scoreFromDiffs(nDiff, aDiff, sDiff, p12Diff, cDiff);
                            boundaryScoreX[i] = s;

                            if (nDiff > maxNormal) maxNormal = nDiff;
                            if (aDiff > maxAzimuth) maxAzimuth = aDiff;
                            if (sDiff > maxSlope) maxSlope = sDiff;
                            if (p12Diff > maxPitch12) maxPitch12 = p12Diff;
                            if (cDiff > maxPlaneOffset) maxPlaneOffset = cDiff;
                            if (s > maxScore) maxScore = s;
                        }
                    }

                    // Bottom neighbor
                    if (z + 1 < height) {
                        const j = i + width;

                        if (isValid(j)) {
                            const nDiff = angleBetweenNormalsDegFromPlaneAB(
                                planeA[i], planeB[i],
                                planeA[j], planeB[j]
                            );
                            const aDiff = wrapAngleDiffDeg(azimuthDegMap[i], azimuthDegMap[j]);
                            const sDiff = Math.abs(slopeDegMap[i] - slopeDegMap[j]);
                            const p12Diff = Math.abs(pitch12Map[i] - pitch12Map[j]);
                            const cDiff = Math.abs(planeC[i] - planeC[j]);

                            normalDiffZ[i] = nDiff;
                            azimuthDiffZ[i] = aDiff;
                            slopeDiffZ[i] = sDiff;
                            pitch12DiffZ[i] = p12Diff;
                            planeOffsetDiffZ[i] = cDiff;

                            const s = scoreFromDiffs(nDiff, aDiff, sDiff, p12Diff, cDiff);
                            boundaryScoreZ[i] = s;

                            if (nDiff > maxNormal) maxNormal = nDiff;
                            if (aDiff > maxAzimuth) maxAzimuth = aDiff;
                            if (sDiff > maxSlope) maxSlope = sDiff;
                            if (p12Diff > maxPitch12) maxPitch12 = p12Diff;
                            if (cDiff > maxPlaneOffset) maxPlaneOffset = cDiff;
                            if (s > maxScore) maxScore = s;
                        }
                    }

                    normalEdgeStrength[i] = maxNormal;
                    azimuthEdgeStrength[i] = maxAzimuth;
                    slopeEdgeStrength[i] = maxSlope;
                    pitch12EdgeStrength[i] = maxPitch12;
                    planeOffsetEdgeStrength[i] = maxPlaneOffset;
                    boundaryScore[i] = maxScore;
                }
            }

            return {
                normalDiffX,
                normalDiffZ,
                azimuthDiffX,
                azimuthDiffZ,
                slopeDiffX,
                slopeDiffZ,
                pitch12DiffX,
                pitch12DiffZ,
                planeOffsetDiffX,
                planeOffsetDiffZ,
                boundaryScoreX,
                boundaryScoreZ,

                normalEdgeStrength,
                azimuthEdgeStrength,
                slopeEdgeStrength,
                pitch12EdgeStrength,
                planeOffsetEdgeStrength,
                boundaryScore
            };
        }





















































        function GetHeightByXZ(Heights: number[], X: number, Z: number, Width: number, Height: number) {
            return Heights[X * Width + Z];
        }

        let YEET: BABYLON.GroundMesh;

        function createGroundFromHeightArray(
            name: string,
            heights: number[],
            RGB: number[],
            columns: number,
            rows: number,
            cellSizeX: number,
            cellSizeZ: number,
            scene: BABYLON.Scene
        ) {
            if (columns < 2 || rows < 2) {
                throw new Error("columns and rows must both be at least 2");
            }

            if (heights.length !== columns * rows) {
                throw new Error(`heights.length must equal columns * rows (${columns * rows})`);
            }

            const width = (columns - 1) * cellSizeX;
            const height = (rows - 1) * cellSizeZ;

            if (YEET) YEET.dispose(false, true);
            const ground = YEET = BABYLON.MeshBuilder.CreateGround(
                name,
                {
                    width,
                    height,
                    subdivisionsX: columns - 1,
                    subdivisionsY: rows - 1,
                    updatable: true,
                },
                scene
            );

            const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            const indices = ground.getIndices();

            if (!positions || !indices) {
                throw new Error("Failed to get mesh vertex data");
            }

            let colors: number[] = new Array(columns * rows * 4).fill(1);

            const sortedValues = Array.from(heights).sort((x, y) => x - y);
            const minValue = sortedValues[0];
            const maxValue = sortedValues.slice(-1)[0];

            // Babylon ground vertices are laid out as a grid.
            // Each vertex has x,y,z, so positions index is vertexIndex * 3 + component.

            for (let i = 0, j = 0, k = 0; i < columns * rows; i++, j += 4, k += 3) {
                // for (let row = 0; row < rows; row++) {
                //     for (let col = 0; col < columns; col++) {
                const heightValue = heights[i];

                positions[i * 3 + 1] = (heightValue - minValue) * 39.3701 / 10; // Y
                // colors[vertexIndex * 3 * 4 + 1] = (heightValue - minValue) / (maxValue - minValue);
                colors[j] = RGB[k] / 255;
                colors[j + 1] = RGB[k + 1] / 255;
                colors[j + 2] = RGB[k + 2] / 255;
                // colors[j+3] = RGB[j+3];
                // colors[vertexIndex * 3 * 4 + 4] = 1;
                // const GROUND = BABYLON.MeshBuilder.CreateGround("E", {
                //     width: cellSizeX * 10,
                //     height: cellSizeZ * 10,

                // }, scene);
                // GROUND.position.set(row * cellSizeX, (heightValue - maxValue) * 39.3701 / 10, col * cellSizeZ);
                // }
            }

            // for (let row = 0; row < rows; row++) {
            //     for (let col = 0; col < columns; col++) {
            //         const vertexIndex = row * columns + col;
            //         const heightValue = heights[vertexIndex];

            //         positions[vertexIndex * 3 + 1] = (heightValue - minValue) * 39.3701 / 10;
            //     }
            // }

            const normals: number[] = [];
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);

            ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
            ground.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors, true);

            ground.convertToFlatShadedMesh();

            ground.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);

            // return ground;

            // for (let row = 0; row < rows; row++) {
            //     for (let col = 0; col < columns; col++) {
            //         const vertexIndex = row * columns + col;
            //         const heightValue = (heights[vertexIndex] - maxValue) * 39.3701;

            //         // positions[vertexIndex * 3 + 1] = (heightValue - maxValue) * 39.3701; // Y
            //         // const GROUND = BABYLON.MeshBuilder.CreateGround("E", {
            //         //     width: cellSizeX * 10,
            //         //     height: cellSizeZ * 10,

            //         // }, scene);
            //         // GROUND.position.set(row * cellSizeX, (heightValue - maxValue) * 39.3701 / 10, col * cellSizeZ);
            //     }
            // }
        }




























        function fitPlane(points) {
            let sumX = 0, sumZ = 0, sumY = 0;
            let sumXX = 0, sumZZ = 0, sumXZ = 0;
            let sumXY = 0, sumZY = 0;

            const n = points.length;

            for (const p of points) {
                const { x, z, y } = p;

                sumX += x;
                sumZ += z;
                sumY += y;

                sumXX += x * x;
                sumZZ += z * z;
                sumXZ += x * z;

                sumXY += x * y;
                sumZY += z * y;
            }

            // Solve normal equations
            const A = [
                [sumXX, sumXZ, sumX],
                [sumXZ, sumZZ, sumZ],
                [sumX, sumZ, n]
            ];

            const B = [sumXY, sumZY, sumY];

            const [a, b, c] = solve3x3(A, B);

            return { a, b, c };
        }

        function solve3x3(A, B) {
            const [
                [a, b, c],
                [d, e, f],
                [g, h, i]
            ] = A;

            const [j, k, l] = B;

            const det =
                a * (e * i - f * h) -
                b * (d * i - f * g) +
                c * (d * h - e * g);

            if (Math.abs(det) < 1e-10) return [0, 0, 0];

            const dx =
                j * (e * i - f * h) -
                b * (k * i - f * l) +
                c * (k * h - e * l);

            const dy =
                a * (k * i - f * l) -
                j * (d * i - f * g) +
                c * (d * l - k * g);

            const dz =
                a * (e * l - k * h) -
                b * (d * l - k * g) +
                j * (d * h - e * g);

            return [dx / det, dy / det, dz / det];
        }

        function getWindowPoints(dsm, width, height, cx, cz, radius) {
            const points = [];

            for (let dz = -radius; dz <= radius; dz++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const x = cx + dx;
                    const z = cz + dz;

                    if (x < 0 || x >= width || z < 0 || z >= height) continue;

                    const index = z * width + x;
                    const y = dsm[index];

                    points.push({ x, z, y });
                }
            }

            return points;
        }

        function computePlaneMap(dsm, width, height, radius = 2) {
            const out = new Array(dsm.length);

            for (let z = 0; z < height; z++) {
                for (let x = 0; x < width; x++) {
                    const index = z * width + x;

                    const points = getWindowPoints(dsm, width, height, x, z, radius);

                    if (points.length < 3) {
                        out[index] = null;
                        continue;
                    }

                    const { a, b, c } = fitPlane(points);

                    const slope = Math.hypot(a, b);

                    out[index] = {
                        dYdX: a,
                        dYdZ: b,
                        slope,
                        c,
                        RMSE: computeRMSE(points, a, b, c)
                    };
                }
            }

            return out;
        }

        function computeRMSE(points, a, b, c) {
            let error = 0;

            for (const p of points) {
                const predicted = a * p.x + b * p.z + c;
                const diff = p.y - predicted;
                error += diff * diff;
            }

            return Math.sqrt(error / points.length);
        }

        function planeToNormal(a, b) {
            const nx = -a;
            const ny = 1;
            const nz = -b;

            const len = Math.hypot(nx, ny, nz);

            return {
                x: nx / len,
                y: ny / len,
                z: nz / len
            };
        }






































































































































        function extractPlanesRANSACFromDSM({
            heights,              // flat array: row-major, length = width * height
            width,
            height,
            cellSizeX = 1,
            cellSizeZ = 1,
            mask = null,          // optional boolean/0-1 array: true = usable
            noData = null,        // optional value to skip
            iterations = 300,
            distanceThreshold = 0.18,   // vertical/3D plane distance tolerance
            minInliers = 40,
            maxPlanes = 50,
            sampleNeighborhood = 0,     // 0 = anywhere, >0 = prefer local-ish triplets
            refineIterations = 2,
            minSampleSeparation = 2,    // in pixels
            maxPitchDeg = 89.5,
        }) {
            const total = width * height;

            function inBounds(x, z) {
                return x >= 0 && x < width && z >= 0 && z < height;
            }

            function idx(x, z) {
                return z * width + x;
            }

            function isValidIndex(i) {
                if (i < 0 || i >= total) return false;
                if (mask && !mask[i]) return false;
                const y = heights[i];
                if (y == null || Number.isNaN(y)) return false;
                if (noData != null && y === noData) return false;
                return true;
            }

            function indexToPoint(i) {
                const z = Math.floor(i / width);
                const x = i - z * width;
                return {
                    x: x * cellSizeX,
                    y: heights[i],
                    z: z * cellSizeZ,
                    gx: x,
                    gz: z,
                    i
                };
            }

            function sub(a, b) {
                return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
            }

            function cross(a, b) {
                return {
                    x: a.y * b.z - a.z * b.y,
                    y: a.z * b.x - a.x * b.z,
                    z: a.x * b.y - a.y * b.x
                };
            }

            function dot(a, b) {
                return a.x * b.x + a.y * b.y + a.z * b.z;
            }

            function len(v) {
                return Math.sqrt(dot(v, v));
            }

            function normalize(v) {
                const l = len(v);
                if (l < 1e-12) return null;
                return { x: v.x / l, y: v.y / l, z: v.z / l };
            }

            function planeFrom3Points(p1, p2, p3) {
                const v1 = sub(p2, p1);
                const v2 = sub(p3, p1);
                let n = cross(v1, v2);
                n = normalize(n);
                if (!n) return null;

                // Reject near-vertical / degenerate planes for roof extraction.
                const horizontalMag = Math.sqrt(n.x * n.x + n.z * n.z);
                const pitchDeg = Math.atan2(horizontalMag, Math.abs(n.y)) * 180 / Math.PI;
                if (pitchDeg > maxPitchDeg) return null;

                // Make normal point upward for consistency.
                if (n.y < 0) {
                    n = { x: -n.x, y: -n.y, z: -n.z };
                }

                const d = -(n.x * p1.x + n.y * p1.y + n.z * p1.z);
                return { n, d };
            }

            function pointPlaneDistanceSigned(plane, p) {
                return plane.n.x * p.x + plane.n.y * p.y + plane.n.z * p.z + plane.d;
            }

            function pointPlaneDistanceAbs(plane, p) {
                return Math.abs(pointPlaneDistanceSigned(plane, p));
            }

            function pitchFromNormal(n) {
                const horiz = Math.sqrt(n.x * n.x + n.z * n.z);
                return Math.atan2(horiz, Math.abs(n.y)) * 180 / Math.PI;
            }

            // Azimuth of steepest descent in XZ plane.
            // 0° = +X, 90° = +Z. Change convention if you want north-based.
            function azimuthFromNormal(n) {
                const dx = -n.x / Math.max(Math.abs(n.y), 1e-12);
                const dz = -n.z / Math.max(Math.abs(n.y), 1e-12);
                let a = Math.atan2(dz, dx) * 180 / Math.PI;
                if (a < 0) a += 360;
                return a;
            }

            function buildPlaneFromNormalAndPoint(normal, p) {
                let n = normalize(normal);
                if (!n) return null;
                if (n.y < 0) n = { x: -n.x, y: -n.y, z: -n.z };
                const d = -(n.x * p.x + n.y * p.y + n.z * p.z);
                return { n, d };
            }

            // Least-squares plane via covariance/PCA:
            // plane normal = eigenvector of smallest eigenvalue of covariance matrix.
            function fitPlaneLeastSquares(points) {
                const count = points.length;
                if (count < 3) return null;

                let mx = 0, my = 0, mz = 0;
                for (const p of points) {
                    mx += p.x; my += p.y; mz += p.z;
                }
                mx /= count; my /= count; mz /= count;

                let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
                for (const p of points) {
                    const dx = p.x - mx;
                    const dy = p.y - my;
                    const dz = p.z - mz;
                    xx += dx * dx;
                    xy += dx * dy;
                    xz += dx * dz;
                    yy += dy * dy;
                    yz += dy * dz;
                    zz += dz * dz;
                }

                // Smallest-eigenvector approximation using inverse iteration on symmetric matrix.
                // Matrix:
                // [xx xy xz]
                // [xy yy yz]
                // [xz yz zz]
                const m = [
                    [xx, xy, xz],
                    [xy, yy, yz],
                    [xz, yz, zz]
                ];

                const n = smallestEigenVectorSymmetric3x3(m);
                if (!n) return null;

                const plane = buildPlaneFromNormalAndPoint(n, { x: mx, y: my, z: mz });
                return plane;
            }

            function smallestEigenVectorSymmetric3x3(m) {
                // Jacobi iteration for symmetric 3x3
                const a = [
                    [m[0][0], m[0][1], m[0][2]],
                    [m[1][0], m[1][1], m[1][2]],
                    [m[2][0], m[2][1], m[2][2]]
                ];
                let v = [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1]
                ];

                for (let iter = 0; iter < 20; iter++) {
                    let p = 0, q = 1;
                    let max = Math.abs(a[0][1]);

                    if (Math.abs(a[0][2]) > max) {
                        max = Math.abs(a[0][2]);
                        p = 0; q = 2;
                    }
                    if (Math.abs(a[1][2]) > max) {
                        max = Math.abs(a[1][2]);
                        p = 1; q = 2;
                    }

                    if (max < 1e-10) break;

                    const app = a[p][p];
                    const aqq = a[q][q];
                    const apq = a[p][q];

                    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
                    const c = Math.cos(phi);
                    const s = Math.sin(phi);

                    for (let k = 0; k < 3; k++) {
                        const aik = a[p][k];
                        const aqk = a[q][k];
                        a[p][k] = c * aik - s * aqk;
                        a[q][k] = s * aik + c * aqk;
                    }
                    for (let k = 0; k < 3; k++) {
                        const akp = a[k][p];
                        const akq = a[k][q];
                        a[k][p] = c * akp - s * akq;
                        a[k][q] = s * akp + c * akq;
                    }
                    for (let k = 0; k < 3; k++) {
                        const vip = v[k][p];
                        const viq = v[k][q];
                        v[k][p] = c * vip - s * viq;
                        v[k][q] = s * vip + c * viq;
                    }
                }

                const evals = [a[0][0], a[1][1], a[2][2]];
                let minIndex = 0;
                if (evals[1] < evals[minIndex]) minIndex = 1;
                if (evals[2] < evals[minIndex]) minIndex = 2;

                const out = {
                    x: v[0][minIndex],
                    y: v[1][minIndex],
                    z: v[2][minIndex]
                };
                return normalize(out);
            }

            function pickRandom(arr) {
                return arr[(Math.random() * arr.length) | 0];
            }

            function farEnough(a, b) {
                const pa = indexToPoint(a);
                const pb = indexToPoint(b);
                return Math.abs(pa.gx - pb.gx) + Math.abs(pa.gz - pb.gz) >= minSampleSeparation;
            }

            function pick3Indices(candidates) {
                if (candidates.length < 3) return null;

                let i1 = pickRandom(candidates);
                let i2 = -1;
                let i3 = -1;

                for (let tries = 0; tries < 30; tries++) {
                    const t = pickRandom(candidates);
                    if (t !== i1 && farEnough(i1, t)) {
                        i2 = t;
                        break;
                    }
                }
                if (i2 === -1) return null;

                if (sampleNeighborhood > 0) {
                    const p1 = indexToPoint(i1);
                    const local = [];
                    for (const c of candidates) {
                        const p = indexToPoint(c);
                        if (
                            Math.abs(p.gx - p1.gx) <= sampleNeighborhood &&
                            Math.abs(p.gz - p1.gz) <= sampleNeighborhood &&
                            c !== i1 && c !== i2
                        ) {
                            local.push(c);
                        }
                    }
                    for (let tries = 0; tries < 30; tries++) {
                        const t = local.length ? pickRandom(local) : pickRandom(candidates);
                        if (t !== i1 && t !== i2 && farEnough(i1, t) && farEnough(i2, t)) {
                            i3 = t;
                            break;
                        }
                    }
                } else {
                    for (let tries = 0; tries < 30; tries++) {
                        const t = pickRandom(candidates);
                        if (t !== i1 && t !== i2 && farEnough(i1, t) && farEnough(i2, t)) {
                            i3 = t;
                            break;
                        }
                    }
                }

                if (i3 === -1) return null;
                return [i1, i2, i3];
            }

            function collectInliers(plane, candidateIndices, threshold) {
                const inliers = [];
                for (const i of candidateIndices) {
                    const p = indexToPoint(i);
                    if (pointPlaneDistanceAbs(plane, p) <= threshold) {
                        inliers.push(i);
                    }
                }
                return inliers;
            }

            // Keep only connected components so one plane doesn't grab detached junk.
            function splitConnected(indicesSet) {
                const visited = new Set();
                const components = [];
                const dirs = [
                    [1, 0], [-1, 0], [0, 1], [0, -1],
                    [1, 1], [-1, -1], [1, -1], [-1, 1]
                ];

                for (const i of indicesSet) {
                    if (visited.has(i)) continue;

                    const comp = [];
                    const queue = [i];
                    visited.add(i);

                    while (queue.length) {
                        const cur = queue.pop();
                        comp.push(cur);

                        const z = Math.floor(cur / width);
                        const x = cur - z * width;

                        for (const [dx, dz] of dirs) {
                            const nx = x + dx;
                            const nz = z + dz;
                            if (!inBounds(nx, nz)) continue;
                            const ni = idx(nx, nz);
                            if (!indicesSet.has(ni) || visited.has(ni)) continue;
                            visited.add(ni);
                            queue.push(ni);
                        }
                    }

                    components.push(comp);
                }

                return components;
            }

            const remaining = [];
            for (let i = 0; i < total; i++) {
                if (isValidIndex(i)) remaining.push(i);
            }

            const planes = [];
            const assignedPlaneIndex = new Int32Array(total).fill(-1);

            while (planes.length < maxPlanes && remaining.length >= minInliers) {
                let bestPlane = null;
                let bestInliers = [];

                for (let it = 0; it < iterations; it++) {
                    const sample = pick3Indices(remaining);
                    if (!sample) continue;

                    const p1 = indexToPoint(sample[0]);
                    const p2 = indexToPoint(sample[1]);
                    const p3 = indexToPoint(sample[2]);

                    let plane = planeFrom3Points(p1, p2, p3);
                    if (!plane) continue;

                    let inliers = collectInliers(plane, remaining, distanceThreshold);
                    if (inliers.length < minInliers) continue;

                    // Refine plane from inliers a few times.
                    for (let r = 0; r < refineIterations; r++) {
                        const pts = inliers.map(indexToPoint);
                        const refined = fitPlaneLeastSquares(pts);
                        if (!refined) break;
                        plane = refined;
                        inliers = collectInliers(plane, remaining, distanceThreshold);
                        if (inliers.length < minInliers) break;
                    }

                    if (inliers.length > bestInliers.length) {
                        bestPlane = plane;
                        bestInliers = inliers;
                    }
                }

                if (!bestPlane || bestInliers.length < minInliers) break;

                // Split disconnected inliers and keep largest connected component.
                const bestSet = new Set(bestInliers);
                const comps = splitConnected(bestSet);
                comps.sort((a, b) => b.length - a.length);
                const mainComp = comps[0];

                if (!mainComp || mainComp.length < minInliers) break;

                // Refit one last time using only main connected component.
                const finalPlane = fitPlaneLeastSquares(mainComp.map(indexToPoint)) || bestPlane;
                const finalInliers = collectInliers(finalPlane, mainComp, distanceThreshold);

                if (finalInliers.length < minInliers) break;

                const normal = finalPlane.n;
                const pitchDeg = pitchFromNormal(normal);
                const azimuthDeg = azimuthFromNormal(normal);

                const planeIndex = planes.length;
                for (const i of finalInliers) assignedPlaneIndex[i] = planeIndex;

                planes.push({
                    plane: finalPlane,           // { n: {x,y,z}, d }
                    normal,
                    pitchDeg,
                    azimuthDeg,
                    indices: finalInliers.slice()
                });

                // Remove assigned points from remaining.
                const keep = [];
                const taken = new Set(finalInliers);
                for (let i = 0; i < remaining.length; i++) {
                    const v = remaining[i];
                    if (!taken.has(v)) keep.push(v);
                }

                remaining.length = 0;
                for (let i = 0; i < keep.length; i++) {
                    remaining.push(keep[i]);
                }
            }

            return {
                planes,
                unassigned: remaining.slice(),
                assignedPlaneIndex
            };
        }

        function segmentRoofPlanesByFit(heightMap, width, length, options = {}) {
            const {
                windowSize = 5,
                distThresh = 0.25,
                normalThreshDeg = 12,
                residualThresh = 0.25,
                minRegionSize = 10,
                useDiagonals = true
            } = options;

            const size = width * length;
            const regionId = new Int32Array(size).fill(-1);
            const normals = new Array(size);
            const residuals = new Float32Array(size).fill(Infinity);

            function idx(x, y) {
                return y * width + x;
            }

            function inBounds(x, y) {
                return x >= 0 && y >= 0 && x < width && y < length;
            }

            function getPoint(x, y) {
                return { x, y, z: heightMap[idx(x, y)] };
            }

            function fitPlane(points) {
                const n = points.length;
                if (n < 3) return null;

                let mx = 0, my = 0, mz = 0;
                for (const p of points) {
                    mx += p.x;
                    my += p.y;
                    mz += p.z;
                }
                mx /= n;
                my /= n;
                mz /= n;

                let xx = 0, xy = 0, xz = 0;
                let yy = 0, yz = 0;

                for (const p of points) {
                    const dx = p.x - mx;
                    const dy = p.y - my;
                    const dz = p.z - mz;
                    xx += dx * dx;
                    xy += dx * dy;
                    xz += dx * dz;
                    yy += dy * dy;
                    yz += dy * dz;
                }

                const det = xx * yy - xy * xy;
                if (Math.abs(det) < 1e-8) return null;

                const a = (xz * yy - yz * xy) / det;
                const b = (yz * xx - xz * xy) / det;
                const c = mz - a * mx - b * my;

                let nx = -a, ny = -b, nz = 1;
                const len = Math.hypot(nx, ny, nz);
                if (len < 1e-8) return null;
                nx /= len;
                ny /= len;
                nz /= len;

                let err = 0;
                for (const p of points) {
                    const zPred = a * p.x + b * p.y + c;
                    err += Math.abs(zPred - p.z);
                }
                err /= n;

                return { a, b, c, nx, ny, nz, residual: err };
            }

            function angleBetweenNormals(n1, n2) {
                let dot = n1.nx * n2.nx + n1.ny * n2.ny + n1.nz * n2.nz;
                dot = Math.max(-1, Math.min(1, dot));
                return Math.acos(dot) * 180 / Math.PI;
            }

            function planeResidual(plane, p) {
                return Math.abs((plane.a * p.x + plane.b * p.y + plane.c) - p.z);
            }

            function getNeighbors(x, y) {
                const dirs4 = [
                    [1, 0], [-1, 0], [0, 1], [0, -1]
                ];
                const dirs8 = [
                    [1, 0], [-1, 0], [0, 1], [0, -1],
                    [1, 1], [1, -1], [-1, 1], [-1, -1]
                ];
                const dirs = useDiagonals ? dirs8 : dirs4;

                const out = [];
                for (const [dx, dy] of dirs) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (inBounds(nx, ny)) out.push([nx, ny]);
                }
                return out;
            }

            // local plane estimation
            const r = Math.floor(windowSize / 2);

            for (let y = r; y < length - r; y++) {
                for (let x = r; x < width - r; x++) {
                    const pts = [];
                    for (let dy = -r; dy <= r; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            pts.push(getPoint(x + dx, y + dy));
                        }
                    }

                    const plane = fitPlane(pts);
                    const i = idx(x, y);

                    if (plane) {
                        normals[i] = plane;
                        residuals[i] = plane.residual;
                    }
                }
            }

            const regions = [];
            let currentRegion = 0;

            for (let y = 0; y < length; y++) {
                for (let x = 0; x < width; x++) {
                    const seedIndex = idx(x, y);

                    if (regionId[seedIndex] !== -1) continue;
                    if (!normals[seedIndex]) continue;
                    if (residuals[seedIndex] > residualThresh) continue;

                    const queue = [[x, y]];
                    const pixels = [];
                    const points = [];

                    regionId[seedIndex] = currentRegion;

                    while (queue.length) {
                        const [cx, cy] = queue.pop();
                        const ci = idx(cx, cy);
                        const p = getPoint(cx, cy);

                        pixels.push(ci);
                        points.push(p);

                        const plane = fitPlane(points);
                        if (!plane) continue;

                        for (const [nx, ny] of getNeighbors(cx, cy)) {
                            const ni = idx(nx, ny);
                            if (regionId[ni] !== -1) continue;
                            if (!normals[ni]) continue;
                            if (residuals[ni] > residualThresh) continue;

                            const np = getPoint(nx, ny);

                            const dist = planeResidual(plane, np);
                            if (dist > distThresh) continue;

                            const ang = angleBetweenNormals(plane, normals[ni]);
                            if (ang > normalThreshDeg) continue;

                            regionId[ni] = currentRegion;
                            queue.push([nx, ny]);
                        }
                    }

                    if (pixels.length >= minRegionSize) {
                        const plane = fitPlane(points);
                        regions.push({
                            id: currentRegion,
                            pixels,
                            plane
                        });
                        currentRegion++;
                    } else {
                        for (const pi of pixels) {
                            regionId[pi] = -1;
                        }
                    }
                }
            }

            return { regionId, regions, normals, residuals };
        }

        function removeBorderConnected(mask, width, height) {
            const visited = new Uint8Array(width * height);
            const result = new Uint8Array(mask); // copy

            const stack = [];

            function pushIfValid(x, y) {
                if (x < 0 || y < 0 || x >= width || y >= height) return;
                const i = y * width + x;
                if (visited[i] || mask[i] === 0) return;
                stack.push(i);
                visited[i] = 1;
            }

            // Seed from borders
            for (let x = 0; x < width; x++) {
                pushIfValid(x, 0);
                pushIfValid(x, height - 1);
            }
            for (let y = 0; y < height; y++) {
                pushIfValid(0, y);
                pushIfValid(width - 1, y);
            }

            // Flood-fill remove
            while (stack.length) {
                const i = stack.pop();
                result[i] = 0;

                const x = i % width;
                const y = (i / width) | 0;

                pushIfValid(x + 1, y);
                pushIfValid(x - 1, y);
                pushIfValid(x, y + 1);
                pushIfValid(x, y - 1);
            }

            return result;
        }













































        const EDGE_NONE = 0;
        const EDGE_RIDGE = 1;
        const EDGE_VALLEY = 2;
        const EDGE_HIP = 3;
        const EDGE_EAVE = 4;
        const EDGE_GABLE = 5;
        const EDGE_STEP = 6;
        const EDGE_UNKNOWN = 7;

        function normalize2(x, z) {
            const len = Math.hypot(x, z);
            if (len <= 1e-12) return [0, 0];
            return [x / len, z / len];
        }

        function dot2(ax, az, bx, bz) {
            return ax * bx + az * bz;
        }

        function angleBetweenNormalsDegFromAB(a1, b1, a2, b2) {
            // Plane: y = A*x + B*z + C
            // Normal: [-A, 1, -B]
            const [n1x, n1y, n1z] = normalize3(-a1, 1, -b1);
            const [n2x, n2y, n2z] = normalize3(-a2, 1, -b2);
            const dot = clamp(n1x * n2x + n1y * n2y + n1z * n2z, -1, 1);
            return Math.acos(dot) * (180 / Math.PI);
        }

        function circularMeanDeg(anglesDeg) {
            let sx = 0, sz = 0;
            for (let i = 0; i < anglesDeg.length; i++) {
                const r = anglesDeg[i] * Math.PI / 180;
                sx += Math.cos(r);
                sz += Math.sin(r);
            }
            if (Math.abs(sx) < 1e-12 && Math.abs(sz) < 1e-12) return 0;
            let deg = Math.atan2(sz, sx) * 180 / Math.PI;
            if (deg < 0) deg += 360;
            return deg;
        }

        function planeHeightAt(a, b, c, x, z) {
            return a * x + b * z + c;
        }

        function greedyAssignPlaneGroup(groups, sample, opts) {
            for (let g = 0; g < groups.length; g++) {
                const group = groups[g];

                const normalDiff = angleBetweenNormalsDegFromAB(
                    sample.a, sample.b,
                    group.meanA, group.meanB
                );

                const azDiff = wrapAngleDiffDeg(sample.azimuthDeg, group.meanAzimuthDeg);
                const slopeDiff = Math.abs(sample.slopeDeg - group.meanSlopeDeg);

                if (
                    normalDiff <= opts.groupNormalToleranceDeg &&
                    azDiff <= opts.groupAzimuthToleranceDeg &&
                    slopeDiff <= opts.groupSlopeToleranceDeg
                ) {
                    group.samples.push(sample);
                    group.sumDX += sample.dx;
                    group.sumDZ += sample.dz;
                    group.sumA += sample.a;
                    group.sumB += sample.b;
                    group.sumC += sample.c;
                    group.sumSlope += sample.slopeDeg;
                    group.azimuths.push(sample.azimuthDeg);
                    group.count++;

                    group.meanA = group.sumA / group.count;
                    group.meanB = group.sumB / group.count;
                    group.meanC = group.sumC / group.count;
                    group.meanSlopeDeg = group.sumSlope / group.count;
                    group.meanAzimuthDeg = circularMeanDeg(group.azimuths);

                    return;
                }
            }

            groups.push({
                samples: [sample],
                count: 1,
                sumDX: sample.dx,
                sumDZ: sample.dz,
                sumA: sample.a,
                sumB: sample.b,
                sumC: sample.c,
                sumSlope: sample.slopeDeg,
                azimuths: [sample.azimuthDeg],
                meanA: sample.a,
                meanB: sample.b,
                meanC: sample.c,
                meanSlopeDeg: sample.slopeDeg,
                meanAzimuthDeg: sample.azimuthDeg
            });
        }

        function finalizeGroupDirections(group) {
            const [cx, cz] = normalize2(group.sumDX, group.sumDZ);
            group.centroidDirX = cx;
            group.centroidDirZ = cz;

            // Downslope direction for y = A*x + B*z + C is [-A, -B]
            const [dsx, dsz] = normalize2(-group.meanA, -group.meanB);
            group.downslopeX = dsx;
            group.downslopeZ = dsz;
        }

        function classifyLocalRoofEdges5x5(localPlaneMaps, width, height, options = {}) {
            const {
                slopeDegMap,
                pitch12Map,
                azimuthDegMap,
                planeA,
                planeB,
                planeC,
                valid
            } = localPlaneMaps;

            const size = width * height;

            const opts = {
                radius: options.radius ?? 2,

                groupNormalToleranceDeg: options.groupNormalToleranceDeg ?? 12,
                groupAzimuthToleranceDeg: options.groupAzimuthToleranceDeg ?? 20,
                groupSlopeToleranceDeg: options.groupSlopeToleranceDeg ?? 8,

                minGroupCount: options.minGroupCount ?? 3,
                minInvalidBoundaryCount: options.minInvalidBoundaryCount ?? 4,

                minTwoPlaneNormalDiffDeg: options.minTwoPlaneNormalDiffDeg ?? 10,
                minTwoPlaneAzimuthDiffDeg: options.minTwoPlaneAzimuthDiffDeg ?? 12,
                minTwoPlaneSlopeDiffDeg: options.minTwoPlaneSlopeDiffDeg ?? 4,

                centroidOppositionMaxDot: options.centroidOppositionMaxDot ?? -0.15,
                boundaryDominanceDot: options.boundaryDominanceDot ?? 0.55,

                ridgeValleyDirectionalThreshold: options.ridgeValleyDirectionalThreshold ?? 0.08,
                ridgeAlongEdgeSlopeThreshold: options.ridgeAlongEdgeSlopeThreshold ?? 0.06,
                eaveAlignmentThreshold: options.eaveAlignmentThreshold ?? 0.65,
                gableAlignmentThreshold: options.gableAlignmentThreshold ?? 0.65
            };

            const edgeTypeMap = new Uint8Array(size);
            const edgeStrengthMap = new Float32Array(size);
            const edgeDirectionX = new Float32Array(size);
            const edgeDirectionZ = new Float32Array(size);

            // Optional debug/raw outputs
            const planeGroupCountMap = new Uint8Array(size);
            const primaryScoreMap = new Float32Array(size);
            const secondaryScoreMap = new Float32Array(size);

            function isValid(i) {
                return !!valid[i] &&
                    Number.isFinite(slopeDegMap[i]) &&
                    Number.isFinite(pitch12Map[i]) &&
                    Number.isFinite(azimuthDegMap[i]) &&
                    Number.isFinite(planeA[i]) &&
                    Number.isFinite(planeB[i]) &&
                    Number.isFinite(planeC[i]);
            }

            for (let z = 0; z < height; z++) {
                for (let x = 0; x < width; x++) {
                    const i = z * width + x;

                    if (!isValid(i)) continue;

                    const groups = [];
                    let invalidCount = 0;
                    let invalidDX = 0;
                    let invalidDZ = 0;

                    // Gather 5x5 neighborhood
                    for (let dz = -opts.radius; dz <= opts.radius; dz++) {
                        const nz = z + dz;
                        if (nz < 0 || nz >= height) continue;

                        for (let dx = -opts.radius; dx <= opts.radius; dx++) {
                            const nx = x + dx;
                            if (nx < 0 || nx >= width) continue;
                            if (dx === 0 && dz === 0) continue;

                            const ni = nz * width + nx;

                            if (!isValid(ni)) {
                                invalidCount++;
                                invalidDX += dx;
                                invalidDZ += dz;
                                continue;
                            }

                            const sample = {
                                dx,
                                dz,
                                a: planeA[ni],
                                b: planeB[ni],
                                c: planeC[ni],
                                slopeDeg: slopeDegMap[ni],
                                pitch12: pitch12Map[ni],
                                azimuthDeg: azimuthDegMap[ni]
                            };

                            greedyAssignPlaneGroup(groups, sample, opts);
                        }
                    }

                    if (groups.length === 0) continue;

                    groups.sort((g1, g2) => g2.count - g1.count);
                    for (let g = 0; g < groups.length; g++) finalizeGroupDirections(groups[g]);

                    planeGroupCountMap[i] = groups.length;

                    const g1 = groups[0];
                    const g2 = groups.length > 1 ? groups[1] : null;

                    primaryScoreMap[i] = g1 ? g1.count : 0;
                    secondaryScoreMap[i] = g2 ? g2.count : 0;

                    // -----------------------------
                    // CASE 1: Two-plane intersection
                    // -----------------------------
                    if (
                        g2 &&
                        g1.count >= opts.minGroupCount &&
                        g2.count >= opts.minGroupCount
                    ) {
                        const normalDiff = angleBetweenNormalsDegFromAB(
                            g1.meanA, g1.meanB,
                            g2.meanA, g2.meanB
                        );
                        const azDiff = wrapAngleDiffDeg(g1.meanAzimuthDeg, g2.meanAzimuthDeg);
                        const slopeDiff = Math.abs(g1.meanSlopeDeg - g2.meanSlopeDeg);

                        const centroidDot = dot2(
                            g1.centroidDirX, g1.centroidDirZ,
                            g2.centroidDirX, g2.centroidDirZ
                        );

                        const isOpposed = centroidDot <= opts.centroidOppositionMaxDot;
                        const isDifferentEnough =
                            normalDiff >= opts.minTwoPlaneNormalDiffDeg ||
                            azDiff >= opts.minTwoPlaneAzimuthDiffDeg ||
                            slopeDiff >= opts.minTwoPlaneSlopeDiffDeg;

                        if (isOpposed && isDifferentEnough) {
                            // Edge tangent is perpendicular to separation between the two group centroids
                            const sepX = g2.centroidDirX - g1.centroidDirX;
                            const sepZ = g2.centroidDirZ - g1.centroidDirZ;
                            const [nX, nZ] = normalize2(sepX, sepZ);   // across-edge normal
                            const [tX, tZ] = normalize2(-nZ, nX);      // edge tangent

                            // Directional derivatives outward from the edge into each plane side
                            const out1 = g1.meanA * g1.centroidDirX + g1.meanB * g1.centroidDirZ;
                            const out2 = g2.meanA * g2.centroidDirX + g2.meanB * g2.centroidDirZ;

                            // Mean along-edge slope
                            const meanA = (g1.meanA + g2.meanA) * 0.5;
                            const meanB = (g1.meanB + g2.meanB) * 0.5;
                            const alongEdgeSlope = meanA * tX + meanB * tZ;

                            let type = EDGE_UNKNOWN;

                            // Both sides go down away from edge => ridge/hip
                            if (
                                out1 <= -opts.ridgeValleyDirectionalThreshold &&
                                out2 <= -opts.ridgeValleyDirectionalThreshold
                            ) {
                                type =
                                    Math.abs(alongEdgeSlope) <= opts.ridgeAlongEdgeSlopeThreshold
                                        ? EDGE_RIDGE
                                        : EDGE_HIP;
                            }
                            // Both sides go up away from edge => valley
                            else if (
                                out1 >= opts.ridgeValleyDirectionalThreshold &&
                                out2 >= opts.ridgeValleyDirectionalThreshold
                            ) {
                                type = EDGE_VALLEY;
                            }
                            // Otherwise likely a step / awkward junction / dormer transition
                            else {
                                type = EDGE_STEP;
                            }

                            edgeTypeMap[i] = type;
                            edgeStrengthMap[i] =
                                Math.max(
                                    normalDiff / 45,
                                    azDiff / 45,
                                    slopeDiff / 20
                                );
                            edgeDirectionX[i] = tX;
                            edgeDirectionZ[i] = tZ;
                            continue;
                        }
                    }

                    // -----------------------------
                    // CASE 2: One-plane boundary
                    // -----------------------------
                    if (
                        g1 &&
                        g1.count >= opts.minGroupCount &&
                        invalidCount >= opts.minInvalidBoundaryCount
                    ) {
                        // Outward normal points toward invalid side
                        const [outX, outZ] = normalize2(invalidDX, invalidDZ);

                        // Strong boundary means invalids are concentrated on one side
                        const invalidDominance = Math.hypot(invalidDX, invalidDZ) / invalidCount;

                        if (invalidDominance >= opts.boundaryDominanceDot) {
                            const [downX, downZ] = normalize2(-g1.meanA, -g1.meanB);
                            const [tX, tZ] = normalize2(-outZ, outX);

                            const outDotDown = dot2(outX, outZ, downX, downZ);
                            const tanDotDown = Math.abs(dot2(tX, tZ, downX, downZ));

                            let type = EDGE_UNKNOWN;

                            // Downslope points outward => eave
                            if (outDotDown >= opts.eaveAlignmentThreshold) {
                                type = EDGE_EAVE;
                            }
                            // Boundary tangent aligns with downslope => gable/rake-like edge
                            else if (tanDotDown >= opts.gableAlignmentThreshold) {
                                type = EDGE_GABLE;
                            }
                            else {
                                type = EDGE_UNKNOWN;
                            }

                            edgeTypeMap[i] = type;
                            edgeStrengthMap[i] = invalidDominance;
                            edgeDirectionX[i] = tX;
                            edgeDirectionZ[i] = tZ;
                        }
                    }
                }
            }

            return {
                edgeTypeMap,       // Uint8Array of EDGE_* codes
                edgeStrengthMap,   // how strongly this looks like an edge
                edgeDirectionX,    // tangent direction in x
                edgeDirectionZ,    // tangent direction in z

                // debug/raw helpers
                planeGroupCountMap,
                primaryScoreMap,
                secondaryScoreMap
            };
        }

        // const enum RoofEdgeClass {
        //     NONE = 0,
        //     EAVE = 1,
        //     GABLE = 2,
        //     RIDGE = 3,
        //     HIP = 4,
        //     VALLEY = 5,
        //     SEAM = 6,
        //     UNKNOWN_BOUNDARY = 7,
        // }

        // type LocalCircularMapsLike = {
        //     pitch12Map: ArrayLike<number>;
        //     azimuthDegMap: ArrayLike<number>;
        //     fitErrorMap?: ArrayLike<number>;
        //     valid: ArrayLike<number>;
        //     trusted?: ArrayLike<number>;
        //     confidenceMap?: ArrayLike<number>;
        // };

        // type ClassifyLocalRoofEdges5x5Options = {
        //     mask?: ArrayLike<number> | null;

        //     minPitch12?: number;                 // ignore very low slopes
        //     minSectorSamples?: number;           // weighted count per sector pair side
        //     minAzimuthSplitDeg?: number;         // minimum azimuth separation across seam
        //     maxPitchDiff12?: number;             // pair should have similar pitch across seam

        //     ridgeValleyDotThreshold?: number;    // how strongly each side should point away/toward seam
        //     eaveDotThreshold?: number;           // downslope vs outward boundary normal
        //     gableAbsDotThreshold?: number;       // near-parallel to boundary => gable

        //     boundaryOutsideFraction?: number;    // how much outside support to treat as boundary
        //     fitErrorForSeam?: number;            // seam gets stronger when center fit error is elevated

        //     preferTrusted?: boolean;             // if trusted exists, require it
        // };

        // type ClassifiedRoofEdges = {
        //     labelMap: Uint8Array;
        //     strengthMap: Float32Array;
        //     seamScoreMap: Float32Array;
        //     boundaryScoreMap: Float32Array;
        // };

        // // function clamp01(v: number): number {
        // //     return v <= 0 ? 0 : v >= 1 ? 1 : v;
        // // }

        // // function angleDeltaDeg(a: number, b: number): number {
        // //     let d = Math.abs(a - b) % 360;
        // //     if (d > 180) d = 360 - d;
        // //     return d;
        // // }

        // function azimuthToVector(azDeg: number): { x: number; z: number } {
        //     const r = azDeg * Math.PI / 180;
        //     // 0°=+Z, 90°=+X
        //     return { x: Math.sin(r), z: Math.cos(r) };
        // }

        // function hypot2(x: number, z: number): number {
        //     return Math.hypot(x, z);
        // }

        // function normalize2(x: number, z: number): { x: number; z: number; len: number } {
        //     const len = Math.hypot(x, z);
        //     if (len <= 1e-12) return { x: 0, z: 0, len: 0 };
        //     return { x: x / len, z: z / len, len };
        // }

        // /**
        //  * Remake of classifyLocalRoofEdges5x5 using circular-map outputs rather than raw heights.
        //  *
        //  * Needs:
        //  *   - azimuthDegMap
        //  *   - pitch12Map
        //  *   - valid
        //  *
        //  * Helps a lot if available:
        //  *   - fitErrorMap
        //  *   - trusted
        //  *   - mask
        //  */
        // function classifyLocalRoofEdges5x5FromCircularMaps(
        //     maps: LocalCircularMapsLike,
        //     width: number,
        //     height: number,
        //     options: ClassifyLocalRoofEdges5x5Options = {}
        // ): ClassifiedRoofEdges {
        //     const {
        //         mask = null,

        //         minPitch12 = 1.5,
        //         minSectorSamples = 1.25,
        //         minAzimuthSplitDeg = 20,
        //         maxPitchDiff12 = 3.0,

        //         ridgeValleyDotThreshold = 0.45,
        //         eaveDotThreshold = 0.55,
        //         gableAbsDotThreshold = 0.30,

        //         boundaryOutsideFraction = 0.22,
        //         fitErrorForSeam = 1.25,

        //         preferTrusted = true,
        //     } = options;

        //     const n = width * height;
        //     if (maps.pitch12Map.length !== n) throw new Error("pitch12Map length mismatch");
        //     if (maps.azimuthDegMap.length !== n) throw new Error("azimuthDegMap length mismatch");
        //     if (maps.valid.length !== n) throw new Error("valid length mismatch");
        //     if (mask && mask.length !== n) throw new Error("mask length mismatch");
        //     if (maps.fitErrorMap && maps.fitErrorMap.length !== n) throw new Error("fitErrorMap length mismatch");
        //     if (maps.trusted && maps.trusted.length !== n) throw new Error("trusted length mismatch");
        //     if (maps.confidenceMap && maps.confidenceMap.length !== n) throw new Error("confidenceMap length mismatch");

        //     const labelMap = new Uint8Array(n);
        //     const strengthMap = new Float32Array(n);
        //     const seamScoreMap = new Float32Array(n);
        //     const boundaryScoreMap = new Float32Array(n);

        //     // 8 directional sectors around center for the 5x5 neighborhood
        //     const sectorDirs = [
        //         { x: 1, z: 0 },                                // E
        //         { x: Math.SQRT1_2, z: Math.SQRT1_2 },          // SE
        //         { x: 0, z: 1 },                                // S (+Z)
        //         { x: -Math.SQRT1_2, z: Math.SQRT1_2 },         // SW
        //         { x: -1, z: 0 },                               // W
        //         { x: -Math.SQRT1_2, z: -Math.SQRT1_2 },        // NW
        //         { x: 0, z: -1 },                               // N (-Z)
        //         { x: Math.SQRT1_2, z: -Math.SQRT1_2 },         // NE
        //     ];

        //     type Off = { dx: number; dz: number; dist: number; sector: number; w: number };
        //     const offsets: Off[] = [];

        //     for (let dz = -2; dz <= 2; dz++) {
        //         for (let dx = -2; dx <= 2; dx++) {
        //             if (dx === 0 && dz === 0) continue;
        //             const dist = Math.hypot(dx, dz);
        //             if (dist > 2.5) continue;

        //             let ang = Math.atan2(dz, dx); // 0=+X
        //             if (ang < 0) ang += 2 * Math.PI;
        //             let sector = Math.round((ang / (2 * Math.PI)) * 8) % 8;

        //             offsets.push({
        //                 dx,
        //                 dz,
        //                 dist,
        //                 sector,
        //                 w: 1 / dist,
        //             });
        //         }
        //     }

        //     function isUsable(i: number): boolean {
        //         if (!maps.valid[i]) return false;
        //         if (preferTrusted && maps.trusted && !maps.trusted[i]) return false;

        //         const pitch = maps.pitch12Map[i];
        //         const az = maps.azimuthDegMap[i];

        //         if (!Number.isFinite(pitch) || pitch < minPitch12) return false;
        //         if (!Number.isFinite(az)) return false;
        //         return true;
        //     }

        //     for (let z = 0; z < height; z++) {
        //         const rowBase = z * width;

        //         for (let x = 0; x < width; x++) {
        //             const i = rowBase + x;

        //             if (mask && mask[i] === 0) continue;
        //             if (!isUsable(i)) continue;

        //             const centerPitch = maps.pitch12Map[i];
        //             const centerAz = maps.azimuthDegMap[i];
        //             const centerVec = azimuthToVector(centerAz);
        //             const centerFit = maps.fitErrorMap ? maps.fitErrorMap[i] : 0;

        //             // sector accumulators
        //             const secCount = new Float32Array(8);
        //             const secSumPitch = new Float32Array(8);
        //             const secSumVX = new Float32Array(8);
        //             const secSumVZ = new Float32Array(8);

        //             // boundary / outside support
        //             let insideW = 0;
        //             let outsideW = 0;
        //             let outNX = 0;
        //             let outNZ = 0;

        //             for (const off of offsets) {
        //                 const nx = x + off.dx;
        //                 const nz = z + off.dz;
        //                 if (nx < 0 || nx >= width || nz < 0 || nz >= height) {
        //                     outsideW += off.w;
        //                     outNX += off.w * off.dx;
        //                     outNZ += off.w * off.dz;
        //                     continue;
        //                 }

        //                 const j = nz * width + nx;

        //                 if (mask && mask[j] === 0) {
        //                     outsideW += off.w;
        //                     outNX += off.w * off.dx;
        //                     outNZ += off.w * off.dz;
        //                     continue;
        //                 }

        //                 insideW += off.w;

        //                 if (!isUsable(j)) continue;

        //                 const az = maps.azimuthDegMap[j];
        //                 const p = maps.pitch12Map[j];
        //                 const v = azimuthToVector(az);

        //                 secCount[off.sector] += off.w;
        //                 secSumPitch[off.sector] += off.w * p;
        //                 secSumVX[off.sector] += off.w * v.x;
        //                 secSumVZ[off.sector] += off.w * v.z;
        //             }

        //             // ---------- Boundary classification ----------
        //             let bestBoundaryClass = RoofEdgeClass.NONE;
        //             let bestBoundaryScore = 0;

        //             const totalBoundaryW = insideW + outsideW;
        //             const outsideFrac = totalBoundaryW > 0 ? outsideW / totalBoundaryW : 0;

        //             if (mask && outsideFrac >= boundaryOutsideFraction) {
        //                 const nOut = normalize2(outNX, outNZ); // points toward outside
        //                 if (nOut.len > 0) {
        //                     const dot = centerVec.x * nOut.x + centerVec.z * nOut.z;

        //                     // stronger if more outside support and center slope is meaningful
        //                     const outsideScore = clamp01((outsideFrac - boundaryOutsideFraction) / Math.max(1e-6, 1 - boundaryOutsideFraction));
        //                     const slopeScore = clamp01(centerPitch / 8);
        //                     const scoreBase = 0.65 * outsideScore + 0.35 * slopeScore;

        //                     if (dot >= eaveDotThreshold) {
        //                         bestBoundaryClass = RoofEdgeClass.EAVE;
        //                         bestBoundaryScore = scoreBase * clamp01((dot - eaveDotThreshold) / Math.max(1e-6, 1 - eaveDotThreshold));
        //                     } else if (Math.abs(dot) <= gableAbsDotThreshold) {
        //                         bestBoundaryClass = RoofEdgeClass.GABLE;
        //                         bestBoundaryScore = scoreBase * clamp01(1 - Math.abs(dot) / Math.max(1e-6, gableAbsDotThreshold));
        //                     } else {
        //                         bestBoundaryClass = RoofEdgeClass.UNKNOWN_BOUNDARY;
        //                         bestBoundaryScore = scoreBase * 0.5;
        //                     }
        //                 }
        //             }

        //             boundaryScoreMap[i] = bestBoundaryScore;

        //             // ---------- Interior seam classification ----------
        //             let bestSeamClass = RoofEdgeClass.NONE;
        //             let bestSeamScore = 0;

        //             for (let s = 0; s < 4; s++) {
        //                 const o = (s + 4) & 7;

        //                 if (secCount[s] < minSectorSamples || secCount[o] < minSectorSamples) continue;

        //                 const pA = secSumPitch[s] / secCount[s];
        //                 const pB = secSumPitch[o] / secCount[o];

        //                 if (!Number.isFinite(pA) || !Number.isFinite(pB)) continue;
        //                 if (Math.abs(pA - pB) > maxPitchDiff12) continue;

        //                 const vA = normalize2(secSumVX[s], secSumVZ[s]);
        //                 const vB = normalize2(secSumVX[o], secSumVZ[o]);
        //                 if (vA.len === 0 || vB.len === 0) continue;

        //                 const azA = ((Math.atan2(vA.x, vA.z) * 180 / Math.PI) + 360) % 360;
        //                 const azB = ((Math.atan2(vB.x, vB.z) * 180 / Math.PI) + 360) % 360;
        //                 const azSplit = angleDeltaDeg(azA, azB);
        //                 if (azSplit < minAzimuthSplitDeg) continue;

        //                 const dirA = sectorDirs[s];
        //                 const dirB = sectorDirs[o];

        //                 // positive means that side slopes outward toward its own side of the neighborhood
        //                 const awayA = vA.x * dirA.x + vA.z * dirA.z;
        //                 const awayB = vB.x * dirB.x + vB.z * dirB.z;

        //                 const convexScore = Math.min(awayA, awayB);       // ridge/hip candidate
        //                 const concaveScore = Math.min(-awayA, -awayB);    // valley candidate

        //                 const supportScore = clamp01(Math.min(secCount[s], secCount[o]) / Math.max(1e-6, minSectorSamples * 2));
        //                 const azScore = clamp01((azSplit - minAzimuthSplitDeg) / Math.max(1e-6, 180 - minAzimuthSplitDeg));
        //                 const pitchScore = clamp01(1 - Math.abs(pA - pB) / Math.max(1e-6, maxPitchDiff12));
        //                 const fitScore = maps.fitErrorMap
        //                     ? clamp01(centerFit / Math.max(1e-6, fitErrorForSeam))
        //                     : 0.5;

        //                 if (convexScore >= ridgeValleyDotThreshold) {
        //                     let score =
        //                         0.28 * supportScore +
        //                         0.22 * azScore +
        //                         0.20 * pitchScore +
        //                         0.30 * clamp01((convexScore - ridgeValleyDotThreshold) / Math.max(1e-6, 1 - ridgeValleyDotThreshold));

        //                     // seam center usually has a worse local fit
        //                     score = 0.8 * score + 0.2 * fitScore;

        //                     let klass = RoofEdgeClass.RIDGE;

        //                     // Heuristic: convex seam near boundary is more likely a hip than ridge
        //                     if (mask && outsideFrac > 0.05) {
        //                         klass = RoofEdgeClass.HIP;
        //                     }

        //                     if (score > bestSeamScore) {
        //                         bestSeamScore = score;
        //                         bestSeamClass = klass;
        //                     }
        //                 }

        //                 if (concaveScore >= ridgeValleyDotThreshold) {
        //                     let score =
        //                         0.28 * supportScore +
        //                         0.22 * azScore +
        //                         0.20 * pitchScore +
        //                         0.30 * clamp01((concaveScore - ridgeValleyDotThreshold) / Math.max(1e-6, 1 - ridgeValleyDotThreshold));

        //                     score = 0.8 * score + 0.2 * fitScore;

        //                     if (score > bestSeamScore) {
        //                         bestSeamScore = score;
        //                         bestSeamClass = RoofEdgeClass.VALLEY;
        //                     }
        //                 }
        //             }

        //             seamScoreMap[i] = bestSeamScore;

        //             // ---------- Decide final class ----------
        //             // Boundary wins if clearly boundary-like. Otherwise use strongest seam.
        //             if (bestBoundaryScore >= 0.20 && bestBoundaryScore >= bestSeamScore * 1.05) {
        //                 labelMap[i] = bestBoundaryClass;
        //                 strengthMap[i] = bestBoundaryScore;
        //             } else if (bestSeamScore >= 0.20) {
        //                 labelMap[i] = bestSeamClass;
        //                 strengthMap[i] = bestSeamScore;
        //             } else if (bestBoundaryScore >= 0.12) {
        //                 labelMap[i] = bestBoundaryClass;
        //                 strengthMap[i] = bestBoundaryScore;
        //             }
        //         }
        //     }

        //     return {
        //         labelMap,
        //         strengthMap,
        //         seamScoreMap,
        //         boundaryScoreMap,
        //     };
        // }

        // const enum RoofEdgeClass {
        //     NONE = 0,
        //     EAVE = 1,
        //     GABLE = 2,
        //     RIDGE = 3,
        //     HIP = 4,
        //     VALLEY = 5,
        //     SEAM = 6,
        //     UNKNOWN_BOUNDARY = 7,
        // }

        // type AdaptiveQuantizedRoofMapsLike = {
        //     pitch12Map: ArrayLike<number>;
        //     azimuthDegMap: ArrayLike<number>;
        //     valid: ArrayLike<number>;

        //     trusted?: ArrayLike<number>;
        //     confidenceMap?: ArrayLike<number>;
        //     fitErrorMap?: ArrayLike<number>;
        //     chosenRadiusMap?: ArrayLike<number>;
        //     riseAcrossRadiusMap?: ArrayLike<number>;
        // };

        // type ClassifiedRoofEdges = {
        //     labelMap: Uint8Array;
        //     strengthMap: Float32Array;
        //     seamScoreMap: Float32Array;
        //     boundaryScoreMap: Float32Array;
        // };

        // type ClassifyAdaptiveRoofEdges5x5Options = {
        //     mask?: ArrayLike<number> | null;

        //     candidateRadii?: number[];             // default [2,3,4,5,7,9,12]
        //     preferTrusted?: boolean;               // default true
        //     minPitch12?: number;                   // default 1.5
        //     minConfidenceForNeighbor?: number;     // default 0.20

        //     minSectorVoteWeight?: number;          // default 1.0
        //     minAzimuthSplitDegSmall?: number;      // default 16
        //     minAzimuthSplitDegLarge?: number;      // default 26
        //     maxPitchDiff12?: number;               // default 3.0

        //     ridgeValleyDotThreshold?: number;      // default 0.45
        //     eaveDotThresholdSmall?: number;        // default 0.50
        //     eaveDotThresholdLarge?: number;        // default 0.60
        //     gableAbsDotThreshold?: number;         // default 0.30

        //     boundaryOutsideFractionSmall?: number; // default 0.16
        //     boundaryOutsideFractionLarge?: number; // default 0.28

        //     fitErrorForSeam?: number;              // default 1.25
        //     hipBoundaryFraction?: number;          // default 0.10
        // };

        // // function clamp01(v: number): number {
        // //     return v <= 0 ? 0 : v >= 1 ? 1 : v;
        // // }

        // function lerp(a: number, b: number, t: number): number {
        //     return a + (b - a) * t;
        // }

        // function angleDeltaDeg(a: number, b: number): number {
        //     let d = Math.abs(a - b) % 360;
        //     if (d > 180) d = 360 - d;
        //     return d;
        // }

        // function azimuthToVector(azDeg: number): { x: number; z: number } {
        //     const r = azDeg * Math.PI / 180;
        //     // 0° = +Z, 90° = +X
        //     return { x: Math.sin(r), z: Math.cos(r) };
        // }

        // function normalize2(x: number, z: number): { x: number; z: number; len: number } {
        //     const len = Math.hypot(x, z);
        //     if (len <= 1e-12) return { x: 0, z: 0, len: 0 };
        //     return { x: x / len, z: z / len, len };
        // }

        /**
         * 5x5 local roof-edge classifier tuned for adaptive multi-radius plane maps.
         *
         * Uses:
         * - azimuth + pitch as the main seam signal
         * - fitError to strengthen seam centers
         * - confidence + chosenRadius to prevent over-smoothed large-radius estimates
         *   from overpowering sharper local evidence
         *
         * Output is still local/heuristic:
         * - EAVE / GABLE are usually strong if mask is good
         * - VALLEY is usually strong
         * - RIDGE vs HIP is still partly heuristic in a 5x5 window
         */
        // function classifyLocalRoofEdges5x5FromAdaptiveMaps(
        //     maps: AdaptiveQuantizedRoofMapsLike,
        //     width: number,
        //     height: number,
        //     options: ClassifyAdaptiveRoofEdges5x5Options = {}
        // ): ClassifiedRoofEdges {
        //     const {
        //         mask = null,

        //         candidateRadii = [2, 3, 4, 5, 7, 9, 12],
        //         preferTrusted = true,
        //         minPitch12 = 1.5,
        //         minConfidenceForNeighbor = 0.20,

        //         minSectorVoteWeight = 1.0,
        //         minAzimuthSplitDegSmall = 16,
        //         minAzimuthSplitDegLarge = 26,
        //         maxPitchDiff12 = 3.0,

        //         ridgeValleyDotThreshold = 0.45,
        //         eaveDotThresholdSmall = 0.50,
        //         eaveDotThresholdLarge = 0.60,
        //         gableAbsDotThreshold = 0.30,

        //         boundaryOutsideFractionSmall = 0.16,
        //         boundaryOutsideFractionLarge = 0.28,

        //         fitErrorForSeam = 1.25,
        //         hipBoundaryFraction = 0.10,
        //     } = options;

        //     const n = width * height;
        //     if (maps.pitch12Map.length !== n) throw new Error("pitch12Map length mismatch");
        //     if (maps.azimuthDegMap.length !== n) throw new Error("azimuthDegMap length mismatch");
        //     if (maps.valid.length !== n) throw new Error("valid length mismatch");
        //     if (mask && mask.length !== n) throw new Error("mask length mismatch");
        //     if (maps.trusted && maps.trusted.length !== n) throw new Error("trusted length mismatch");
        //     if (maps.confidenceMap && maps.confidenceMap.length !== n) throw new Error("confidenceMap length mismatch");
        //     if (maps.fitErrorMap && maps.fitErrorMap.length !== n) throw new Error("fitErrorMap length mismatch");
        //     if (maps.chosenRadiusMap && maps.chosenRadiusMap.length !== n) throw new Error("chosenRadiusMap length mismatch");

        //     const labelMap = new Uint8Array(n);
        //     const strengthMap = new Float32Array(n);
        //     const seamScoreMap = new Float32Array(n);
        //     const boundaryScoreMap = new Float32Array(n);

        //     const minRadius = Math.min(...candidateRadii);
        //     const maxRadius = Math.max(...candidateRadii);
        //     const radiusRange = Math.max(1, maxRadius - minRadius);

        //     // 8 directional sectors around center
        //     const sectorDirs = [
        //         { x: 1, z: 0 },                                // E
        //         { x: Math.SQRT1_2, z: Math.SQRT1_2 },          // SE
        //         { x: 0, z: 1 },                                // S (+Z)
        //         { x: -Math.SQRT1_2, z: Math.SQRT1_2 },         // SW
        //         { x: -1, z: 0 },                               // W
        //         { x: -Math.SQRT1_2, z: -Math.SQRT1_2 },        // NW
        //         { x: 0, z: -1 },                               // N (-Z)
        //         { x: Math.SQRT1_2, z: -Math.SQRT1_2 },         // NE
        //     ];

        //     type Off = { dx: number; dz: number; dist: number; sector: number; w: number };
        //     const offsets: Off[] = [];

        //     for (let dz = -2; dz <= 2; dz++) {
        //         for (let dx = -2; dx <= 2; dx++) {
        //             if (dx === 0 && dz === 0) continue;
        //             const dist = Math.hypot(dx, dz);
        //             if (dist > 2.5) continue;

        //             let ang = Math.atan2(dz, dx); // 0=+X
        //             if (ang < 0) ang += 2 * Math.PI;
        //             let sector = Math.round((ang / (2 * Math.PI)) * 8) % 8;

        //             offsets.push({
        //                 dx,
        //                 dz,
        //                 dist,
        //                 sector,
        //                 w: 1 / dist,
        //             });
        //         }
        //     }

        //     function getConfidence(i: number): number {
        //         return maps.confidenceMap ? clamp01(maps.confidenceMap[i]) : 1;
        //     }

        //     function getChosenRadius(i: number): number {
        //         if (!maps.chosenRadiusMap) return maxRadius;
        //         const r = maps.chosenRadiusMap[i];
        //         return r > 0 ? r : maxRadius;
        //     }

        //     function isUsable(i: number): boolean {
        //         if (!maps.valid[i]) return false;
        //         if (preferTrusted && maps.trusted && !maps.trusted[i]) return false;

        //         const p = maps.pitch12Map[i];
        //         const az = maps.azimuthDegMap[i];
        //         if (!Number.isFinite(p) || p < minPitch12) return false;
        //         if (!Number.isFinite(az)) return false;

        //         if (maps.confidenceMap && maps.confidenceMap[i] < minConfidenceForNeighbor) return false;
        //         return true;
        //     }

        //     for (let z = 0; z < height; z++) {
        //         const rowBase = z * width;

        //         for (let x = 0; x < width; x++) {
        //             const i = rowBase + x;
        //             if (mask && mask[i] === 0) continue;
        //             if (!isUsable(i)) continue;

        //             const centerPitch = maps.pitch12Map[i];
        //             const centerAz = maps.azimuthDegMap[i];
        //             const centerVec = azimuthToVector(centerAz);
        //             const centerConf = getConfidence(i);
        //             const centerFit = maps.fitErrorMap ? maps.fitErrorMap[i] : 0;
        //             const centerRadius = getChosenRadius(i);
        //             const centerRadiusNorm = clamp01((centerRadius - minRadius) / radiusRange);

        //             const minAzimuthSplitDeg = lerp(
        //                 minAzimuthSplitDegSmall,
        //                 minAzimuthSplitDegLarge,
        //                 centerRadiusNorm
        //             );
        //             const eaveDotThreshold = lerp(
        //                 eaveDotThresholdSmall,
        //                 eaveDotThresholdLarge,
        //                 centerRadiusNorm
        //             );
        //             const boundaryOutsideFraction = lerp(
        //                 boundaryOutsideFractionSmall,
        //                 boundaryOutsideFractionLarge,
        //                 centerRadiusNorm
        //             );

        //             // sector accumulators
        //             const secCount = new Float32Array(8);
        //             const secSumPitch = new Float32Array(8);
        //             const secSumVX = new Float32Array(8);
        //             const secSumVZ = new Float32Array(8);
        //             const secSumRadius = new Float32Array(8);

        //             // geometry-only boundary support
        //             let insideGeoW = 0;
        //             let outsideGeoW = 0;
        //             let outNX = 0;
        //             let outNZ = 0;

        //             for (const off of offsets) {
        //                 const nx = x + off.dx;
        //                 const nz = z + off.dz;

        //                 if (nx < 0 || nx >= width || nz < 0 || nz >= height) {
        //                     outsideGeoW += off.w;
        //                     outNX += off.w * off.dx;
        //                     outNZ += off.w * off.dz;
        //                     continue;
        //                 }

        //                 const j = nz * width + nx;

        //                 if (mask && mask[j] === 0) {
        //                     outsideGeoW += off.w;
        //                     outNX += off.w * off.dx;
        //                     outNZ += off.w * off.dz;
        //                     continue;
        //                 }

        //                 insideGeoW += off.w;

        //                 if (!isUsable(j)) continue;

        //                 const neighborConf = getConfidence(j);
        //                 const neighborRadius = getChosenRadius(j);
        //                 const neighborRadiusNorm = clamp01((neighborRadius - minRadius) / radiusRange);

        //                 // scale compatibility: do not let very different support sizes overrule each other
        //                 const radiusDiffNorm = clamp01(Math.abs(centerRadius - neighborRadius) / radiusRange);
        //                 const scaleCompatibility = 1 - 0.55 * radiusDiffNorm;

        //                 // favor more local estimates slightly
        //                 const localityWeight = 1 - 0.30 * neighborRadiusNorm;

        //                 const voteW = off.w * (0.25 + 0.75 * neighborConf) * scaleCompatibility * localityWeight;

        //                 const az = maps.azimuthDegMap[j];
        //                 const p = maps.pitch12Map[j];
        //                 const v = azimuthToVector(az);

        //                 secCount[off.sector] += voteW;
        //                 secSumPitch[off.sector] += voteW * p;
        //                 secSumVX[off.sector] += voteW * v.x;
        //                 secSumVZ[off.sector] += voteW * v.z;
        //                 secSumRadius[off.sector] += voteW * neighborRadius;
        //             }

        //             // ---------- Boundary classification ----------
        //             let bestBoundaryClass = RoofEdgeClass.NONE;
        //             let bestBoundaryScore = 0;

        //             const totalGeoW = insideGeoW + outsideGeoW;
        //             const outsideFrac = totalGeoW > 0 ? outsideGeoW / totalGeoW : 0;

        //             if (mask && outsideFrac >= boundaryOutsideFraction) {
        //                 const nOut = normalize2(outNX, outNZ); // points toward outside

        //                 if (nOut.len > 0) {
        //                     const dot = centerVec.x * nOut.x + centerVec.z * nOut.z;

        //                     const outsideScore = clamp01(
        //                         (outsideFrac - boundaryOutsideFraction) /
        //                         Math.max(1e-6, 1 - boundaryOutsideFraction)
        //                     );
        //                     const slopeScore = clamp01(centerPitch / 8);
        //                     const localityScore = 1 - 0.35 * centerRadiusNorm;

        //                     const scoreBase =
        //                         0.40 * outsideScore +
        //                         0.20 * slopeScore +
        //                         0.20 * centerConf +
        //                         0.20 * localityScore;

        //                     if (dot >= eaveDotThreshold) {
        //                         bestBoundaryClass = RoofEdgeClass.EAVE;
        //                         bestBoundaryScore =
        //                             scoreBase *
        //                             clamp01((dot - eaveDotThreshold) / Math.max(1e-6, 1 - eaveDotThreshold));
        //                     } else if (Math.abs(dot) <= gableAbsDotThreshold) {
        //                         bestBoundaryClass = RoofEdgeClass.GABLE;
        //                         bestBoundaryScore =
        //                             scoreBase *
        //                             clamp01(1 - Math.abs(dot) / Math.max(1e-6, gableAbsDotThreshold));
        //                     } else {
        //                         bestBoundaryClass = RoofEdgeClass.UNKNOWN_BOUNDARY;
        //                         bestBoundaryScore = scoreBase * 0.5;
        //                     }
        //                 }
        //             }

        //             boundaryScoreMap[i] = bestBoundaryScore;

        //             // ---------- Interior seam classification ----------
        //             let bestSeamClass = RoofEdgeClass.NONE;
        //             let bestSeamScore = 0;

        //             for (let s = 0; s < 4; s++) {
        //                 const o = (s + 4) & 7;

        //                 if (secCount[s] < minSectorVoteWeight || secCount[o] < minSectorVoteWeight) continue;

        //                 const pA = secSumPitch[s] / secCount[s];
        //                 const pB = secSumPitch[o] / secCount[o];
        //                 if (!Number.isFinite(pA) || !Number.isFinite(pB)) continue;
        //                 if (Math.abs(pA - pB) > maxPitchDiff12) continue;

        //                 const vA = normalize2(secSumVX[s], secSumVZ[s]);
        //                 const vB = normalize2(secSumVX[o], secSumVZ[o]);
        //                 if (vA.len === 0 || vB.len === 0) continue;

        //                 const azA = ((Math.atan2(vA.x, vA.z) * 180 / Math.PI) + 360) % 360;
        //                 const azB = ((Math.atan2(vB.x, vB.z) * 180 / Math.PI) + 360) % 360;
        //                 const azSplit = angleDeltaDeg(azA, azB);
        //                 if (azSplit < minAzimuthSplitDeg) continue;

        //                 const rA = secSumRadius[s] / secCount[s];
        //                 const rB = secSumRadius[o] / secCount[o];
        //                 const scalePairScore = 1 - clamp01(Math.abs(rA - rB) / radiusRange);

        //                 const dirA = sectorDirs[s];
        //                 const dirB = sectorDirs[o];

        //                 // positive => each side slopes outward toward its own side
        //                 const awayA = vA.x * dirA.x + vA.z * dirA.z;
        //                 const awayB = vB.x * dirB.x + vB.z * dirB.z;

        //                 const convexScore = Math.min(awayA, awayB);       // ridge / hip candidate
        //                 const concaveScore = Math.min(-awayA, -awayB);    // valley candidate

        //                 const supportScore = clamp01(
        //                     Math.min(secCount[s], secCount[o]) / Math.max(1e-6, minSectorVoteWeight * 2)
        //                 );
        //                 const azScore = clamp01(
        //                     (azSplit - minAzimuthSplitDeg) /
        //                     Math.max(1e-6, 180 - minAzimuthSplitDeg)
        //                 );
        //                 const pitchScore = clamp01(
        //                     1 - Math.abs(pA - pB) / Math.max(1e-6, maxPitchDiff12)
        //                 );
        //                 const fitScore = maps.fitErrorMap
        //                     ? clamp01(centerFit / Math.max(1e-6, fitErrorForSeam))
        //                     : 0.5;

        //                 if (convexScore >= ridgeValleyDotThreshold) {
        //                     let score =
        //                         0.22 * supportScore +
        //                         0.18 * azScore +
        //                         0.16 * pitchScore +
        //                         0.12 * scalePairScore +
        //                         0.14 * centerConf +
        //                         0.18 * clamp01(
        //                             (convexScore - ridgeValleyDotThreshold) /
        //                             Math.max(1e-6, 1 - ridgeValleyDotThreshold)
        //                         );

        //                     // seam centers often have a worse local plane fit
        //                     score = 0.85 * score + 0.15 * fitScore;

        //                     let klass = RoofEdgeClass.RIDGE;

        //                     // local heuristic only
        //                     if (mask && outsideFrac >= hipBoundaryFraction) {
        //                         klass = RoofEdgeClass.HIP;
        //                     }

        //                     if (score > bestSeamScore) {
        //                         bestSeamScore = score;
        //                         bestSeamClass = klass;
        //                     }
        //                 }

        //                 if (concaveScore >= ridgeValleyDotThreshold) {
        //                     let score =
        //                         0.22 * supportScore +
        //                         0.18 * azScore +
        //                         0.16 * pitchScore +
        //                         0.12 * scalePairScore +
        //                         0.14 * centerConf +
        //                         0.18 * clamp01(
        //                             (concaveScore - ridgeValleyDotThreshold) /
        //                             Math.max(1e-6, 1 - ridgeValleyDotThreshold)
        //                         );

        //                     score = 0.85 * score + 0.15 * fitScore;

        //                     if (score > bestSeamScore) {
        //                         bestSeamScore = score;
        //                         bestSeamClass = RoofEdgeClass.VALLEY;
        //                     }
        //                 }
        //             }

        //             seamScoreMap[i] = bestSeamScore;

        //             // ---------- Final decision ----------
        //             if (bestBoundaryScore >= 0.20 && bestBoundaryScore >= bestSeamScore * 1.05) {
        //                 labelMap[i] = bestBoundaryClass;
        //                 strengthMap[i] = bestBoundaryScore;
        //             } else if (bestSeamScore >= 0.20) {
        //                 labelMap[i] = bestSeamClass;
        //                 strengthMap[i] = bestSeamScore;
        //             } else if (bestBoundaryScore >= 0.12) {
        //                 labelMap[i] = bestBoundaryClass;
        //                 strengthMap[i] = bestBoundaryScore;
        //             }
        //         }
        //     }

        //     return {
        //         labelMap,
        //         strengthMap,
        //         seamScoreMap,
        //         boundaryScoreMap,
        //     };
        // }


























































        type ExpandPredicate = (
            owner: number,
            fromIndex: number,
            toIndex: number,
            labels: Int32Array,
            distanceFromSeed: Int32Array
        ) => boolean;

        type ExpandOptions = {
            circular?: boolean;
            neighborhood?: "3x3" | "5x5";
            maxSteps?: number;
        };

        type ExpandResult = {
            labels: Int32Array;
            distance: Int32Array;
        };

        function expandLabelsByPredicate(
            data: any[],
            width: number,
            height: number,
            initialLabels: Int32Array | number[],
            predicate: ExpandPredicate,
            options: ExpandOptions = {}
        ): ExpandResult {
            const {
                circular = false,
                neighborhood = "5x5",
                maxSteps = Infinity
            } = options;

            const size = width * height;
            const labels = Int32Array.from(initialLabels);
            const distance = new Int32Array(size);
            distance.fill(-1);

            // Build neighborhood offsets
            const offsets: [number, number][] = [];
            const radius = neighborhood === "5x5" ? 2 : 1;

            for (let dz = -radius; dz <= radius; dz++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx === 0 && dz === 0) continue;
                    offsets.push([dx, dz]);
                }
            }

            // Queue for multi-source BFS
            const queue = new Int32Array(size);
            let qHead = 0;
            let qTail = 0;

            // Seed queue with all already-labeled pixels
            for (let i = 0; i < size; i++) {
                if (labels[i] !== -1) {
                    queue[qTail++] = i;
                    distance[i] = 0;
                }
            }

            while (qHead < qTail) {
                const fromIndex = queue[qHead++];
                const owner = labels[fromIndex];
                if (owner === -1) continue;

                const fromDist = distance[fromIndex];
                if (fromDist >= maxSteps) continue;

                const x = fromIndex % width;
                const y = (fromIndex / width) | 0;

                for (let k = 0; k < offsets.length; k++) {
                    let nx = x + offsets[k][0];
                    let ny = y + offsets[k][1];

                    if (circular) {
                        nx = (nx + width) % width;
                        ny = (ny + height) % height;
                    } else {
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    }

                    const toIndex = ny * width + nx;

                    // Already claimed: do not overwrite
                    if (labels[toIndex] !== -1) continue;

                    // Optional data existence check
                    if (!data[toIndex]) continue;

                    if (!predicate(owner, fromIndex, toIndex, labels, distance)) continue;

                    labels[toIndex] = owner;
                    distance[toIndex] = fromDist + 1;
                    queue[qTail++] = toIndex;
                }
            }

            return { labels, distance };
        }




































































        // type CircularStencil = {
        //     radiusPixels: number;
        //     cellSizeX: number;
        //     cellSizeZ: number;
        //     dx: Int16Array;      // pixel offsets
        //     dz: Int16Array;      // pixel offsets
        //     ox: Float32Array;    // world offsets
        //     oz: Float32Array;    // world offsets
        //     w: Float32Array;     // spatial weights
        //     count: number;
        // };

        // type ComputeCircularMapsOptions = {
        //     radius?: number;
        //     cellSizeX?: number;
        //     cellSizeZ?: number;
        //     distanceWeightPower?: number;   // 0 = uniform, 1 = 1/d, 2 = 1/d^2
        //     minNeighbors?: number;
        //     minSlopeDegForAzimuth?: number;
        //     computeFitError?: boolean;
        //     noData?: number;
        //     mask?: ArrayLike<number> | null;
        //     stencil?: CircularStencil;
        // };

        // type CircularMaps = {
        //     slopeDegMap: Float32Array;
        //     pitch12Map: Float32Array;
        //     azimuthDegMap: Float32Array;
        //     dYdXMap: Float32Array;
        //     dYdZMap: Float32Array;
        //     fitErrorMap: Float32Array;
        //     samplesUsedMap: Uint16Array;
        //     valid: Uint8Array;
        //     stencil: CircularStencil;
        // };

        // const RAD2DEG = 180 / Math.PI;
        // const DEG2RAD = Math.PI / 180;

        // function createCircularStencil(
        //     radiusPixels: number,
        //     cellSizeX = 1,
        //     cellSizeZ = 1,
        //     distanceWeightPower = 1
        // ): CircularStencil {
        //     const dxs: number[] = [];
        //     const dzs: number[] = [];
        //     const oxs: number[] = [];
        //     const ozs: number[] = [];
        //     const ws: number[] = [];

        //     const r2 = radiusPixels * radiusPixels;
        //     const weightPow = 0.5 * distanceWeightPower;

        //     for (let dz = -radiusPixels; dz <= radiusPixels; dz++) {
        //         for (let dx = -radiusPixels; dx <= radiusPixels; dx++) {
        //             const pixelD2 = dx * dx + dz * dz;
        //             if (pixelD2 === 0 || pixelD2 > r2) continue;

        //             const ox = dx * cellSizeX;
        //             const oz = dz * cellSizeZ;
        //             const worldD2 = ox * ox + oz * oz;

        //             const w = distanceWeightPower === 0
        //                 ? 1
        //                 : 1 / Math.pow(worldD2, weightPow);

        //             dxs.push(dx);
        //             dzs.push(dz);
        //             oxs.push(ox);
        //             ozs.push(oz);
        //             ws.push(w);
        //         }
        //     }

        //     return {
        //         radiusPixels,
        //         cellSizeX,
        //         cellSizeZ,
        //         dx: Int16Array.from(dxs),
        //         dz: Int16Array.from(dzs),
        //         ox: Float32Array.from(oxs),
        //         oz: Float32Array.from(ozs),
        //         w: Float32Array.from(ws),
        //         count: dxs.length,
        //     };
        // }

        // /**
        //  * Computes local slope + azimuth using a weighted circular neighborhood.
        //  *
        //  * Model:
        //  *   dh ~= gx * ox + gz * oz
        //  *
        //  * where:
        //  *   gx = dY/dX
        //  *   gz = dY/dZ
        //  *
        //  * This is a local gradient solve over a disk, not a final roof-plane grouping step.
        //  *
        //  * Azimuth convention used here:
        //  *   0° = +Z
        //  *   90° = +X
        //  *   180° = -Z
        //  *   270° = -X
        //  * and it points DOWNSLOPE.
        //  */
        // function computeLocalCircularMaps(
        //     heights: ArrayLike<number>,
        //     width: number,
        //     height: number,
        //     options: ComputeCircularMapsOptions = {}
        // ): CircularMaps {
        //     const {
        //         radius = 4,
        //         cellSizeX = 1,
        //         cellSizeZ = 1,
        //         distanceWeightPower = 1,
        //         minNeighbors = 8,
        //         minSlopeDegForAzimuth = 2,
        //         computeFitError = true,
        //         noData,
        //         mask = null,
        //         stencil = createCircularStencil(radius, cellSizeX, cellSizeZ, distanceWeightPower),
        //     } = options;

        //     const n = width * height;
        //     if (heights.length !== n) {
        //         throw new Error(`heights.length (${heights.length}) must equal width*height (${n})`);
        //     }
        //     if (mask && mask.length !== n) {
        //         throw new Error(`mask.length (${mask.length}) must equal width*height (${n})`);
        //     }

        //     const slopeDegMap = new Float32Array(n);
        //     const pitch12Map = new Float32Array(n);
        //     const azimuthDegMap = new Float32Array(n);
        //     const dYdXMap = new Float32Array(n);
        //     const dYdZMap = new Float32Array(n);
        //     const fitErrorMap = new Float32Array(n);
        //     const samplesUsedMap = new Uint16Array(n);
        //     const valid = new Uint8Array(n);

        //     slopeDegMap.fill(NaN);
        //     pitch12Map.fill(NaN);
        //     azimuthDegMap.fill(NaN);
        //     dYdXMap.fill(NaN);
        //     dYdZMap.fill(NaN);
        //     fitErrorMap.fill(NaN);

        //     const dxs = stencil.dx;
        //     const dzs = stencil.dz;
        //     const oxs = stencil.ox;
        //     const ozs = stencil.oz;
        //     const ws = stencil.w;
        //     const kCount = stencil.count;

        //     const hasNoData = noData !== undefined;

        //     for (let z = 0; z < height; z++) {
        //         const rowBase = z * width;

        //         for (let x = 0; x < width; x++) {
        //             const i = rowBase + x;
        //             const h0 = heights[i];

        //             if (!Number.isFinite(h0)) continue;
        //             if (hasNoData && h0 === noData) continue;
        //             if (mask && mask[i] === 0) continue;

        //             let sxx = 0;
        //             let sxz = 0;
        //             let szz = 0;
        //             let bx = 0;
        //             let bz = 0;
        //             let wsum = 0;
        //             let count = 0;

        //             // First pass: solve local gradient over a circular neighborhood
        //             for (let k = 0; k < kCount; k++) {
        //                 const nx = x + dxs[k];
        //                 if (nx < 0 || nx >= width) continue;

        //                 const nz = z + dzs[k];
        //                 if (nz < 0 || nz >= height) continue;

        //                 const j = nz * width + nx;
        //                 const hj = heights[j];

        //                 if (!Number.isFinite(hj)) continue;
        //                 if (hasNoData && hj === noData) continue;
        //                 if (mask && mask[j] === 0) continue;

        //                 const dh = hj - h0;
        //                 const ox = oxs[k];
        //                 const oz = ozs[k];
        //                 const w = ws[k];

        //                 sxx += w * ox * ox;
        //                 sxz += w * ox * oz;
        //                 szz += w * oz * oz;
        //                 bx += w * ox * dh;
        //                 bz += w * oz * dh;
        //                 wsum += w;
        //                 count++;
        //             }

        //             if (count < minNeighbors) continue;

        //             const det = sxx * szz - sxz * sxz;
        //             if (Math.abs(det) < 1e-12) continue;

        //             const gx = (bx * szz - bz * sxz) / det;
        //             const gz = (bz * sxx - bx * sxz) / det;

        //             dYdXMap[i] = gx;
        //             dYdZMap[i] = gz;
        //             samplesUsedMap[i] = count;
        //             valid[i] = 1;

        //             const gradMag = Math.hypot(gx, gz);
        //             const slopeRad = Math.atan(gradMag);
        //             const slopeDeg = slopeRad * RAD2DEG;
        //             const pitch12 = 12 * Math.tan(slopeRad);

        //             slopeDegMap[i] = slopeDeg;
        //             pitch12Map[i] = pitch12;

        //             // Downslope azimuth
        //             if (slopeDeg >= minSlopeDegForAzimuth) {
        //                 const vx = -gx;
        //                 const vz = -gz;
        //                 let az = Math.atan2(vx, vz) * RAD2DEG; // 0° at +Z, clockwise
        //                 if (az < 0) az += 360;
        //                 azimuthDegMap[i] = az;
        //             }

        //             if (computeFitError) {
        //                 let rss = 0;

        //                 for (let k = 0; k < kCount; k++) {
        //                     const nx = x + dxs[k];
        //                     if (nx < 0 || nx >= width) continue;

        //                     const nz = z + dzs[k];
        //                     if (nz < 0 || nz >= height) continue;

        //                     const j = nz * width + nx;
        //                     const hj = heights[j];

        //                     if (!Number.isFinite(hj)) continue;
        //                     if (hasNoData && hj === noData) continue;
        //                     if (mask && mask[j] === 0) continue;

        //                     const dh = hj - h0;
        //                     const ox = oxs[k];
        //                     const oz = ozs[k];
        //                     const w = ws[k];

        //                     const predicted = gx * ox + gz * oz;
        //                     const err = dh - predicted;
        //                     rss += w * err * err;
        //                 }

        //                 fitErrorMap[i] = Math.sqrt(rss / wsum);
        //             }
        //         }
        //     }

        //     return {
        //         slopeDegMap,
        //         pitch12Map,
        //         azimuthDegMap,
        //         dYdXMap,
        //         dYdZMap,
        //         fitErrorMap,
        //         samplesUsedMap,
        //         valid,
        //         stencil,
        //     };
        // }

        type CircularStencilQ = {
            radiusPixels: number;
            cellSizeX: number;
            cellSizeZ: number;
            dx: Int16Array;
            dz: Int16Array;
            ox: Float32Array;
            oz: Float32Array;
            w: Float32Array;
            sector: Uint8Array;
            count: number;
            maxDistance: number;
            sectorCount: number;
        };

        type QuantizedRoofMaps = {
            slopeDegMap: Float32Array;
            pitch12Map: Float32Array;
            azimuthDegMap: Float32Array;
            dYdXMap: Float32Array;
            dYdZMap: Float32Array;
            interceptMap: Float32Array;
            fitErrorMap: Float32Array;          // weighted RMS residual, in height units (dm here)
            riseAcrossRadiusMap: Float32Array;  // expected rise from center to disk edge, in dm
            confidenceMap: Float32Array;        // 0..1
            samplesUsedMap: Uint16Array;
            sectorsUsedMap: Uint8Array;
            valid: Uint8Array;                  // solvable fit
            trusted: Uint8Array;                // good enough to use downstream
            stencil: CircularStencilQ;
        };

        type ComputeQuantizedRoofMapsOptions = {
            radius?: number;                    // default 7 for 1 dm integer DSMs
            cellSizeX?: number;                 // default 1 dm
            cellSizeZ?: number;                 // default 1 dm
            distanceWeightPower?: number;       // 0=uniform, 1=1/d, 2=1/d^2
            sectorCount?: number;               // default 8
            minNeighbors?: number;              // default 24
            minSectors?: number;                // default 6
            minSlopeDegForAzimuth?: number;     // default 3
            minRiseAcrossRadiusDm?: number;     // default 2
            robustResidualDm?: number;          // default 1.5
            robustPasses?: number;              // default 1
            minConfidence?: number;             // default 0.45
            noData?: number;
            mask?: ArrayLike<number> | null;
            stencil?: CircularStencilQ;
        };

        function createCircularStencilQ(
            radiusPixels: number,
            cellSizeX = 1,
            cellSizeZ = 1,
            distanceWeightPower = 1,
            sectorCount = 8
        ): CircularStencilQ {
            const dxs: number[] = [];
            const dzs: number[] = [];
            const oxs: number[] = [];
            const ozs: number[] = [];
            const ws: number[] = [];
            const sectors: number[] = [];

            const r2 = radiusPixels * radiusPixels;
            let maxDistance = 0;

            for (let dz = -radiusPixels; dz <= radiusPixels; dz++) {
                for (let dx = -radiusPixels; dx <= radiusPixels; dx++) {
                    const pixelD2 = dx * dx + dz * dz;
                    if (pixelD2 === 0 || pixelD2 > r2) continue;

                    const ox = dx * cellSizeX;
                    const oz = dz * cellSizeZ;
                    const d = Math.hypot(ox, oz);
                    if (d <= 0) continue;

                    const w = distanceWeightPower === 0
                        ? 1
                        : 1 / Math.pow(d, distanceWeightPower);

                    let ang = Math.atan2(oz, ox); // [-pi, pi], 0 along +X
                    if (ang < 0) ang += 2 * Math.PI;
                    let sector = Math.floor((ang / (2 * Math.PI)) * sectorCount);
                    if (sector >= sectorCount) sector = sectorCount - 1;

                    dxs.push(dx);
                    dzs.push(dz);
                    oxs.push(ox);
                    ozs.push(oz);
                    ws.push(w);
                    sectors.push(sector);

                    if (d > maxDistance) maxDistance = d;
                }
            }

            return {
                radiusPixels,
                cellSizeX,
                cellSizeZ,
                dx: Int16Array.from(dxs),
                dz: Int16Array.from(dzs),
                ox: Float32Array.from(oxs),
                oz: Float32Array.from(ozs),
                w: Float32Array.from(ws),
                sector: Uint8Array.from(sectors),
                count: dxs.length,
                maxDistance,
                sectorCount,
            };
        }

        function computeQuantizedLocalRoofMaps(
            heights: ArrayLike<number>,
            width: number,
            height: number,
            options: ComputeQuantizedRoofMapsOptions = {}
        ): QuantizedRoofMaps {
            const {
                radius = 7,
                cellSizeX = 1,
                cellSizeZ = 1,
                distanceWeightPower = 1,
                sectorCount = 8,
                minNeighbors = 24,
                minSectors = 6,
                minSlopeDegForAzimuth = 3,
                minRiseAcrossRadiusDm = 2,
                robustResidualDm = 1.5,
                robustPasses = 1,
                minConfidence = 0.45,
                noData,
                mask = null,
                stencil = createCircularStencilQ(radius, cellSizeX, cellSizeZ, distanceWeightPower, sectorCount),
            } = options;

            const n = width * height;
            if (heights.length !== n) throw new Error(`heights.length must equal width*height`);
            if (mask && mask.length !== n) throw new Error(`mask.length must equal width*height`);

            const slopeDegMap = new Float32Array(n);
            const pitch12Map = new Float32Array(n);
            const azimuthDegMap = new Float32Array(n);
            const dYdXMap = new Float32Array(n);
            const dYdZMap = new Float32Array(n);
            const interceptMap = new Float32Array(n);
            const fitErrorMap = new Float32Array(n);
            const riseAcrossRadiusMap = new Float32Array(n);
            const confidenceMap = new Float32Array(n);
            const samplesUsedMap = new Uint16Array(n);
            const sectorsUsedMap = new Uint8Array(n);
            const valid = new Uint8Array(n);
            const trusted = new Uint8Array(n);

            slopeDegMap.fill(NaN);
            pitch12Map.fill(NaN);
            azimuthDegMap.fill(NaN);
            dYdXMap.fill(NaN);
            dYdZMap.fill(NaN);
            interceptMap.fill(NaN);
            fitErrorMap.fill(NaN);
            riseAcrossRadiusMap.fill(NaN);
            confidenceMap.fill(0);

            const hasNoData = noData !== undefined;

            const dxs = stencil.dx;
            const dzs = stencil.dz;
            const oxs = stencil.ox;
            const ozs = stencil.oz;
            const baseW = stencil.w;
            const sectors = stencil.sector;
            const kCount = stencil.count;

            for (let z = 0; z < height; z++) {
                const rowBase = z * width;

                for (let x = 0; x < width; x++) {
                    const i = rowBase + x;
                    const hCenter = heights[i];

                    if (!Number.isFinite(hCenter)) continue;
                    if (hasNoData && hCenter === noData) continue;
                    if (mask && mask[i] === 0) continue;

                    let count = 0;
                    let sectorMask = 0;

                    let sumW = 0;
                    let meanX = 0;
                    let meanZ = 0;
                    let meanH = 0;

                    // pass 1: weighted means + sector coverage
                    for (let k = 0; k < kCount; k++) {
                        const nx = x + dxs[k];
                        const nz = z + dzs[k];
                        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                        const j = nz * width + nx;
                        const hj = heights[j];
                        if (!Number.isFinite(hj)) continue;
                        if (hasNoData && hj === noData) continue;
                        if (mask && mask[j] === 0) continue;

                        const w = baseW[k];
                        const ox = oxs[k];
                        const oz = ozs[k];

                        sumW += w;
                        meanX += w * ox;
                        meanZ += w * oz;
                        meanH += w * hj;
                        count++;

                        sectorMask |= (1 << sectors[k]);
                    }

                    if (count < minNeighbors || sumW <= 0) continue;

                    let sectorsHit = 0;
                    for (let s = 0; s < stencil.sectorCount; s++) {
                        if (sectorMask & (1 << s)) sectorsHit++;
                    }

                    samplesUsedMap[i] = count;
                    sectorsUsedMap[i] = sectorsHit;

                    if (sectorsHit < minSectors) continue;

                    meanX /= sumW;
                    meanZ /= sumW;
                    meanH /= sumW;

                    // initial solve
                    let gx = 0;
                    let gz = 0;
                    let c = 0;

                    {
                        let sxx = 0, sxz = 0, szz = 0;
                        let sxh = 0, szh = 0;

                        for (let k = 0; k < kCount; k++) {
                            const nx = x + dxs[k];
                            const nz = z + dzs[k];
                            if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                            const j = nz * width + nx;
                            const hj = heights[j];
                            if (!Number.isFinite(hj)) continue;
                            if (hasNoData && hj === noData) continue;
                            if (mask && mask[j] === 0) continue;

                            const w = baseW[k];
                            const cx = oxs[k] - meanX;
                            const cz = ozs[k] - meanZ;
                            const ch = hj - meanH;

                            sxx += w * cx * cx;
                            sxz += w * cx * cz;
                            szz += w * cz * cz;
                            sxh += w * cx * ch;
                            szh += w * cz * ch;
                        }

                        const det = sxx * szz - sxz * sxz;
                        if (Math.abs(det) < 1e-12) continue;

                        gx = (sxh * szz - szh * sxz) / det;
                        gz = (szh * sxx - sxh * sxz) / det;
                        c = meanH - gx * meanX - gz * meanZ;
                    }

                    // robust reweighting pass(es)
                    for (let pass = 0; pass < robustPasses; pass++) {
                        let rSumW = 0;
                        let rMeanX = 0;
                        let rMeanZ = 0;
                        let rMeanH = 0;

                        for (let k = 0; k < kCount; k++) {
                            const nx = x + dxs[k];
                            const nz = z + dzs[k];
                            if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                            const j = nz * width + nx;
                            const hj = heights[j];
                            if (!Number.isFinite(hj)) continue;
                            if (hasNoData && hj === noData) continue;
                            if (mask && mask[j] === 0) continue;

                            const ox = oxs[k];
                            const oz = ozs[k];
                            const predicted = gx * ox + gz * oz + c;
                            const absErr = Math.abs(hj - predicted);
                            const rw = baseW[k] * huberWeightAbs(absErr, robustResidualDm);

                            rSumW += rw;
                            rMeanX += rw * ox;
                            rMeanZ += rw * oz;
                            rMeanH += rw * hj;
                        }

                        if (rSumW <= 0) break;

                        rMeanX /= rSumW;
                        rMeanZ /= rSumW;
                        rMeanH /= rSumW;

                        let sxx = 0, sxz = 0, szz = 0;
                        let sxh = 0, szh = 0;

                        for (let k = 0; k < kCount; k++) {
                            const nx = x + dxs[k];
                            const nz = z + dzs[k];
                            if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                            const j = nz * width + nx;
                            const hj = heights[j];
                            if (!Number.isFinite(hj)) continue;
                            if (hasNoData && hj === noData) continue;
                            if (mask && mask[j] === 0) continue;

                            const ox = oxs[k];
                            const oz = ozs[k];
                            const predicted = gx * ox + gz * oz + c;
                            const absErr = Math.abs(hj - predicted);
                            const rw = baseW[k] * huberWeightAbs(absErr, robustResidualDm);

                            const cx = ox - rMeanX;
                            const cz = oz - rMeanZ;
                            const ch = hj - rMeanH;

                            sxx += rw * cx * cx;
                            sxz += rw * cx * cz;
                            szz += rw * cz * cz;
                            sxh += rw * cx * ch;
                            szh += rw * cz * ch;
                        }

                        const det = sxx * szz - sxz * sxz;
                        if (Math.abs(det) < 1e-12) break;

                        gx = (sxh * szz - szh * sxz) / det;
                        gz = (szh * sxx - sxh * sxz) / det;
                        c = rMeanH - gx * rMeanX - gz * rMeanZ;
                    }

                    // final residual / confidence
                    let rss = 0;
                    let finalW = 0;

                    for (let k = 0; k < kCount; k++) {
                        const nx = x + dxs[k];
                        const nz = z + dzs[k];
                        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                        const j = nz * width + nx;
                        const hj = heights[j];
                        if (!Number.isFinite(hj)) continue;
                        if (hasNoData && hj === noData) continue;
                        if (mask && mask[j] === 0) continue;

                        const predicted = gx * oxs[k] + gz * ozs[k] + c;
                        const err = hj - predicted;
                        const w = baseW[k];

                        rss += w * err * err;
                        finalW += w;
                    }

                    const fitError = finalW > 0 ? Math.sqrt(rss / finalW) : Infinity;

                    const gradMag = Math.hypot(gx, gz);    // rise/run in dm per dm
                    const slopeDeg = Math.atan(gradMag) * RAD2DEG;
                    const pitch12 = 12 * gradMag;
                    const riseAcrossRadius = gradMag * stencil.maxDistance;

                    dYdXMap[i] = gx;
                    dYdZMap[i] = gz;
                    interceptMap[i] = c;
                    slopeDegMap[i] = slopeDeg;
                    pitch12Map[i] = pitch12;
                    fitErrorMap[i] = fitError;
                    riseAcrossRadiusMap[i] = riseAcrossRadius;
                    valid[i] = 1;

                    if (slopeDeg >= minSlopeDegForAzimuth) {
                        const vx = -gx;
                        const vz = -gz;
                        let az = Math.atan2(vx, vz) * RAD2DEG; // 0°=+Z, 90°=+X
                        if (az < 0) az += 360;
                        azimuthDegMap[i] = az;
                    }

                    // confidence for quantized integer-height DSMs
                    const sectorScore = clamp01((sectorsHit - minSectors + 1) / Math.max(1, stencil.sectorCount - minSectors + 1));
                    const neighborScore = clamp01(count / Math.max(minNeighbors, 1));
                    const riseScore = clamp01(riseAcrossRadius / Math.max(minRiseAcrossRadiusDm, 1e-6));
                    const fitScore = clamp01(1 - fitError / Math.max(robustResidualDm * 1.5, 1e-6));

                    const confidence =
                        0.30 * sectorScore +
                        0.15 * neighborScore +
                        0.30 * riseScore +
                        0.25 * fitScore;

                    confidenceMap[i] = confidence;

                    // trusted means: enough support to actually believe the result
                    if (
                        confidence >= minConfidence &&
                        riseAcrossRadius >= minRiseAcrossRadiusDm &&
                        fitError <= robustResidualDm * 1.5
                    ) {
                        trusted[i] = 1;
                    }
                }
            }

            return {
                slopeDegMap,
                pitch12Map,
                azimuthDegMap,
                dYdXMap,
                dYdZMap,
                interceptMap,
                fitErrorMap,
                riseAcrossRadiusMap,
                confidenceMap,
                samplesUsedMap,
                sectorsUsedMap,
                valid,
                trusted,
                stencil,
            };
        }

        type CircularStencil = {
            radiusPixels: number;
            cellSizeX: number;
            cellSizeZ: number;
            dx: Int16Array;
            dz: Int16Array;
            ox: Float32Array;
            oz: Float32Array;
            w: Float32Array;
            sector: Uint8Array;
            count: number;
            maxDistance: number;
            sectorCount: number;
        };

        type AdaptiveQuantizedRoofMaps = {
            planeA: Float32Array;
            planeB: Float32Array;
            planeC: Float32Array;

            slopeDegMap: Float32Array;
            pitch12Map: Float32Array;
            azimuthDegMap: Float32Array;

            fitErrorMap: Float32Array;
            riseAcrossRadiusMap: Float32Array;
            confidenceMap: Float32Array;

            samplesUsedMap: Uint16Array;
            sectorsUsedMap: Uint8Array;
            chosenRadiusMap: Uint8Array;     // chosen radius in pixels
            chosenScaleIndexMap: Uint8Array; // index into candidateRadii

            valid: Uint8Array;
            trusted: Uint8Array;

            stencils: CircularStencil[];
            candidateRadii: number[];
        };

        type ComputeAdaptiveQuantizedRoofMapsOptions = {
            candidateRadii?: number[];          // default [2,3,4,5,7,9,12]
            cellSizeX?: number;                 // default 1
            cellSizeZ?: number;                 // default 1
            distanceWeightPower?: number;       // default 1
            sectorCount?: number;               // default 8

            minNeighbors?: number;              // default 12
            minSectors?: number;                // default 5
            minSlopeDegForAzimuth?: number;     // default 3

            minRiseAcrossRadiusDm?: number;     // default 2
            robustResidualDm?: number;          // default 1.5
            robustPasses?: number;              // default 1
            minConfidence?: number;             // default 0.45

            // optional stricter size-dependent rules
            minNeighborsByRadius?: boolean;     // default true
            minSectorsByRadius?: boolean;       // default true

            // fallback behavior
            keepBestFallback?: boolean;         // default true

            noData?: number;
            mask?: ArrayLike<number> | null;
            stencils?: CircularStencil[];
        };

        type FitAtPixelResult = {
            ok: boolean;
            a: number;
            b: number;
            c: number;
            slopeDeg: number;
            pitch12: number;
            azimuthDeg: number;
            fitError: number;
            riseAcrossRadius: number;
            confidence: number;
            samplesUsed: number;
            sectorsUsed: number;
            trusted: boolean;
        };

        const RAD2DEG = 180 / Math.PI;

        function clamp01(v: number): number {
            return v <= 0 ? 0 : v >= 1 ? 1 : v;
        }

        function huberWeightAbs(absErr: number, delta: number): number {
            if (delta <= 0) return 1;
            if (absErr <= delta) return 1;
            return delta / absErr;
        }

        function createCircularStencil(
            radiusPixels: number,
            cellSizeX = 1,
            cellSizeZ = 1,
            distanceWeightPower = 1,
            sectorCount = 8
        ): CircularStencil {
            const dxs: number[] = [];
            const dzs: number[] = [];
            const oxs: number[] = [];
            const ozs: number[] = [];
            const ws: number[] = [];
            const sectors: number[] = [];

            const r2 = radiusPixels * radiusPixels;
            let maxDistance = 0;

            for (let dz = -radiusPixels; dz <= radiusPixels; dz++) {
                for (let dx = -radiusPixels; dx <= radiusPixels; dx++) {
                    const pixelD2 = dx * dx + dz * dz;
                    if (pixelD2 === 0 || pixelD2 > r2) continue;

                    const ox = dx * cellSizeX;
                    const oz = dz * cellSizeZ;
                    const d = Math.hypot(ox, oz);
                    if (d <= 0) continue;

                    const w = distanceWeightPower === 0
                        ? 1
                        : 1 / Math.pow(d, distanceWeightPower);

                    let ang = Math.atan2(oz, ox); // 0=+X
                    if (ang < 0) ang += 2 * Math.PI;
                    let sector = Math.floor((ang / (2 * Math.PI)) * sectorCount);
                    if (sector >= sectorCount) sector = sectorCount - 1;

                    dxs.push(dx);
                    dzs.push(dz);
                    oxs.push(ox);
                    ozs.push(oz);
                    ws.push(w);
                    sectors.push(sector);

                    if (d > maxDistance) maxDistance = d;
                }
            }

            return {
                radiusPixels,
                cellSizeX,
                cellSizeZ,
                dx: Int16Array.from(dxs),
                dz: Int16Array.from(dzs),
                ox: Float32Array.from(oxs),
                oz: Float32Array.from(ozs),
                w: Float32Array.from(ws),
                sector: Uint8Array.from(sectors),
                count: dxs.length,
                maxDistance,
                sectorCount,
            };
        }

        function fitPlaneAtPixelWithStencil(
            heights: ArrayLike<number>,
            width: number,
            height: number,
            x: number,
            z: number,
            stencil: CircularStencil,
            opts: {
                minNeighbors: number;
                minSectors: number;
                minSlopeDegForAzimuth: number;
                minRiseAcrossRadiusDm: number;
                robustResidualDm: number;
                robustPasses: number;
                minConfidence: number;
                noData?: number;
                hasNoData: boolean;
                mask?: ArrayLike<number> | null;
            }
        ): FitAtPixelResult {
            const {
                minNeighbors,
                minSectors,
                minSlopeDegForAzimuth,
                minRiseAcrossRadiusDm,
                robustResidualDm,
                robustPasses,
                minConfidence,
                noData,
                hasNoData,
                mask,
            } = opts;

            let count = 0;
            let sectorMask = 0;

            let sumW = 0;
            let meanX = 0;
            let meanZ = 0;
            let meanH = 0;

            const dxs = stencil.dx;
            const dzs = stencil.dz;
            const oxs = stencil.ox;
            const ozs = stencil.oz;
            const baseW = stencil.w;
            const sectors = stencil.sector;
            const kCount = stencil.count;

            // weighted means
            for (let k = 0; k < kCount; k++) {
                const nx = x + dxs[k];
                const nz = z + dzs[k];
                if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                const j = nz * width + nx;
                const hj = heights[j];
                if (!Number.isFinite(hj)) continue;
                if (hasNoData && hj === noData) continue;
                if (mask && mask[j] === 0) continue;

                const w = baseW[k];
                sumW += w;
                meanX += w * oxs[k];
                meanZ += w * ozs[k];
                meanH += w * hj;
                count++;

                sectorMask |= (1 << sectors[k]);
            }

            if (count < minNeighbors || sumW <= 0) {
                return {
                    ok: false,
                    a: NaN, b: NaN, c: NaN,
                    slopeDeg: NaN,
                    pitch12: NaN,
                    azimuthDeg: NaN,
                    fitError: NaN,
                    riseAcrossRadius: NaN,
                    confidence: 0,
                    samplesUsed: count,
                    sectorsUsed: 0,
                    trusted: false,
                };
            }

            let sectorsHit = 0;
            for (let s = 0; s < stencil.sectorCount; s++) {
                if (sectorMask & (1 << s)) sectorsHit++;
            }

            if (sectorsHit < minSectors) {
                return {
                    ok: false,
                    a: NaN, b: NaN, c: NaN,
                    slopeDeg: NaN,
                    pitch12: NaN,
                    azimuthDeg: NaN,
                    fitError: NaN,
                    riseAcrossRadius: NaN,
                    confidence: 0,
                    samplesUsed: count,
                    sectorsUsed: sectorsHit,
                    trusted: false,
                };
            }

            meanX /= sumW;
            meanZ /= sumW;
            meanH /= sumW;

            let a = 0, b = 0, c = 0;

            // initial solve
            {
                let sxx = 0, sxz = 0, szz = 0;
                let sxh = 0, szh = 0;

                for (let k = 0; k < kCount; k++) {
                    const nx = x + dxs[k];
                    const nz = z + dzs[k];
                    if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                    const j = nz * width + nx;
                    const hj = heights[j];
                    if (!Number.isFinite(hj)) continue;
                    if (hasNoData && hj === noData) continue;
                    if (mask && mask[j] === 0) continue;

                    const w = baseW[k];
                    const cx = oxs[k] - meanX;
                    const cz = ozs[k] - meanZ;
                    const ch = hj - meanH;

                    sxx += w * cx * cx;
                    sxz += w * cx * cz;
                    szz += w * cz * cz;
                    sxh += w * cx * ch;
                    szh += w * cz * ch;
                }

                const det = sxx * szz - sxz * sxz;
                if (Math.abs(det) < 1e-12) {
                    return {
                        ok: false,
                        a: NaN, b: NaN, c: NaN,
                        slopeDeg: NaN,
                        pitch12: NaN,
                        azimuthDeg: NaN,
                        fitError: NaN,
                        riseAcrossRadius: NaN,
                        confidence: 0,
                        samplesUsed: count,
                        sectorsUsed: sectorsHit,
                        trusted: false,
                    };
                }

                a = (sxh * szz - szh * sxz) / det;
                b = (szh * sxx - sxh * sxz) / det;
                c = meanH - a * meanX - b * meanZ;
            }

            // robust reweighting
            for (let pass = 0; pass < robustPasses; pass++) {
                let rSumW = 0;
                let rMeanX = 0;
                let rMeanZ = 0;
                let rMeanH = 0;

                for (let k = 0; k < kCount; k++) {
                    const nx = x + dxs[k];
                    const nz = z + dzs[k];
                    if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                    const j = nz * width + nx;
                    const hj = heights[j];
                    if (!Number.isFinite(hj)) continue;
                    if (hasNoData && hj === noData) continue;
                    if (mask && mask[j] === 0) continue;

                    const pred = a * oxs[k] + b * ozs[k] + c;
                    const absErr = Math.abs(hj - pred);
                    const rw = baseW[k] * huberWeightAbs(absErr, robustResidualDm);

                    rSumW += rw;
                    rMeanX += rw * oxs[k];
                    rMeanZ += rw * ozs[k];
                    rMeanH += rw * hj;
                }

                if (rSumW <= 0) break;

                rMeanX /= rSumW;
                rMeanZ /= rSumW;
                rMeanH /= rSumW;

                let sxx = 0, sxz = 0, szz = 0;
                let sxh = 0, szh = 0;

                for (let k = 0; k < kCount; k++) {
                    const nx = x + dxs[k];
                    const nz = z + dzs[k];
                    if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                    const j = nz * width + nx;
                    const hj = heights[j];
                    if (!Number.isFinite(hj)) continue;
                    if (hasNoData && hj === noData) continue;
                    if (mask && mask[j] === 0) continue;

                    const pred = a * oxs[k] + b * ozs[k] + c;
                    const absErr = Math.abs(hj - pred);
                    const rw = baseW[k] * huberWeightAbs(absErr, robustResidualDm);

                    const cx = oxs[k] - rMeanX;
                    const cz = ozs[k] - rMeanZ;
                    const ch = hj - rMeanH;

                    sxx += rw * cx * cx;
                    sxz += rw * cx * cz;
                    szz += rw * cz * cz;
                    sxh += rw * cx * ch;
                    szh += rw * cz * ch;
                }

                const det = sxx * szz - sxz * sxz;
                if (Math.abs(det) < 1e-12) break;

                a = (sxh * szz - szh * sxz) / det;
                b = (szh * sxx - sxh * sxz) / det;
                c = rMeanH - a * rMeanX - b * rMeanZ;
            }

            let rss = 0;
            let finalW = 0;

            for (let k = 0; k < kCount; k++) {
                const nx = x + dxs[k];
                const nz = z + dzs[k];
                if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                const j = nz * width + nx;
                const hj = heights[j];
                if (!Number.isFinite(hj)) continue;
                if (hasNoData && hj === noData) continue;
                if (mask && mask[j] === 0) continue;

                const err = hj - (a * oxs[k] + b * ozs[k] + c);
                const w = baseW[k];
                rss += w * err * err;
                finalW += w;
            }

            const fitError = finalW > 0 ? Math.sqrt(rss / finalW) : Infinity;
            const grade = Math.hypot(a, b);
            const slopeDeg = Math.atan(grade) * RAD2DEG;
            const pitch12 = 12 * grade;
            const riseAcrossRadius = grade * stencil.maxDistance;

            let azimuthDeg = NaN;
            if (slopeDeg >= minSlopeDegForAzimuth) {
                const vx = -a;
                const vz = -b;
                azimuthDeg = Math.atan2(vx, vz) * RAD2DEG;
                if (azimuthDeg < 0) azimuthDeg += 360;
            }

            const sectorScore = clamp01((sectorsHit - minSectors + 1) / Math.max(1, stencil.sectorCount - minSectors + 1));
            const neighborScore = clamp01(count / Math.max(minNeighbors, 1));
            const riseScore = clamp01(riseAcrossRadius / Math.max(minRiseAcrossRadiusDm, 1e-6));
            const fitScore = clamp01(1 - fitError / Math.max(robustResidualDm * 1.5, 1e-6));

            const confidence =
                0.30 * sectorScore +
                0.15 * neighborScore +
                0.30 * riseScore +
                0.25 * fitScore;

            const trusted =
                confidence >= minConfidence &&
                riseAcrossRadius >= minRiseAcrossRadiusDm &&
                fitError <= robustResidualDm * 1.5;

            return {
                ok: true,
                a, b, c,
                slopeDeg,
                pitch12,
                azimuthDeg,
                fitError,
                riseAcrossRadius,
                confidence,
                samplesUsed: count,
                sectorsUsed: sectorsHit,
                trusted,
            };
        }

        function computeAdaptiveQuantizedLocalRoofMaps(
            heights: ArrayLike<number>,
            width: number,
            height: number,
            options: ComputeAdaptiveQuantizedRoofMapsOptions = {}
        ): AdaptiveQuantizedRoofMaps {
            const {
                candidateRadii = [2, 3, 4, 5, 7, 9, 12],
                cellSizeX = 1,
                cellSizeZ = 1,
                distanceWeightPower = 1,
                sectorCount = 8,

                minNeighbors = 12,
                minSectors = 5,
                minSlopeDegForAzimuth = 3,

                minRiseAcrossRadiusDm = 2,
                robustResidualDm = 1.5,
                robustPasses = 1,
                minConfidence = 0.45,

                minNeighborsByRadius = true,
                minSectorsByRadius = true,

                keepBestFallback = true,

                noData,
                mask = null,
                stencils,
            } = options;

            const n = width * height;
            if (heights.length !== n) throw new Error(`heights.length must equal width*height`);
            if (mask && mask.length !== n) throw new Error(`mask.length must equal width*height`);

            const sortedRadii = [...candidateRadii].sort((a, b) => a - b);
            const actualStencils = stencils ?? sortedRadii.map(r =>
                createCircularStencil(r, cellSizeX, cellSizeZ, distanceWeightPower, sectorCount)
            );

            if (actualStencils.length !== sortedRadii.length) {
                throw new Error(`stencils length must match candidateRadii length`);
            }

            const planeA = new Float32Array(n);
            const planeB = new Float32Array(n);
            const planeC = new Float32Array(n);

            const slopeDegMap = new Float32Array(n);
            const pitch12Map = new Float32Array(n);
            const azimuthDegMap = new Float32Array(n);

            const fitErrorMap = new Float32Array(n);
            const riseAcrossRadiusMap = new Float32Array(n);
            const confidenceMap = new Float32Array(n);

            const samplesUsedMap = new Uint16Array(n);
            const sectorsUsedMap = new Uint8Array(n);
            const chosenRadiusMap = new Uint8Array(n);
            const chosenScaleIndexMap = new Uint8Array(n);

            const valid = new Uint8Array(n);
            const trusted = new Uint8Array(n);

            planeA.fill(NaN);
            planeB.fill(NaN);
            planeC.fill(NaN);
            slopeDegMap.fill(NaN);
            pitch12Map.fill(NaN);
            azimuthDegMap.fill(NaN);
            fitErrorMap.fill(NaN);
            riseAcrossRadiusMap.fill(NaN);
            confidenceMap.fill(0);

            const hasNoData = noData !== undefined;

            function minNeighborsForRadius(r: number): number {
                if (!minNeighborsByRadius) return minNeighbors;
                return Math.max(minNeighbors, Math.min(24, Math.floor(0.35 * Math.PI * r * r)));
            }

            function minSectorsForRadius(r: number): number {
                if (!minSectorsByRadius) return minSectors;
                if (r <= 2) return Math.max(4, Math.min(minSectors, 4));
                if (r <= 4) return Math.max(5, Math.min(minSectors, 5));
                return minSectors;
            }

            for (let z = 0; z < height; z++) {
                const rowBase = z * width;

                for (let x = 0; x < width; x++) {
                    const i = rowBase + x;
                    const hCenter = heights[i];

                    if (!Number.isFinite(hCenter)) continue;
                    if (hasNoData && hCenter === noData) continue;
                    if (mask && mask[i] === 0) continue;

                    let bestFallbackScore = -Infinity;
                    let bestFallback: FitAtPixelResult | null = null;
                    let bestFallbackRadius = 0;
                    let bestFallbackScale = 0;

                    let accepted = false;

                    for (let s = 0; s < actualStencils.length; s++) {
                        const stencil = actualStencils[s];
                        const radius = sortedRadii[s];

                        const fit = fitPlaneAtPixelWithStencil(
                            heights,
                            width,
                            height,
                            x,
                            z,
                            stencil,
                            {
                                minNeighbors: minNeighborsForRadius(radius),
                                minSectors: minSectorsForRadius(radius),
                                minSlopeDegForAzimuth,
                                minRiseAcrossRadiusDm,
                                robustResidualDm,
                                robustPasses,
                                minConfidence,
                                noData,
                                hasNoData,
                                mask,
                            }
                        );

                        if (!fit.ok) continue;

                        valid[i] = 1;

                        // fallback score prefers good fit + enough rise, slightly prefers smaller radius
                        const fallbackScore =
                            0.45 * fit.confidence +
                            0.30 * clamp01(fit.riseAcrossRadius / Math.max(minRiseAcrossRadiusDm, 1e-6)) +
                            0.20 * clamp01(1 - fit.fitError / Math.max(robustResidualDm * 1.5, 1e-6)) +
                            0.05 * clamp01(1 - radius / Math.max(1, sortedRadii[sortedRadii.length - 1]));

                        if (fallbackScore > bestFallbackScore) {
                            bestFallbackScore = fallbackScore;
                            bestFallback = fit;
                            bestFallbackRadius = radius;
                            bestFallbackScale = s;
                        }

                        // key rule: choose the smallest trustworthy radius
                        if (fit.trusted) {
                            planeA[i] = fit.a;
                            planeB[i] = fit.b;
                            planeC[i] = fit.c;

                            slopeDegMap[i] = fit.slopeDeg;
                            pitch12Map[i] = fit.pitch12;
                            azimuthDegMap[i] = fit.azimuthDeg;

                            fitErrorMap[i] = fit.fitError;
                            riseAcrossRadiusMap[i] = fit.riseAcrossRadius;
                            confidenceMap[i] = fit.confidence;

                            samplesUsedMap[i] = fit.samplesUsed;
                            sectorsUsedMap[i] = fit.sectorsUsed;
                            chosenRadiusMap[i] = radius;
                            chosenScaleIndexMap[i] = s;

                            trusted[i] = 1;
                            accepted = true;
                            break;
                        }
                    }

                    if (!accepted && keepBestFallback && bestFallback) {
                        planeA[i] = bestFallback.a;
                        planeB[i] = bestFallback.b;
                        planeC[i] = bestFallback.c;

                        slopeDegMap[i] = bestFallback.slopeDeg;
                        pitch12Map[i] = bestFallback.pitch12;
                        azimuthDegMap[i] = bestFallback.azimuthDeg;

                        fitErrorMap[i] = bestFallback.fitError;
                        riseAcrossRadiusMap[i] = bestFallback.riseAcrossRadius;
                        confidenceMap[i] = bestFallback.confidence;

                        samplesUsedMap[i] = bestFallback.samplesUsed;
                        sectorsUsedMap[i] = bestFallback.sectorsUsed;
                        chosenRadiusMap[i] = bestFallbackRadius;
                        chosenScaleIndexMap[i] = bestFallbackScale;
                    }
                }
            }

            return {
                planeA,
                planeB,
                planeC,
                slopeDegMap,
                pitch12Map,
                azimuthDegMap,
                fitErrorMap,
                riseAcrossRadiusMap,
                confidenceMap,
                samplesUsedMap,
                sectorsUsedMap,
                chosenRadiusMap,
                chosenScaleIndexMap,
                valid,
                trusted,
                stencils: actualStencils,
                candidateRadii: sortedRadii,
            };
        }



































































        type CircularStencilPF = {
            radiusPixels: number;
            cellSizeX: number;
            cellSizeZ: number;
            dx: Int16Array;
            dz: Int16Array;
            ox: Float32Array;
            oz: Float32Array;
            w: Float32Array;
            sector: Uint8Array;
            count: number;
            maxDistance: number;
            sectorCount: number;
        };

        type DensePlaneField = {
            planeA: Float32Array;              // h = a*x + b*z + c
            planeB: Float32Array;
            planeC: Float32Array;

            slopeDegMap: Float32Array;
            pitch12Map: Float32Array;
            azimuthDegMap: Float32Array;       // downslope, 0=+Z, 90=+X

            fitErrorMap: Float32Array;         // RMS residual in dm
            riseAcrossRadiusMap: Float32Array; // expected rise across support radius, in dm
            confidenceMap: Float32Array;       // 0..1
            samplesUsedMap: Uint16Array;
            sectorsUsedMap: Uint8Array;

            valid: Uint8Array;                 // mathematically solvable
            trusted: Uint8Array;               // believable on your coarse raster

            stencil: CircularStencilPF;
        };

        type ComputeDensePlaneFieldOptions = {
            radius?: number;                   // default 7
            cellSizeX?: number;                // default 1 dm
            cellSizeZ?: number;                // default 1 dm
            distanceWeightPower?: number;      // 0=uniform, 1=1/d, 2=1/d^2
            sectorCount?: number;              // default 8
            minNeighbors?: number;             // default 24
            minSectors?: number;               // default 6
            minSlopeDegForAzimuth?: number;    // default 3
            minRiseAcrossRadiusDm?: number;    // default 2
            robustResidualDm?: number;         // default 1.5
            robustPasses?: number;             // default 1
            minConfidence?: number;            // default 0.45
            noData?: number;
            mask?: ArrayLike<number> | null;
            stencil?: CircularStencilPF;
        };

        function createCircularStencilPF(
            radiusPixels: number,
            cellSizeX = 1,
            cellSizeZ = 1,
            distanceWeightPower = 1,
            sectorCount = 8
        ): CircularStencilPF {
            const dxs: number[] = [];
            const dzs: number[] = [];
            const oxs: number[] = [];
            const ozs: number[] = [];
            const ws: number[] = [];
            const sectors: number[] = [];

            const r2 = radiusPixels * radiusPixels;
            let maxDistance = 0;

            for (let dz = -radiusPixels; dz <= radiusPixels; dz++) {
                for (let dx = -radiusPixels; dx <= radiusPixels; dx++) {
                    const pixelD2 = dx * dx + dz * dz;
                    if (pixelD2 === 0 || pixelD2 > r2) continue;

                    const ox = dx * cellSizeX;
                    const oz = dz * cellSizeZ;
                    const d = Math.hypot(ox, oz);
                    if (d <= 0) continue;

                    const w = distanceWeightPower === 0
                        ? 1
                        : 1 / Math.pow(d, distanceWeightPower);

                    let ang = Math.atan2(oz, ox);
                    if (ang < 0) ang += 2 * Math.PI;
                    let sector = Math.floor((ang / (2 * Math.PI)) * sectorCount);
                    if (sector >= sectorCount) sector = sectorCount - 1;

                    dxs.push(dx);
                    dzs.push(dz);
                    oxs.push(ox);
                    ozs.push(oz);
                    ws.push(w);
                    sectors.push(sector);

                    if (d > maxDistance) maxDistance = d;
                }
            }

            return {
                radiusPixels,
                cellSizeX,
                cellSizeZ,
                dx: Int16Array.from(dxs),
                dz: Int16Array.from(dzs),
                ox: Float32Array.from(oxs),
                oz: Float32Array.from(ozs),
                w: Float32Array.from(ws),
                sector: Uint8Array.from(sectors),
                count: dxs.length,
                maxDistance,
                sectorCount,
            };
        }

        /**
         * Full-coverage local plane fitting:
         * fits h = a*x + b*z + c at every valid pixel over a circular neighborhood.
         *
         * This gives a dense per-pixel plane field across the whole raster.
         */
        function computeDensePlaneField(
            heights: ArrayLike<number>,
            width: number,
            height: number,
            options: ComputeDensePlaneFieldOptions = {}
        ): DensePlaneField {
            const {
                radius = 7,
                cellSizeX = 1,
                cellSizeZ = 1,
                distanceWeightPower = 1,
                sectorCount = 8,
                minNeighbors = 24,
                minSectors = 6,
                minSlopeDegForAzimuth = 3,
                minRiseAcrossRadiusDm = 2,
                robustResidualDm = 1.5,
                robustPasses = 1,
                minConfidence = 0.45,
                noData,
                mask = null,
                stencil = createCircularStencilPF(radius, cellSizeX, cellSizeZ, distanceWeightPower, sectorCount),
            } = options;

            const n = width * height;
            if (heights.length !== n) throw new Error(`heights.length must equal width*height`);
            if (mask && mask.length !== n) throw new Error(`mask.length must equal width*height`);

            const planeA = new Float32Array(n);
            const planeB = new Float32Array(n);
            const planeC = new Float32Array(n);

            const slopeDegMap = new Float32Array(n);
            const pitch12Map = new Float32Array(n);
            const azimuthDegMap = new Float32Array(n);

            const fitErrorMap = new Float32Array(n);
            const riseAcrossRadiusMap = new Float32Array(n);
            const confidenceMap = new Float32Array(n);
            const samplesUsedMap = new Uint16Array(n);
            const sectorsUsedMap = new Uint8Array(n);

            const valid = new Uint8Array(n);
            const trusted = new Uint8Array(n);

            planeA.fill(NaN);
            planeB.fill(NaN);
            planeC.fill(NaN);
            slopeDegMap.fill(NaN);
            pitch12Map.fill(NaN);
            azimuthDegMap.fill(NaN);
            fitErrorMap.fill(NaN);
            riseAcrossRadiusMap.fill(NaN);
            confidenceMap.fill(0);

            const hasNoData = noData !== undefined;

            const dxs = stencil.dx;
            const dzs = stencil.dz;
            const oxs = stencil.ox;
            const ozs = stencil.oz;
            const baseW = stencil.w;
            const sectors = stencil.sector;
            const kCount = stencil.count;

            for (let z = 0; z < height; z++) {
                const rowBase = z * width;

                for (let x = 0; x < width; x++) {
                    const i = rowBase + x;
                    const hCenter = heights[i];

                    if (!Number.isFinite(hCenter)) continue;
                    if (hasNoData && hCenter === noData) continue;
                    if (mask && mask[i] === 0) continue;

                    let count = 0;
                    let sectorMask = 0;

                    let sumW = 0;
                    let meanX = 0;
                    let meanZ = 0;
                    let meanH = 0;

                    // Weighted means
                    for (let k = 0; k < kCount; k++) {
                        const nx = x + dxs[k];
                        const nz = z + dzs[k];
                        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                        const j = nz * width + nx;
                        const hj = heights[j];
                        if (!Number.isFinite(hj)) continue;
                        if (hasNoData && hj === noData) continue;
                        if (mask && mask[j] === 0) continue;

                        const w = baseW[k];
                        sumW += w;
                        meanX += w * oxs[k];
                        meanZ += w * ozs[k];
                        meanH += w * hj;
                        count++;

                        sectorMask |= (1 << sectors[k]);
                    }

                    if (count < minNeighbors || sumW <= 0) continue;

                    let sectorsHit = 0;
                    for (let s = 0; s < stencil.sectorCount; s++) {
                        if (sectorMask & (1 << s)) sectorsHit++;
                    }

                    samplesUsedMap[i] = count;
                    sectorsUsedMap[i] = sectorsHit;

                    if (sectorsHit < minSectors) continue;

                    meanX /= sumW;
                    meanZ /= sumW;
                    meanH /= sumW;

                    let a = 0, b = 0, c = 0;

                    // Initial solve
                    {
                        let sxx = 0, sxz = 0, szz = 0;
                        let sxh = 0, szh = 0;

                        for (let k = 0; k < kCount; k++) {
                            const nx = x + dxs[k];
                            const nz = z + dzs[k];
                            if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                            const j = nz * width + nx;
                            const hj = heights[j];
                            if (!Number.isFinite(hj)) continue;
                            if (hasNoData && hj === noData) continue;
                            if (mask && mask[j] === 0) continue;

                            const w = baseW[k];
                            const cx = oxs[k] - meanX;
                            const cz = ozs[k] - meanZ;
                            const ch = hj - meanH;

                            sxx += w * cx * cx;
                            sxz += w * cx * cz;
                            szz += w * cz * cz;
                            sxh += w * cx * ch;
                            szh += w * cz * ch;
                        }

                        const det = sxx * szz - sxz * sxz;
                        if (Math.abs(det) < 1e-12) continue;

                        a = (sxh * szz - szh * sxz) / det;
                        b = (szh * sxx - sxh * sxz) / det;
                        c = meanH - a * meanX - b * meanZ;
                    }

                    // Robust reweighting
                    for (let pass = 0; pass < robustPasses; pass++) {
                        let rSumW = 0;
                        let rMeanX = 0;
                        let rMeanZ = 0;
                        let rMeanH = 0;

                        for (let k = 0; k < kCount; k++) {
                            const nx = x + dxs[k];
                            const nz = z + dzs[k];
                            if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                            const j = nz * width + nx;
                            const hj = heights[j];
                            if (!Number.isFinite(hj)) continue;
                            if (hasNoData && hj === noData) continue;
                            if (mask && mask[j] === 0) continue;

                            const pred = a * oxs[k] + b * ozs[k] + c;
                            const absErr = Math.abs(hj - pred);
                            const rw = baseW[k] * huberWeightAbs(absErr, robustResidualDm);

                            rSumW += rw;
                            rMeanX += rw * oxs[k];
                            rMeanZ += rw * ozs[k];
                            rMeanH += rw * hj;
                        }

                        if (rSumW <= 0) break;

                        rMeanX /= rSumW;
                        rMeanZ /= rSumW;
                        rMeanH /= rSumW;

                        let sxx = 0, sxz = 0, szz = 0;
                        let sxh = 0, szh = 0;

                        for (let k = 0; k < kCount; k++) {
                            const nx = x + dxs[k];
                            const nz = z + dzs[k];
                            if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                            const j = nz * width + nx;
                            const hj = heights[j];
                            if (!Number.isFinite(hj)) continue;
                            if (hasNoData && hj === noData) continue;
                            if (mask && mask[j] === 0) continue;

                            const pred = a * oxs[k] + b * ozs[k] + c;
                            const absErr = Math.abs(hj - pred);
                            const rw = baseW[k] * huberWeightAbs(absErr, robustResidualDm);

                            const cx = oxs[k] - rMeanX;
                            const cz = ozs[k] - rMeanZ;
                            const ch = hj - rMeanH;

                            sxx += rw * cx * cx;
                            sxz += rw * cx * cz;
                            szz += rw * cz * cz;
                            sxh += rw * cx * ch;
                            szh += rw * cz * ch;
                        }

                        const det = sxx * szz - sxz * sxz;
                        if (Math.abs(det) < 1e-12) break;

                        a = (sxh * szz - szh * sxz) / det;
                        b = (szh * sxx - sxh * sxz) / det;
                        c = rMeanH - a * rMeanX - b * rMeanZ;
                    }

                    // Final residual
                    let rss = 0;
                    let finalW = 0;

                    for (let k = 0; k < kCount; k++) {
                        const nx = x + dxs[k];
                        const nz = z + dzs[k];
                        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

                        const j = nz * width + nx;
                        const hj = heights[j];
                        if (!Number.isFinite(hj)) continue;
                        if (hasNoData && hj === noData) continue;
                        if (mask && mask[j] === 0) continue;

                        const err = hj - (a * oxs[k] + b * ozs[k] + c);
                        const w = baseW[k];
                        rss += w * err * err;
                        finalW += w;
                    }

                    const fitError = finalW > 0 ? Math.sqrt(rss / finalW) : Infinity;

                    const grade = Math.hypot(a, b);
                    const slopeDeg = Math.atan(grade) * RAD2DEG;
                    const pitch12 = 12 * grade;
                    const riseAcrossRadius = grade * stencil.maxDistance;

                    planeA[i] = a;
                    planeB[i] = b;
                    planeC[i] = c;
                    slopeDegMap[i] = slopeDeg;
                    pitch12Map[i] = pitch12;
                    fitErrorMap[i] = fitError;
                    riseAcrossRadiusMap[i] = riseAcrossRadius;
                    valid[i] = 1;

                    if (slopeDeg >= minSlopeDegForAzimuth) {
                        const vx = -a;
                        const vz = -b;
                        let az = Math.atan2(vx, vz) * RAD2DEG;
                        if (az < 0) az += 360;
                        azimuthDegMap[i] = az;
                    }

                    const sectorScore = clamp01((sectorsHit - minSectors + 1) / Math.max(1, stencil.sectorCount - minSectors + 1));
                    const neighborScore = clamp01(count / Math.max(minNeighbors, 1));
                    const riseScore = clamp01(riseAcrossRadius / Math.max(minRiseAcrossRadiusDm, 1e-6));
                    const fitScore = clamp01(1 - fitError / Math.max(robustResidualDm * 1.5, 1e-6));

                    const confidence =
                        0.30 * sectorScore +
                        0.15 * neighborScore +
                        0.30 * riseScore +
                        0.25 * fitScore;

                    confidenceMap[i] = confidence;

                    if (
                        confidence >= minConfidence &&
                        riseAcrossRadius >= minRiseAcrossRadiusDm &&
                        fitError <= robustResidualDm * 1.5
                    ) {
                        trusted[i] = 1;
                    }
                }
            }

            return {
                planeA,
                planeB,
                planeC,
                slopeDegMap,
                pitch12Map,
                azimuthDegMap,
                fitErrorMap,
                riseAcrossRadiusMap,
                confidenceMap,
                samplesUsedMap,
                sectorsUsedMap,
                valid,
                trusted,
                stencil,
            };
        }
























































































































        function unpackMaskBits(packedMask, size) {
            const out = new Uint8Array(size);
            for (let i = 0; i < size; i++) {
                out[i] = (packedMask[i >> 3] >> (i & 7)) & 1;
            }
            return out;
        }

        function parseGridBinary(buffer) {
            const view = new DataView(buffer);
            let offset = 0;

            if (view.getUint8(offset++) !== 75 || view.getUint8(offset++) !== 121 || view.getUint8(offset++) !== 120 || view.getUint8(offset++) !== 82) {
                throw new Error("Invalid file format");
            }

            const version = view.getUint8(offset++);
            if (version !== 1) {
                throw new Error(`Unsupported version: ${version}`);
            }

            const width = view.getUint32(offset, true); offset += 4;
            const height = view.getUint32(offset, true); offset += 4;
            const minHeight = view.getInt32(offset, true); offset += 4;
            const heightType = view.getUint8(offset++);

            const size = width * height;

            const rgbBytes = size * 3;
            const rgb = new Uint8Array(buffer, offset, rgbBytes);
            offset += rgbBytes;
            if (offset % 2 !== 0) offset += 1;

            let normalizedHeights;
            if (heightType === 1) {
                normalizedHeights = new Uint8Array(buffer, offset, size);
                offset += size;
            } else if (heightType === 2) {
                console.log(offset, size, "WAT");
                normalizedHeights = new Uint16Array(buffer, offset, size);
                offset += size * 2;
            } else if (heightType === 4) {
                normalizedHeights = new Uint32Array(buffer, offset, size);
                offset += size * 4;
            } else {
                throw new Error(`Invalid height type: ${heightType}`);
            }

            const maskBytes = (size + 7) >> 3;
            const packedMask = new Uint8Array(buffer, offset, maskBytes);

            return {
                Width: width,
                Length: height,
                TrueHeight: minHeight,
                RGB: rgb,
                NormalizedHeightMap: normalizedHeights,
                Mask: unpackMaskBits(packedMask, size),
                getHeight(index) {
                    return minHeight + normalizedHeights[index];
                },
                getMask(index) {
                    return (packedMask[index >> 3] >> (index & 7)) & 1;
                },
                unpackHeights() {
                    const out = new Int32Array(size);
                    for (let j = 0; j < size; j++) {
                        out[j] = minHeight + normalizedHeights[j];
                    }
                    return out;
                },
            };
        }

        async function LoadFileKyxR(file) {
            const buffer = await file.arrayBuffer();
            return parseGridBinary(buffer);
        }

        Scene.onKeyboardObservable.add(async (kbInfo) => {
            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                // console.log(kbInfo.event.key)
                switch (kbInfo.event.key.toLowerCase()) {
                    case "p":
                        Camera.mode = Camera.mode == BABYLON.Camera.ORTHOGRAPHIC_CAMERA ? BABYLON.Camera.PERSPECTIVE_CAMERA : BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
                        if (Camera.mode == BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
                            // Editor.MapDebugging.SwitchMap(false);
                            Camera.lowerBetaLimit = 0;
                            Camera.upperBetaLimit = 0;
                        } else {
                            // Editor.MapDebugging.SwitchMap(true);
                            Camera.lowerBetaLimit = 0; // -Math.PI / 2;
                            Camera.upperBetaLimit = Math.PI / 2;
                        }
                        updateOrtho();
                        // console.log("Pressed P");
                        break;

                    case "t":
                        // Camera.alpha = 0t;
                        Camera.beta = 0;
                        // Camera.lowerBetaLimit = 0;
                        // Camera.upperBetaLimit = 0;
                        break;

                    case "q":
                        SketchLine.ActiveSketch?.Delete();
                        SketchLine.ActiveSketch = null;
                        break;

                    case "f":
                        if (SketchLine.ActiveSketch && SketchLine.ActiveSketch.HasExtruded) SketchLine.ActiveSketch.DrawingMode = SketchLine.ActiveSketch.DrawingMode == "LINE" ? "EXTRUSION" : "LINE";
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;



                    case "o":
                        console.log("hi?")
                        // await Test(40.26076924275762, -74.7981296370152); // JOHN HOUSE //
                        // await Test(37.443185078072716, -122.13801955359011); // ANGLED HOUSE //
                        // await Test(37.444938331695944, -122.13916635930947); // THE LIBRARY //
                        // await Test(37.44412278382237, -122.13891846157102); // GIANT BUILDING BELOW THE LIBRARY //
                        // await Test(36.278676208726246, -86.53094040983781); // STRANGE HOUSE IN NASHVILLE //
                        // await Test(35.513601833943504, -80.63195040878824);
                        // await Test(27.259709614028147, -80.1990460066902); // KILL YOURSELF //
                        // await Test(26.84858029685848, -82.29258639395157); // MRQ PDF EXAMPLE //

                        // if (true) break;

                        const fileInput = document.createElement("input");
                        fileInput.type = "file";
                        fileInput.style.display = "none";
                        fileInput.accept = ".kyxr";
                        document.body.appendChild(fileInput);

                        fileInput.addEventListener("change", async () => {
                            const file = fileInput.files?.[0];
                            if (!file) return;

                            const KissMyAss = await LoadFileKyxR(file);
                            const NormalizedHeights = KissMyAss.NormalizedHeightMap;
                            const Length = KissMyAss.Length;
                            const Width = KissMyAss.Width;

                            console.log(KissMyAss);

                            fileInput.value = "";
                            fileInput.remove();

                            let MapHeights = NormalizedHeights.map((Height) => Height / 100); // mm to dm //
                            // Each pixel is 1 dm, and the height are whole numbers measured in dm. //

                            console.log("HEIGHTS", MapHeights);

                            let ModifiedMask = removeBorderConnected(KissMyAss.Mask, Width, Length); // new Uint8Array(KissMyAss.Mask.byteLength).fill(1); // 

                            const DrawRGB = new Uint8Array(KissMyAss.RGB);
                            let DrawHeights = [];
                            let RoofMinHeight = Infinity; // = Math.min(...Array.from(MapHeights));
                            let RoofMaxHeight = -Infinity; // = Math.max(...Array.from(MapHeights));

                            for (let Index in MapHeights) {
                                if (ModifiedMask[Index] == 0) continue;
                                let Height = MapHeights[Index];
                                RoofMinHeight = Math.min(RoofMinHeight, Height);
                                RoofMaxHeight = Math.max(RoofMaxHeight, Height);
                            }

                            // const AccuratePixels = computeLocalCircularMaps(MapHeights, Width, Length, {
                            //     radius: 12, // 4,
                            //     cellSizeX: 1,     // set to your DSM ground sample distance if known
                            //     cellSizeZ: 1,
                            //     distanceWeightPower: 1, // 1,
                            //     minNeighbors: 10, // 40, // 10,
                            //     minSlopeDegForAzimuth: 2,
                            //     computeFitError: true,
                            //     mask: ModifiedMask,
                            //     // noData: -9999,
                            // });

                            // const field = computeDensePlaneField(MapHeights, Width, Length, {
                            //     radius: 7,
                            //     cellSizeX: 1,
                            //     cellSizeZ: 1,
                            //     distanceWeightPower: 1,
                            //     minNeighbors: 24,
                            //     minSectors: 6,
                            //     minSlopeDegForAzimuth: 3,
                            //     minRiseAcrossRadiusDm: 2,
                            //     robustResidualDm: 1.5,
                            //     robustPasses: 1,
                            //     minConfidence: 0.45,
                            //     mask: ModifiedMask,
                            //     // noData: -9999,
                            // });

                            const SlopePixels = computeQuantizedLocalRoofMaps(MapHeights, Width, Length, {
                                radius: 12, // 12,                  // strong default for integer 1 dm heights
                                cellSizeX: 1,
                                cellSizeZ: 1,
                                distanceWeightPower: 1,
                                minNeighbors: 24,
                                minSectors: 6,
                                minSlopeDegForAzimuth: 3,
                                minRiseAcrossRadiusDm: 2,   // require at least ~2 dm rise over the support radius
                                robustResidualDm: 1.5,
                                robustPasses: 1,
                                minConfidence: 0.45,
                                mask: ModifiedMask,
                                // noData: -9999,
                            });

                            const AccuratePixels = computeQuantizedLocalRoofMaps(MapHeights, Width, Length, {
                                radius: 4, // 12,                  // strong default for integer 1 dm heights
                                cellSizeX: 1,
                                cellSizeZ: 1,
                                distanceWeightPower: 1,
                                minNeighbors: 24,
                                minSectors: 6,
                                minSlopeDegForAzimuth: 3,
                                minRiseAcrossRadiusDm: 2,   // require at least ~2 dm rise over the support radius
                                robustResidualDm: 1.5,
                                robustPasses: 1,
                                minConfidence: 0.45,
                                mask: ModifiedMask,
                                // noData: -9999,
                            });

                            // const AccuratePixels = computeAdaptiveQuantizedLocalRoofMaps(MapHeights, Width, Length, {
                            //     candidateRadii: [2, 3, 4, 7, 9, 12],
                            //     cellSizeX: 1,
                            //     cellSizeZ: 1,
                            //     distanceWeightPower: 1,

                            //     minNeighbors: 12,
                            //     minSectors: 5,
                            //     minSlopeDegForAzimuth: 3,

                            //     minRiseAcrossRadiusDm: 2,
                            //     robustResidualDm: 1.5,
                            //     robustPasses: 1,
                            //     minConfidence: .1, // .8, // 0.45,

                            //     minNeighborsByRadius: true,
                            //     minSectorsByRadius: true,

                            //     keepBestFallback: true,
                            //     mask: ModifiedMask,
                            // });





                            const SmoothPixelsForEdges = computeLocalPlaneMaps(MapHeights, ModifiedMask, Width, Length, {
                                radius: 4,
                                maxResidual: 150, // mm
                                // maxResidual: 15, // mm
                                minPoints: 6,
                                cellSizeX: 1,
                                cellSizeZ: 1,
                            });

                            // const SmoothPixels = computeLocalPlaneMaps(MapHeights, new Uint8Array(ModifiedMask.byteLength).fill(1), Width, Length, {
                            //     radius: 4,
                            //     maxResidual: 150, // mm
                            //     // maxResidual: 15, // mm
                            //     minPoints: 6,
                            //     cellSizeX: 1,
                            //     cellSizeZ: 1,
                            // });

                            // const DifferencePixels = computePlaneBoundaryMapsFromAB(SmoothPixels, Width, Length, {
                            //     normalWeight: 1.0,
                            //     azimuthWeight: 0.35,
                            //     pitchWeight: 0.35,
                            //     residualWeight: 0.2,

                            //     normalCapDeg: 45,
                            //     azimuthCapDeg: 45,
                            //     pitchCapDeg: 20,
                            //     residualCap: 150 // 0.5
                            // });

                            // AccuratePixels

                            const edgeMaps = classifyLocalRoofEdges5x5(SmoothPixelsForEdges, Width, Length, {
                                radius: 4, // 2,
                                groupNormalToleranceDeg: 12,
                                groupAzimuthToleranceDeg: 15,
                                groupSlopeToleranceDeg: 8,

                                minGroupCount: 4,
                                minInvalidBoundaryCount: 4,

                                minTwoPlaneNormalDiffDeg: 5,
                                minTwoPlaneAzimuthDiffDeg: 5,
                                minTwoPlaneSlopeDiffDeg: 4

                                // radius: 4, // 2,
                                // groupNormalToleranceDeg: 12,
                                // groupAzimuthToleranceDeg: 20,
                                // groupSlopeToleranceDeg: 8,

                                // minGroupCount: 2,
                                // minInvalidBoundaryCount: 4,

                                // minTwoPlaneNormalDiffDeg: 10,
                                // minTwoPlaneAzimuthDiffDeg: 5,
                                // minTwoPlaneSlopeDiffDeg: 4
                            });

                            // const edgeMaps = classifyLocalRoofEdges5x5FromCircularMaps(AccuratePixels, Width, Length, {
                            //     mask: ModifiedMask,
                            //     minPitch12: 1.5,
                            //     minSectorSamples: 1.25,
                            //     minAzimuthSplitDeg: 20,
                            //     maxPitchDiff12: 3.0,
                            //     ridgeValleyDotThreshold: 0.45,
                            //     eaveDotThreshold: 0.55,
                            //     gableAbsDotThreshold: 0.30,
                            //     boundaryOutsideFraction: 0.22,
                            //     fitErrorForSeam: 1.25,
                            //     preferTrusted: true,
                            // });

                            // const edgeMaps = classifyLocalRoofEdges5x5FromAdaptiveMaps(AccuratePixels, Width, Length, {
                            //     mask: ModifiedMask,
                            //     candidateRadii: [4],
                            //     preferTrusted: true,

                            //     minPitch12: 1.5,
                            //     minConfidenceForNeighbor: 0.20,

                            //     minSectorVoteWeight: 1.0,
                            //     minAzimuthSplitDegSmall: 16,
                            //     minAzimuthSplitDegLarge: 26,
                            //     maxPitchDiff12: 3.0,

                            //     ridgeValleyDotThreshold: 0.45,
                            //     eaveDotThresholdSmall: 0.50,
                            //     eaveDotThresholdLarge: 0.60,
                            //     gableAbsDotThreshold: 0.30,

                            //     boundaryOutsideFractionSmall: 0.16,
                            //     boundaryOutsideFractionLarge: 0.28,

                            //     fitErrorForSeam: 1.25,
                            //     hipBoundaryFraction: 0.10,
                            // });

                            console.log("SMOOVE", AccuratePixels);
                            // console.log("DIFF", DifferencePixels);

                            // SmoothPixels.planePoints

                            const FITTINGS = computePlaneMap(MapHeights, Width, Length, 2);
                            console.log("FITTINGS", FITTINGS);

                            function angleDifferenceDeg(a, b) {
                                let diff = Math.abs(a - b) % 360;
                                return diff > 180 ? 360 - diff : diff;
                            }

                            function angleDifference180Deg(a, b) {
                                let diff = Math.abs(a - b) % 180;
                                return diff > 90 ? 180 - diff : diff;
                            }

                            // Create physical roof plane and try to recreate based on the points and stuff. If the height seems too far off, reject it. //

                            let AngleRounding = 45; // 90; // 45; // 15; // 90;
                            let AR_Rotations = 360 / AngleRounding;

                            let AzimuthWeight = 0;
                            let HouseAzimuthX = 0;
                            let HouseAzimuthY = 0;
                            // for (let RoofID in Data.solarPotential.roofSegmentStats) {
                            //     let Roof = Data.solarPotential.roofSegmentStats[RoofID];
                            //     let WEIGHT = Roof.stats.areaMeters2 - Roof.stats.groundAreaMeters2;
                            //     AzimuthWeight += WEIGHT;
                            //     let Rad = (((Roof.azimuthDegrees % AngleRounding) + AngleRounding) % AngleRounding) * Math.PI / 180;
                            //     HouseAzimuthX += Math.cos(Rad * AR_Rotations) * WEIGHT;
                            //     HouseAzimuthY += Math.sin(Rad * AR_Rotations) * WEIGHT;
                            // }
                            // for (let Index in MapHeights) {
                            //     if (ModifiedMask[Index] == 0) continue;
                            //     if (SmoothPixels.valid[Index] != 1) continue;
                            //     let WEIGHT = SmoothPixels.slopeDegMap[Index];
                            //     AzimuthWeight += WEIGHT;
                            //     let Rad = (((SmoothPixels.azimuthDegMap[Index] % AngleRounding) + AngleRounding) % AngleRounding) * Math.PI / 180;
                            //     HouseAzimuthX += Math.cos(Rad * AR_Rotations) * WEIGHT;
                            //     HouseAzimuthY += Math.sin(Rad * AR_Rotations) * WEIGHT;
                            // }
                            // console.log(HouseAzimuthX, HouseAzimuthY, AzimuthWeight);
                            // let HouseAzimuth = Math.atan2(HouseAzimuthY / AzimuthWeight, HouseAzimuthX / AzimuthWeight) / AR_Rotations * 180 / Math.PI;
                            // if (HouseAzimuth < 0) HouseAzimuth += AngleRounding;
                            // console.log("HOUSE AZIMUTH", HouseAzimuth);

                            // BodiesByHeight

                            // Allow all pixels to be put into different groups, and then figure out the most likely group.
                            // let YES = segmentByNeighborPredicate
                            let YES = segmentByNeighborPredicate5x5(FITTINGS, Width, Length, (fromIndex: number, toIndex: number, CurrentGroup: number[], labels: number[]) => {
                                const a = FITTINGS[fromIndex];
                                const b = FITTINGS[toIndex];

                                if (!a || !b) return false;
                                // if (a.chaotic || b.chaotic) return false;
                                // if (fromIndex == toIndex) return true;

                                if (ModifiedMask[toIndex] == 0) return false;
                                if (AccuratePixels.valid[toIndex] == 0) return false;
                                // if (SmoothPixels.pitch12Map[toIndex] <= 1) return false;
                                // if (SmoothPixels.pitch12Map[toIndex] <= 2) return false;

                                if (edgeMaps.edgeTypeMap[toIndex] != 0) return false;

                                // if (b.slope * 12 <= 1 || b.slope * 12 > 21) return false;
                                // if (b.slope * 12 <= 3) return true;
                                // // if (b.RMSE > 20) return false;
                                // return false;


                                // const dot = a.dYdX * b.dYdX + a.dYdZ * b.dYdZ;
                                // const magA = Math.hypot(a.dYdX, a.dYdZ);
                                // const magB = Math.hypot(b.dYdX, b.dYdZ);
                                // const angle = Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB))));

                                // const slopeDiff = Math.abs(a.slope - b.slope);

                                // // const azimuthDiff = Math.abs(Math.atan2(a.dYdZ, a.dYdX) - Math.atan2(b.dYdZ, b.dYdX))
                                // const dxDiff = Math.abs(a.dYdX - b.dYdX);
                                // const dzDiff = Math.abs(a.dYdZ - b.dYdZ);
                                // const heightDiff = Math.abs(a.height - b.height);
                                // // const heightDiff = Math.abs(a25.height - b25.height);

                                // // const AverageSlope = (a.slope + b.slope) / 2;
                                // const LowestSlope = Math.min(a.slope, b.slope);
                                // const HighestSlope = Math.max(a.slope, b.slope);

                                // const LowestHeight = Math.min(a.height, b.height);

                                // let GroupSize = 0;
                                // let GroupPitch = 0;
                                // for (const index of CurrentGroup) {
                                //     GroupSize++;
                                //     GroupPitch += Sobel3x3Map[index].slope;
                                // }
                                // GroupPitch = GroupSize == 0 ? 0 : GroupPitch / GroupSize;

                                // return Math.abs(GroupPitch - b.slope) * 12 <= .5;

                                // return b.slope <= 24; // || heightDiff <= 10;
                                // // return 1 <= LowestSlope && HighestSlope <= 24;



                                // RMSE (high is edge, usually)
                                const Pass = true
                                    // && (heightDiff <= slopeDiff)
                                    // && angle <= 15 * Math.PI / 180
                                    // && azimuthDiff <= 5 * Math.PI / 180
                                    // && dxDiff <= 5 * Math.PI / 180
                                    // && dzDiff <= 5 * Math.PI / 180
                                    // && angleDifference180Deg(SmoothPixels.azimuthDegMap[fromIndex], SmoothPixels.azimuthDegMap[toIndex]) <= 5

                                    // AccuratePixels
                                    && angleDifferenceDeg(AccuratePixels.azimuthDegMap[fromIndex], AccuratePixels.azimuthDegMap[toIndex]) <= 4
                                    && angleDifferenceDeg(SlopePixels.slopeDegMap[fromIndex], SlopePixels.slopeDegMap[toIndex]) <= 2

                                    // && slopeDiff <= 2
                                    // && normalDiff <= 5 * Math.PI / 180
                                    // && heightDiff <= .1 // .05 // .1 // .05 // .1
                                    // && slopeDiff * 12 <= 4
                                    ;
                                if (!Pass) return false;

                                let WEIGHT = SlopePixels.pitch12Map[toIndex];
                                AzimuthWeight += WEIGHT;
                                let Rad = (((AccuratePixels.azimuthDegMap[toIndex] % AngleRounding) + AngleRounding) % AngleRounding) * Math.PI / 180;
                                HouseAzimuthX += Math.cos(Rad * AR_Rotations) * WEIGHT;
                                HouseAzimuthY += Math.sin(Rad * AR_Rotations) * WEIGHT;

                                return true;
                            }, {
                                circular: true,
                                minGroupSize: 9 // 27 // 108 * 4 // 27 // 9 // 9*4 = 36sq in

                            });

                            console.log("YES", YES);

                            const ExpandedBodies = expandLabelsByPredicate(
                                FITTINGS,
                                Width,
                                Length,
                                YES.labels,
                                (owner, fromIndex, toIndex, labels, distance) => {
                                    const a = FITTINGS[fromIndex];
                                    const b = FITTINGS[toIndex];

                                    if (!a || !b) return false;
                                    if (ModifiedMask[toIndex] === 0) return false;

                                    // don't grow into already-owned pixels
                                    if (labels[toIndex] !== -1 && labels[toIndex] !== owner) return false;

                                    return true
                                        && angleDifferenceDeg(AccuratePixels.azimuthDegMap[fromIndex], AccuratePixels.azimuthDegMap[toIndex]) <= 10
                                        && angleDifferenceDeg(SlopePixels.slopeDegMap[fromIndex], SlopePixels.slopeDegMap[toIndex]) <= 5
                                },
                                {
                                    circular: true,
                                    neighborhood: "5x5"
                                }
                            );

                            console.log("EXPANDED", ExpandedBodies);

                            // let ExpandedBodies = segmentByNeighborPredicate5x5(FITTINGS, Width, Length, (fromIndex: number, toIndex: number, groupBuffer, groupSize, newLabels) => {
                            //     const a = FITTINGS[fromIndex];
                            //     const b = FITTINGS[toIndex];

                            //     if (!a || !b) return false;
                            //     if (ModifiedMask[toIndex] == 0) return false;

                            //     let aBodyGroupID = YES.labels[fromIndex];
                            //     let bBodyGroupID = YES.labels[toIndex];

                            //     let allowedByParentRules =
                            //         aBodyGroupID !== -1 && (bBodyGroupID === -1 && newLabels[toIndex] === -1)
                            //         ||
                            //         bBodyGroupID !== -1 && (aBodyGroupID === -1 && newLabels[fromIndex] === -1)
                            //         ||
                            //         aBodyGroupID === bBodyGroupID && aBodyGroupID !== -1;

                            //     if (!allowedByParentRules) return false;

                            //     // const FromParentID = YES.groupLabels

                            //     // console.log(newLabels);

                            //     // const dot = a.dYdX * b.dYdX + a.dYdZ * b.dYdZ;
                            //     // const magA = Math.hypot(a.dYdX, a.dYdZ);
                            //     // const magB = Math.hypot(b.dYdX, b.dYdZ);
                            //     // const angle = Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB))));

                            //     return true
                            //     // && angleDifferenceDeg(SmoothPixels.azimuthDegMap[fromIndex], SmoothPixels.azimuthDegMap[toIndex]) <= 30 * 1
                            //     // && angleDifferenceDeg(SmoothPixels.slopeDegMap[fromIndex], SmoothPixels.slopeDegMap[toIndex]) <= 30 * 1
                            // }, {
                            //     // circular: true,
                            //     useDiagonals: true,
                            //     minGroupSize: 9 // 9*4 = 36sq in
                            // });

                            // for (let Group of YES.allGroupIndices) {
                            //     let WEIGHT = SmoothPixels.slopeDegMap[toIndex];
                            //     AzimuthWeight += WEIGHT;
                            //     let Rad = (((SmoothPixels.azimuthDegMap[toIndex] % AngleRounding) + AngleRounding) % AngleRounding) * Math.PI / 180;
                            //     HouseAzimuthX += Math.cos(Rad * AR_Rotations) * WEIGHT;
                            //     HouseAzimuthY += Math.sin(Rad * AR_Rotations) * WEIGHT;
                            // }

                            console.log(HouseAzimuthX, HouseAzimuthY, AzimuthWeight);
                            let HouseAzimuth = Math.atan2(HouseAzimuthY / AzimuthWeight, HouseAzimuthX / AzimuthWeight) / AR_Rotations * 180 / Math.PI;
                            if (HouseAzimuth < 0) HouseAzimuth += AngleRounding;
                            console.log("HOUSE AZIMUTH", HouseAzimuth);

                            // const result = extractPlanesRANSACFromDSM({
                            //     heights: MapHeights,
                            //     width: Width,
                            //     height: Length,
                            //     cellSizeX: 0.25,
                            //     cellSizeZ: 0.25,
                            //     mask: ModifiedMask,              // optional
                            //     iterations: 40,
                            //     distanceThreshold: .5, // 0.15,   // vertical/3D plane distance tolerance
                            //     // minInliers: 10,
                            //     // maxPlanes: 20,
                            //     // sampleNeighborhood: 12,

                            //     minInliers: 20,
                            //     maxPlanes: 500,
                            //     sampleNeighborhood: 4,     // 0 = anywhere, >0 = prefer local-ish triplets
                            //     refineIterations: 2,
                            //     minSampleSeparation: 4,    // in pixels
                            //     maxPitchDeg: 89.5,
                            // });

                            // for (const [i, plane] of result.planes.entries()) {
                            //     console.log(
                            //         "Plane", i,
                            //         "pixels:", plane.indices.length,
                            //         "pitch:", plane.pitchDeg.toFixed(2),
                            //         "azimuth:", plane.azimuthDeg.toFixed(2),
                            //         "normal:", plane.normal
                            //     );
                            // }
                            // console.log("oh.");
                            // console.log(result);

                            // let Regions = segmentRoofPlanesByFit(MapHeights, Width, Length, {
                            //     windowSize: 5,
                            //     distThresh: 10, // 0.35,
                            //     normalThreshDeg: 15,
                            //     residualThresh: 10, // 0.35,
                            //     minRegionSize: 8
                            // });
                            // console.log(Regions);

                            // let YES2 = segmentRoofPlanesByFit(NormalizedHeights, Width, Length, {
                            //     minGroupSize: 20,
                            //     maxNeighborHeightDiff: 0.25,
                            //     maxSeedHeightDiff: 1.0,
                            //     minFitPoints: 8,
                            //     maxPlaneResidual: 0.15
                            // })

                            // let YES = segmentRoofPlanesByFit(MapHeights, ModifiedMask, Width, Length, {
                            //     minGroupSize: 16,
                            //     maxNeighborHeightDiff: 5,
                            //     maxSeedHeightDiff: 5,
                            //     minFitPoints: 160,
                            //     maxPlaneResidual: 24 * 2 // 0.15
                            // });

                            // const SlopeX = FITTINGS.map((Fit) => Fit.dYdX * 180 / Math.PI);
                            // const SlopeZ = FITTINGS.map((Fit) => Fit.dYdZ * 180 / Math.PI);

                            // let YES = segmentRoofPlanes(MapHeights, SlopeX, SlopeZ, ModifiedMask, Width, Length, {
                            //     minGroupSize: 8,
                            //     // maxGroupSize: Infinity,

                            //     maxHeightDiff: 10,
                            //     maxSlopeDiff: 4, // 0.08,
                            //     maxSeedHeightDiff: Infinity,
                            //     maxSeedSlopeDiff: 2,

                            //     // minValidHeight: -Infinity,
                            //     // maxValidHeight: Infinity,

                            //     useAverageNormal: true,
                            //     // averageRecheckEvery: 16,
                            //     maxAverageSlopeDiff: .5,
                            // })

                            // let YES = segmentRoofPlanesByFitWithAzimuth(MapHeights, ModifiedMask, Width, Length, {
                            //     minGroupSize: 8,
                            //     maxGroupSize: Infinity,

                            //     minValidHeight: -Infinity,
                            //     maxValidHeight: Infinity,

                            //     maxNeighborHeightDiff: 1, // 250, // mm
                            //     maxSeedHeightDiff: Infinity,

                            //     minFitPoints: 16,
                            //     maxPlaneResidual: .2, // mm

                            //     useAzimuthConstraint: true,
                            //     minAzimuthPoints: 16,
                            //     maxAzimuthDiffDeg: 5, // * Math.PI / 180,
                            // })

                            // let SmartPixels = SmoothPixels; // computeLocalPlaneMaps(MapHeights, ModifiedMask, Width, Length, {
                            //     radius: 1, // Somehow this seems better than 2?
                            //     maxResidual: 150, // mm
                            //     // maxResidual: 15, // mm
                            //     minPoints: 6,
                            //     cellSizeX: 1,
                            //     cellSizeZ: 1,
                            // });
                            // YES.azimuthDegMap

                            // Maybe I can use something that will detect the rare heights and slopes so that it can easily group everything else?
                            let RidgeHeightCounts = [];
                            let RidgeHeights = [];

                            // for (let Index in MapHeights) {
                            //     if (ModifiedMask[Index] == 0) continue;
                            //     let Height = MapHeights[Index];
                            //     let Azimuth = SmoothPixels.azimuthDegMap[Index];
                            //     let Pitch = SmoothPixels.pitch12Map[Index];
                            //     if (Pitch > 1) continue;
                            //     // if (Pitch > 2) continue;
                            //     RidgeHeights.push(Height);
                            //     RidgeHeightCounts[Height] = (RidgeHeightCounts[Height] ?? 0) + 1;
                            // }

                            for (let Index in MapHeights) {
                                if (ModifiedMask[Index] == 0) continue;
                                let Height = MapHeights[Index];
                                let Azimuth = Math.round(AccuratePixels.azimuthDegMap[Index]); // * 180 / Math.PI
                                let Pitch = AccuratePixels.pitch12Map[Index];

                                RidgeHeights.push(Azimuth);
                                RidgeHeightCounts[Azimuth] = (RidgeHeightCounts[Azimuth] ?? 0) + 1;
                            }

                            RidgeHeights.sort((A, B) => A - B);



                            console.log(RidgeHeights, RidgeHeightCounts);

                            // let ExpandedBodies = segmentByNeighborPredicate(SobelMap, Width, Height, (fromIndex: number, toIndex: number, data, newLabels) => {
                            //     const a = Sobel3x3Map[fromIndex];
                            //     const b = Sobel3x3Map[toIndex];

                            //     const a5x5 = Sobel5x5Map[fromIndex];
                            //     const b5x5 = Sobel5x5Map[toIndex];

                            //     if (!a || !b) return false;
                            //     // if (a.chaotic || b.chaotic) return false;

                            //     let aBodyGroupID = BodiesByHeight.labels[fromIndex];
                            //     let bBodyGroupID = BodiesByHeight.labels[toIndex];

                            //     // if (aBodyGroupID != bBodyGroupID && aBodyGroupID != -1 && bBodyGroupID != -1 || aBodyGroupID == -1 && bBodyGroupID == -1) return false;
                            //     // if (aBodyGroupID != bBodyGroupID) return false;
                            //     // if (newLabels[fromIndex] != -1 && newLabels[toIndex] != -1 || newLabels[fromIndex] != newLabels[toIndex]) return false;

                            //     let allowedByParentRules = false;

                            //     // same existing parent group
                            //     if (aBodyGroupID != -1 && bBodyGroupID != -1)
                            //         allowedByParentRules = aBodyGroupID === bBodyGroupID;
                            //     // grouped -> unused OR unused -> grouped
                            //     else if (aBodyGroupID != -1 && (bBodyGroupID == -1 && (newLabels[toIndex] == -1 || newLabels[toIndex] == null)) || (aBodyGroupID == -1 && (newLabels[fromIndex] == -1 || newLabels[fromIndex] == null)) && bBodyGroupID != -1)
                            //         allowedByParentRules = true;

                            //     if (!allowedByParentRules) return false;

                            //     // const dot = a.dYdX * b.dYdX + a.dYdZ * b.dYdZ;
                            //     // const magA = Math.hypot(a.dYdX, a.dYdZ);
                            //     // const magB = Math.hypot(b.dYdX, b.dYdZ);
                            //     // const angle = Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB))));

                            //     const normalDiff = angleBetweenNormals(a.normal, b.normal);
                            //     const slopeDiff = Math.abs(a.slope - b.slope);

                            //     const azimuthDiff = Math.abs(Math.atan2(a.dYdZ, a.dYdX) - Math.atan2(b.dYdZ, b.dYdX))
                            //     const dxDiff = Math.abs(a.dYdX - b.dYdX);
                            //     const dzDiff = Math.abs(a.dYdZ - b.dYdZ);
                            //     const heightDiff = Math.abs(a.height - b.height);

                            //     // 
                            //     // BodiesByHeight.groups

                            //     return true
                            //         // && heightDiff >= slopeDiff
                            //         && (heightDiff <= 1 || heightDiff >= slopeDiff) // .05 // .1 // .05 // .1
                            //         // && 
                            //         // && azimuthDiff <= 30 * Math.PI / 180
                            //         // && dxDiff <= 5 * Math.PI / 180
                            //         // && dzDiff <= 5 * Math.PI / 180
                            //         // && slopeDiff <= .2
                            //         // && normalDiff <= 5 * Math.PI / 180
                            //         ;
                            // }, {
                            //     useDiagonals: true,
                            //     minGroupSize: 9 // 9*4 = 36sq in
                            // });

                            // console.log("YESSSSS", YES);
                            // let Adjacents = listAdjacentGroups(YES.labels, Width, Height);
                            // console.log("Adjacents", Adjacents);

                            // let SlopeGroups  // Grab the neighboring pixels until it has everything similar into it's own groups.

                            // for (let )

                            // if (true) break;


                            for (let Index in MapHeights) {
                                if (ModifiedMask[Index] == 0) {
                                    // DrawHeights.push(0);
                                    // DrawHeights.push(MapHeights[Index]);
                                    DrawHeights.push(Math.min(RoofMinHeight, MapHeights[Index]));
                                    continue;
                                };
                                DrawHeights.push(MapHeights[Index]);
                            }

                            console.log("OM", RoofMinHeight, RoofMaxHeight)

                            console.log("AccuratePixels", AccuratePixels);
                            console.log("edgeMaps", edgeMaps);

                            let CustomLabels = ExpandedBodies.labels; // new Int32Array(YES.labels);
                            let Groups = [];

                            for (let PixelIndex in CustomLabels) {
                                let GroupID = CustomLabels[PixelIndex]; if (GroupID == -1) continue;
                                let Group = Groups[GroupID] ??= [];

                                Group.push({ x: +PixelIndex % Width, y: MapHeights[PixelIndex], z: Math.floor(+PixelIndex / Width), index: PixelIndex })
                            }

                            for (let GroupID in Groups) {
                                let Group = Groups[GroupID];
                                let AzimuthX = 0;
                                let AzimuthZ = 0;
                                let SlopeX = 0;
                                let SlopeZ = 0;
                                let Count = 0;
                                for (let Data of Group) {
                                    let LocalAzimuth = AccuratePixels.azimuthDegMap[Data.index] * Math.PI / 180;
                                    let LocalSlope = SlopePixels.slopeDegMap[Data.index] * Math.PI / 180;
                                    if (!Number.isFinite(LocalAzimuth) || !Number.isFinite(LocalSlope)) continue;
                                    AzimuthX += Math.cos(LocalAzimuth);
                                    AzimuthZ += Math.sin(LocalAzimuth);
                                    SlopeX += Math.cos(LocalSlope);
                                    SlopeZ += Math.sin(LocalSlope);
                                    Count++;
                                }

                                let Azimuth = Math.atan2(AzimuthZ, AzimuthX) * 180 / Math.PI; if (Azimuth < 0) Azimuth += 360;
                                let Slope = Math.atan2(SlopeZ, SlopeX) * 180 / Math.PI; if (Slope < 0) Slope += 360;

                                const Bounds = Vector3.Bounds(Group);
                                const PlaneAngle = CFrame.fromEulerAnglesYXZ(Slope * Math.PI / 180, Azimuth * Math.PI / 180, 0).TranslateAdd(Bounds[1].Average(Bounds[0]));
                                const LocalPositions = Group.map((V3) => PlaneAngle.ToObjectSpace(CFrame.fromVector3(V3)));
                                const LocalBounds = Vector3.Bounds(LocalPositions);
                                const LocalSize = LocalBounds[1].TranslateSub(LocalBounds[0]);
                                console.log("LocalPositions", GroupID, LocalPositions, LocalBounds, LocalSize);
                                // PitySketch.

                                let RUN = LocalSize.Z;
                                let Angle = (360 - Azimuth) * Math.PI / 180;
                                let Sketch = new SketchLine(Editor.ActiveEditor, PlaneAngle.X, PlaneAngle.Y, -PlaneAngle.Z, true); // Info.NE.y); // Math.round(p.y));
                                Sketch.DrawLine.LengthAnchor = 0;
                                Sketch.DrawLine.RunAnchor = 0;
                                Sketch.Start();

                                Sketch.DrawLine.Angle = Angle;
                                Sketch.DrawLine.Length = LocalSize.X;
                                Sketch.DrawLine.PRIMARY = "D";
                                Sketch.DrawLine.PITCH = Math.tan(Slope * Math.PI / 180) * 12;
                                Sketch.DrawLine.RISE = RUN * Math.tan(Slope * Math.PI / 180);
                                Sketch.DrawLine.RUN = RUN;

                                Sketch.Commit();
                                Sketch.Commit();
                                Sketch.DrawLine.UpdateData();
                                Sketch.DrawLine.Update();
                            }

                            // const planes = fitPlanesFromLabels(MapHeights, Width, Length, CustomLabels, {
                            //     cellSizeX: 1,
                            //     cellSizeZ: 1,
                            //     minPixels: 8,
                            //     robustPasses: 1,
                            //     huberDelta: 1.5,
                            // });

                            // for (const plane of planes) {
                            //     if (!plane.valid) continue;

                            //     const segments = extractBoundarySegmentsForLabel(
                            //         Width,
                            //         Length,
                            //         CustomLabels,
                            //         plane.label,
                            //         1,
                            //         1
                            //     );

                            //     const loops = stitchBoundaryLoops(segments);
                            //     if (loops.length === 0) continue;

                            //     // largest loop = outer boundary
                            //     let outer = loops[0];
                            //     let bestArea = -Infinity;

                            //     for (const loop of loops) {
                            //         let area2 = 0;
                            //         for (let i = 0; i < loop.length; i++) {
                            //             const a = loop[i];
                            //             const b = loop[(i + 1) % loop.length];
                            //             area2 += a.x * b.z - b.x * a.z;
                            //         }
                            //         const area = Math.abs(area2) * 0.5;
                            //         if (area > bestArea) {
                            //             bestArea = area;
                            //             outer = loop;
                            //         }
                            //     }

                            //     const verts3D = liftLoopToPlane(outer, plane);

                            //     console.log("plane", plane.label, {
                            //         pitch12: plane.pitch12,
                            //         azimuthDeg: plane.azimuthDeg,
                            //         rmse: plane.rmse,
                            //         verts3D,
                            //     });


                            //     const Bounds = Vector3.Bounds(verts3D);
                            //     const PlaneAngle = CFrame.fromEulerAnglesYXZ(plane.slopeDeg * Math.PI / 180, plane.azimuthDeg * Math.PI / 180, 0).TranslateAdd(Bounds[1].Average(Bounds[0]));
                            //     const LocalPositions = verts3D.map((V3) => PlaneAngle.ToObjectSpace(CFrame.fromVector3(V3)));
                            //     const LocalBounds = Vector3.Bounds(LocalPositions);
                            //     const LocalSize = LocalBounds[1].TranslateSub(LocalBounds[0]);
                            //     console.log("LocalPositions", LocalPositions, LocalBounds, LocalSize);
                            //     // PitySketch.

                            //     let RUN = LocalSize.Z;
                            //     let Angle = (360 - plane.azimuthDeg) * Math.PI / 180;
                            //     let Sketch = new SketchLine(Editor.ActiveEditor, PlaneAngle.X, PlaneAngle.Y, -PlaneAngle.Z, true); // Info.NE.y); // Math.round(p.y));
                            //     Sketch.DrawLine.LengthAnchor = 0;
                            //     Sketch.DrawLine.RunAnchor = 0;
                            //     Sketch.Start();

                            //     Sketch.DrawLine.Angle = Angle;
                            //     Sketch.DrawLine.Length = LocalSize.X;
                            //     Sketch.DrawLine.PRIMARY = "D";
                            //     Sketch.DrawLine.PITCH = Math.tan(plane.slopeDeg * Math.PI / 180) * 12;
                            //     Sketch.DrawLine.RISE = RUN * Math.tan(plane.slopeDeg * Math.PI / 180);
                            //     Sketch.DrawLine.RUN = RUN;

                            //     Sketch.Commit();
                            //     Sketch.Commit();
                            //     Sketch.DrawLine.UpdateData();
                            //     Sketch.DrawLine.Update();
                            // }

                            let roofMaterial = new BABYLON.Material("E", Editor.ActiveEditor.Scene);

                            // const result = buildRoofPlanesBabylon(Editor.ActiveEditor.Scene, MapHeights, Width, Length, CustomLabels, {
                            //     cellSizeX: 1,
                            //     cellSizeZ: 1,
                            //     minPixels: 10,
                            //     robustPasses: 1,
                            //     huberDelta: 1.5,
                            //     // material: roofMaterial,
                            // });

                            // for (const face of result.faces) {
                            //     console.log(face.label, face.plane.pitch12, face.plane.azimuthDeg, face.plane.rmse);
                            //     let PlaneAngle = CFrame.Angles(0, face.plane.azimuthDeg*Math.PI/180, 0);


                            //     let PitySketch = new SketchLine(Editor.ActiveEditor, 0, 0, 0, true);
                            // }

                            // console.log(result);

                            {
                                const canvas = document.createElement('canvas')
                                canvas.width = Width
                                canvas.height = Length
                                const ctx = canvas.getContext('2d')

                                // Convert RGB to RGBA by adding alpha channel
                                const rgba = new Uint8ClampedArray(Width * Length * 4);
                                // console.log("LENGTH OF RGB???", width, height, rasters.length, rasters)
                                for (let i = 0, j = 0, k = 0; i < Width * Length; i++, j += 4, k += 3) {
                                    // let HeightAtPixel = NormalizedHeights[i];
                                    // let HeightAtPixelSimp = Math.round(NormalizedHeights[i] / 10);
                                    // let Most = HeightCounts[0];
                                    // let MostSimp = HeightCountsSimp[0];
                                    // rgba[j] = +Most.Height == HeightAtPixel ? 255 : 0; // rasters[0][i];       // R
                                    // let N = Math.max(0, Math.floor(HeightAtPixel));
                                    // let HSV = BABYLON.Color3.FromHSV(HeightAtPixel / ((maxValue - minValue) * 1000) * 270, 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV(CountHeights[HeightAtPixel] / Most.Count * 270, 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV(CountHeightsSimp[HeightAtPixelSimp] / MostSimp.Count * 270, 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV(Math.min(Slopes[i] / Math.min(MaxSlope, 1), 1) * 270, 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV(((Slopes[i] - MinSlope) / (MaxSlope - MinSlope) * 360), 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV((Math.atan2(Slopes[i], 12) * 180 / Math.PI) * 4, 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV(CountSlopes[Slopes[i]] / SlopeCounts[0].Count * 270, 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV((Slopes[i] - MinSlope) / ((MaxSlope - MinSlope)) * 360, 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV((Slopes[i] * 180 / Math.PI + 180) % 360, 1, 1);
                                    // let Sobel = SobelMap[i];
                                    // let Chaos = ChaosData[i];
                                    // let Sobel3x3 = Sobel3x3Map[i];
                                    // let Sobel5x5 = Sobel5x5Map[i];

                                    let Fit = FITTINGS[i];
                                    let Azimuth = (Math.atan2(Fit?.dYdX, -Fit?.dYdZ) * 180 / Math.PI + 180) % 360;
                                    let Pitch = Fit.slope / 10 * 12;
                                    // let SLOPE = 24; // / 12; // 24/12;
                                    // let HSV = BABYLON.Color3.FromHSV(Math.min(Sobel3x3.slope, SLOPE) / SLOPE * 360, 1, 1);
                                    // let HSV = BABYLON.Color3.FromHSV(Azimuth, 1 - (Math.min(CapSlope, Slopes[i]) - MinSlope) / ((MaxSlope - MinSlope)), HeightAtPixel / ((maxValue - minValue) * 100));
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth,
                                    //     1, // Math.min(Pitch, 12) / 12,
                                    //     1 //HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth,
                                    //     Pitch > 21 ? 0 : 1,
                                    //     HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth,
                                    //     Sobel.TOP ? 1 : 0, // 1 - Math.min(Math.abs(Chaos.averageSlopeAngleDifferenceDegrees) / 5, 1),
                                    //     // 1 - Math.min(Math.abs(Chaos.averageSlope) / 24, 1),
                                    //     HeightAtPixel / ((maxValue - minValue) * 1000)
                                    // );
                                    // YES.
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     YES2.labels[i] == -1 ? 0 : YES2.labels[i] / (YES2.groupLabels.length) * 360,
                                    //     // 1 - Math.min(24, Pitch) / 24, // 1,
                                    //     1,
                                    //     YES2.labels[i] == -1 ? 0 : 1
                                    // )
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     YES.labels[i] == -1 ? 0 : YES.labels[i] / (YES.groupLabels.length) * 360,
                                    //     // 1 - Math.min(24, Pitch) / 24, // 1,
                                    //     1,
                                    //     YES.labels[i] == -1 ? 0 : 1
                                    // )
                                    let HSV = BABYLON.Color3.FromHSV(
                                        // ExpandedBodies.labels[i] == -1 ? 0 : ExpandedBodies.labels[i] / (ExpandedBodies.groupLabels.length) * 360,
                                        ExpandedBodies.labels[i] == -1 ? 0 : ExpandedBodies.labels[i] / (YES.groupLabels.length) * 360,
                                        // 1 - Math.min(24, Pitch) / 24, // 1,
                                        ExpandedBodies.labels[i] == -1 ? 0 : 1,
                                        ModifiedMask[i] // ExpandedBodies.labels[i] == -1 ? 0 : 1
                                    )
                                    // SlopePixels
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     AccuratePixels.azimuthDegMap[i],
                                    //     Math.min(AccuratePixels.pitch12Map[i], 12) / 12,
                                    //     ModifiedMask[i] // * (1 - Math.max(0, Fit.RMSE / 10)) // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // field
                                    // HSV = BABYLON.Color3.FromHSV(
                                    //     field.azimuthDegMap[i],
                                    //     Math.min(field.pitch12Map[i], 12) / 12,
                                    //     ModifiedMask[i] // * (1 - Math.max(0, Fit.RMSE / 10)) // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // HSV = BABYLON.Color3.FromHSV(
                                    //     (180 - SmoothPixels.azimuthDegMap[i] + 360) % 360,
                                    //     Math.min(SmoothPixels.pitch12Map[i], 12) / 12,
                                    //     ModifiedMask[i] // * (1 - Math.max(0, Fit.RMSE / 10)) // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // AccuratePixels.azimuthDegMap

                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     (Math.atan(Sobel5x5.slope) * 180 / Math.PI) / 90 * 360,
                                    //     // 1 - Math.min(24, Pitch) / 24, // 1,
                                    //     1, // 1,
                                    //     1, // YES.labels[i] == -1 ? 0 : 1
                                    // )

                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth,
                                    //     Math.min(Pitch, 12) / 12,
                                    //     ModifiedMask[i] // * (1 - Math.max(0, Fit.RMSE / 10)) // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth,
                                    //     Math.min(Pitch, 12) / 12,
                                    //     1 - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    let Relativity = (MapHeights[i] - RoofMinHeight) / (RoofMaxHeight - RoofMinHeight); // HouseAzimuth
                                    let SmoothAzimuth = AccuratePixels.valid[i] == 1 ? AccuratePixels.azimuthDegMap[i] : HouseAzimuth;
                                    let RoundedAzimuth = (HouseAzimuth + Math.round((SmoothAzimuth - HouseAzimuth) / AngleRounding) * AngleRounding + 360) % 360;
                                    // HSV = BABYLON.Color3.FromHSV(
                                    //     RoundedAzimuth,
                                    //     1, // Math.min(SmoothPixels.pitch12Map[i], 12) / 12, // ModifiedMask[i], // 
                                    //     SmartPixels.valid[i] // Relativity // - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );


                                    // HSV = BABYLON.Color3.FromHSV(
                                    //     AccuratePixels.azimuthDegMap[i],
                                    //     Math.min(SlopePixels.pitch12Map[i], 12) / 12, // ModifiedMask[i], // 
                                    //     ModifiedMask[i] // Relativity // - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );


                                    // HSV = BABYLON.Color3.FromHSV(
                                    //     edgeMaps.edgeTypeMap[i] / 8 * 360,
                                    //     1, //edgeMaps.edgeTypeMap[i] == 6 ? 0 : 1, // Math.min(SmoothPixels.pitch12Map[i], 12) / 12, // ModifiedMask[i], // 
                                    //     ModifiedMask[i] // Relativity // - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // HSV = BABYLON.Color3.FromHSV(
                                    //     edgeMaps.labelMap[i] / 8 * 360,
                                    //     1, // edgeMaps.edgeTypeMap[i] == 6 ? 0 : 1, // Math.min(SmoothPixels.pitch12Map[i], 12) / 12, // ModifiedMask[i], // 
                                    //     AccuratePixels.valid[i] // AccuratePixels.valid[i] == 1 ? edgeMaps.strengthMap[i] : 0 // Relativity // - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );





                                    // if (HSV.r == 0 && HSV.g == 0 && HSV.b == 0) {
                                    //     console.log("wtf?", SmoothAzimuth, RoundedAzimuth);
                                    // }
                                    // HSV = BABYLON.Color3.FromHSV(
                                    //     SmartPixels.azimuthDegMap[i],
                                    //     Math.min(SmoothPixels.pitch12Map[i], 12) / 12, // ModifiedMask[i], // 
                                    //     1 // Relativity // - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );


                                    // HSV = BABYLON.Color3.FromHSV(
                                    //     // (Math.atan2(DifferencePixels.azimuthDiffZ[i], -DifferencePixels.azimuthDiffX[i]) * 180 / Math.PI) % 360,
                                    //     // (Math.atan2(DifferencePixels.normalDiffZ[i], -DifferencePixels.normalDiffX[i]) * 180 / Math.PI) % 360,
                                    //     // (Math.atan2(DifferencePixels.slopeDiffZ[i], -DifferencePixels.slopeDiffX[i]) * 180 / Math.PI) % 360,
                                    //     DifferencePixels.slopeEdgeStrength[i] * 15,
                                    //     1, // Math.min(SmoothPixels.pitch12Map[i], 12) / 12, // ModifiedMask[i], // 
                                    //     1 // Relativity // - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );

                                    // DifferencePixels

                                    // FITDIFF
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth, // SmartPixels.azimuthDegMap[i],
                                    //     (RidgeHeightCounts[Math.round(SmoothPixels.azimuthDegMap[i])] ?? 0) > 100 ? 1 : 0,
                                    //     Relativity // - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Relativity * 360,
                                    //     ModifiedMask[i], // SmoothPixels.pitch12Map[i] < 2 ? 1 : 0,
                                    //     0 <= Relativity && Relativity <= 1 ? 1 : 0 // - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );

                                    // Fit.c Fit.RMSE

                                    // let GroupID = result.assignedPlaneIndex[i]; // result
                                    // let Group = result.planes[GroupID];
                                    // let GroupID = Regions.regionId[i]; // result
                                    // let Group = Regions.regions[GroupID];

                                    // Azimuth = (Math.atan2((Regions.normals[i]?.nx ?? 0), -(Regions.normals[i]?.ny ?? 0)) * 180 / Math.PI + 180) % 360;

                                    // Regions
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth, // ((Regions.normals[i]?.nz ?? 0) * 180 / Math.PI + 180) % 360, // a,b,c | nx,ny,nz | residual
                                    //     // 1 - Math.min(24, Pitch) / 24, // 1,
                                    //     1,
                                    //     1
                                    // )
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     GroupID == -1 ? 0 : GroupID / (Regions.regions.length) * 360,
                                    //     // 1 - Math.min(24, Pitch) / 24, // 1,
                                    //     1,
                                    //     GroupID == -1 ? 0 : 1
                                    // )

                                    if (AccuratePixels.valid[i] == 1) { //YES.labels[i] == -1) {
                                        DrawRGB[k] = Math.round(HSV.r * 255);
                                        DrawRGB[k + 1] = Math.round(HSV.g * 255);
                                        DrawRGB[k + 2] = Math.round(HSV.b * 255);
                                    }

                                    rgba[j] = Math.round(HSV.r * 255);
                                    rgba[j + 1] = Math.round(HSV.g * 255);
                                    rgba[j + 2] = Math.round(HSV.b * 255);
                                    rgba[j + 3] = 255;      // A (opaque)

                                    // rgba[j] = KissMyAss.RGB[k] * Relativity;
                                    // rgba[j + 1] = KissMyAss.RGB[k + 1] * Relativity;
                                    // rgba[j + 2] = KissMyAss.RGB[k + 2] * Relativity;
                                    // rgba[j + 3] = 0 < Relativity && Relativity < 1 ? 255 : 0 // ModifiedMask[i] * 255;      // A (opaque)
                                }

                                // createGroundFromHeightArray("E", DrawHeights, DrawRGB, Width, Length, 39.3701 / 10, 39.3701 / 10, Editor.ActiveEditor.Scene);

                                // console.log("RGBA", rgba);

                                const imageData = new ImageData(rgba, Width, Length)
                                ctx.putImageData(imageData, 0, 0)

                                // Convert canvas to PNG bytes
                                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))

                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "eeee.png"; //filename ?? `Estimate_${data.projectName.replace(/\s+/g, "_")}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);

                                // const pngBytes = new Uint8Array(await blob.arrayBuffer())

                                // let RGB_Index = await NewPDF.AddImage(pngBytes);
                                // NewPDF.PageIndex = 0;
                                // NewPDF.DrawImage(RGB_Index);
                            }
                        });

                        fileInput.click();







                        console.log("um?");
                        break;

                    // case "i":

                    //     break;


                    case "e":
                        ChangingPitch = true;
                        Camera.lowerRadiusLimit = Camera.radius;
                        Camera.upperRadiusLimit = Camera.radius;
                        break;

                    case "shift":
                        console.log("Shift is down");
                        HoldingShift = true;
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;

                    // case "Escape":
                    //     PanelViewCollapsed = !PanelViewCollapsed;
                    //     let RoofingEditor = window.document.getElementById("RoofingEditor") as HTMLElement;
                    //     let PanelViewer = window.document.getElementById("PanelViewer") as HTMLElement;
                    //     // FlatMapElement.style.marginLeft =
                    //     RoofingEditor.style.marginLeft = PanelViewCollapsed ? "0%" : "30%";
                    //     RoofingEditor.style.width = PanelViewCollapsed ? "100%" : "70%";
                    //     PanelViewer.style.marginRight = PanelViewCollapsed ? "0%" : "70%";
                    //     PanelViewer.style.width = PanelViewCollapsed ? "0%" : "30%";
                    //     Engine.resize();
                    //     this.PanelEngine?.resize();
                    //     updateOrtho();
                    //     console.log("Escape key pressed");
                    //     break;
                }
            }

            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
                // console.log("Released:", kbInfo.event.key);
                switch (kbInfo.event.key.toLowerCase()) {
                    case "shift":
                        HoldingShift = false;
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;

                    case "e":
                        ChangingPitch = false;
                        Camera.lowerRadiusLimit = 10;
                        Camera.upperRadiusLimit = null;
                        break;
                }
            }
        });

        // EditorUI.onControlPickedObservable.add(control => {
        //     // if (!control.isPointerBlocker) return;
        //     // CanDraw = false;
        //     console.log("ON", control);
        //     // Camera.detachControl();
        // });

        // EditorUI.executeOnAllControls(control => {
        //     console.log("Idk", control);
        //     // if (!control.isPointerBlocker) return;
        //     // control.onPointerOutObservable.add(() => {
        //     //     CanDraw = true;
        //     //     console.log(CanDraw);
        //     //     // Camera.attachControl(true);
        //     // });
        // });

        // EditorUI.isPointerBlocker = true;

        // let Rectangle0 = EditorUI.getControlByName("Rectangle0");
        // Rectangle0.isPointerBlocker = true;

        // console.log(Rectangle0);

        // Rectangle0.onPointerClickObservable.add(control => {
        //     // if (!control.isPointerBlocker) return;
        //     CanDraw = false;
        //     console.log("ON", control);
        //     // Camera.detachControl();
        // });

        // Rectangle0.onPointerClickObservable.add(control => {
        //     // if (!control.isPointerBlocker) return;
        //     CanDraw = false;
        //     console.log("ON", control);
        //     // Camera.detachControl();
        // });

        // EditorUI.onControlPickedObservable.add(control => {
        //     if (control.isPointerBlocker) {
        //         CanDraw = false;
        //         // Camera.detachControl();
        //     }
        // });

        // EditorUI.executeOnAllControls(control => {
        //     if (control.isPointerBlocker) {
        //         control.onPointerOutObservable.add(() => {
        //             CanDraw = true;
        //             // Camera.attachControl(true);
        //         });
        //     }
        // });

        // setTimeout(() => {
        //     UI_Controls.Rectangle1.isPointerBlocker = true;
        // }, 500);

        // function UpdateDrawing() {
        //     let Y0 = UI_Controls.Checkbox0.isChecked ? ((UI_Controls.Checkbox2.isChecked && UI_Controls.Checkbox3.isChecked) ? "160px" : "128px") : "192px";
        //     UI_Controls.Line.y1 = Y0;
        //     UI_Controls.Line0A.y2 = Y0;
        //     UI_Controls.Line0B.y2 = Y0;

        //     let Y1 = UI_Controls.Checkbox1.isChecked ? ((UI_Controls.Checkbox2.isChecked && UI_Controls.Checkbox3.isChecked) ? "32px" : "64px") : "0px";
        //     UI_Controls.Line.y2 = Y1;
        //     UI_Controls.Line1A.y2 = Y1;
        //     UI_Controls.Line1B.y2 = Y1;

        //     // console.log(UI_Controls.Line);
        //     UI_Controls.Line.lineWidth = (UI_Controls.Checkbox2.isChecked && UI_Controls.Checkbox3.isChecked) ? 1 : 3;

        //     let LineX = UI_Controls.Checkbox2.isChecked ? (UI_Controls.Checkbox3.isChecked ? "32px" : "64px") : "0px";
        //     UI_Controls.Line.x1 = LineX
        //     UI_Controls.Line.x2 = LineX;
        //     UI_Controls.Line1A.x2 = LineX;
        //     UI_Controls.Line1B.x2 = LineX;
        //     UI_Controls.Line0A.x2 = LineX;
        //     UI_Controls.Line0B.x2 = LineX;

        //     UI_Controls.Textblock0.isVisible = UI_Controls.Checkbox0.isChecked;
        //     UI_Controls.Textblock1.isVisible = UI_Controls.Checkbox1.isChecked;
        //     UI_Controls.Textblock2.isVisible = UI_Controls.Checkbox2.isChecked;
        //     UI_Controls.Textblock3.isVisible = UI_Controls.Checkbox3.isChecked;
        // };

        // UpdateDrawing();

        // UI_Controls.Primary0.getChildByName()
        PrimaryText0.text = "RUN";
        PrimaryText1.text = "RUN";

        // UI_Controls.Primary0.onPointerClickObservable.add(function (eventData, eventState) {
        //     let TEXT = PrimaryText0.text;
        //     PrimaryText0.text = (TEXT == "RUN") ? "RISE" : (TEXT == "RISE") ? "PITCH" : (TEXT == "PITCH") ? "RUN" : "N/A";
        //     if (!SketchLine.ActiveSketch) return;
        //     SketchLine.ActiveSketch.Lines["0"].PRIMARY = PrimaryText0.text;
        // });

        // // console.log(UI_Controls.Rise0);
        // // UI_Controls.Rise0.onTextChangedObservable.add(function (test) {
        // //     console.log("TEST", test.text == +test.text);
        // // });

        // // UI_Controls.Rise0.onEnterPressedObservable.add(function (test) {
        // //     console.log("TEST2", test.text == +test.text);
        // // });

        // // UI_Controls.Rise0.onPointerUpObservable.add(function (test) {
        // //     console.log("EEE", test);
        // //     // console.log("TEST3", test.text == +test.text);
        // // });
    }
}