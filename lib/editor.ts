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

// import * as TESTING_HEIGHTs from "./testing.json";
// import * as TESTING_HEIGHTs from "./testing-library.json";
// import * as TESTING_HEIGHTs from "./testing-giant.json";
// import * as TESTING_HEIGHTs from "./testing-me.json";
// import * as TESTING_HEIGHTs from "./testing-john.json";
import * as TESTING_HEIGHTs from "./testing-mansion.json";
// import * as TESTING_HEIGHTs from "./testing-mrq.json";
import TestingConfig from "./EditorUI.json";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Test } from "./backend"; // DebuggingClass

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



































        // function segmentByNeighborPredicate(data, width, height, shouldConnect, options = {}) {
        //     const useDiagonals = options.useDiagonals ?? true;
        //     const minGroupSize = options.minGroupSize ?? 1;
        //     const maxGroupSize = options.maxGroupSize ?? Infinity;

        //     const labels = new Int32Array(data.length);
        //     labels.fill(-1);

        //     const assigned = new Uint8Array(data.length);
        //     const groups = [];
        //     let nextLabel = 0;

        //     function getNeighbors(index) {
        //         const x = index % width;
        //         const z = Math.floor(index / width);
        //         const neighbors = [];

        //         if (useDiagonals) {
        //             for (let dz = -1; dz <= 1; dz++) {
        //                 for (let dx = -1; dx <= 1; dx++) {
        //                     if (dx === 0 && dz === 0) continue;

        //                     const nx = x + dx;
        //                     const nz = z + dz;

        //                     if (nx >= 0 && nx < width && nz >= 0 && nz < height) {
        //                         neighbors.push(nz * width + nx);
        //                     }
        //                 }
        //             }
        //         } else {
        //             if (x > 0) neighbors.push(index - 1);
        //             if (x < width - 1) neighbors.push(index + 1);
        //             if (z > 0) neighbors.push(index - width);
        //             if (z < height - 1) neighbors.push(index + width);
        //         }

        //         return neighbors;
        //     }

        //     for (let startIndex = 0; startIndex < data.length; startIndex++) {
        //         if (assigned[startIndex]) continue;
        //         if (!data[startIndex]) continue;
        //         assigned[startIndex] = 1;

        //         if (!shouldConnect(startIndex, startIndex, null, labels, -1, startIndex)) {
        //             continue;
        //         }

        //         const stack = [startIndex];
        //         const queued = new Uint8Array(data.length);
        //         queued[startIndex] = 1;

        //         const indices = [];
        //         labels[startIndex] = nextLabel;
        //         assigned[startIndex] = 1;

        //         while (stack.length > 0) {
        //             const current = stack.pop();
        //             indices.push(current);

        //             for (const ni of getNeighbors(current)) {
        //                 if (assigned[ni] || queued[ni]) continue;

        //                 if (!shouldConnect(current, ni, indices, labels, current, startIndex)) {
        //                     continue;
        //                 }

        //                 queued[ni] = 1;
        //                 labels[ni] = nextLabel;
        //                 assigned[ni] = 1;
        //                 stack.push(ni);
        //             }
        //         }

        //         if (indices.length < minGroupSize || indices.length > maxGroupSize) {
        //             for (const index of indices) {
        //                 labels[index] = -1;
        //                 assigned[index] = 0;
        //             }
        //             continue;
        //         }

        //         groups.push({
        //             label: nextLabel,
        //             indices
        //         });

        //         nextLabel++;
        //     }

        //     return {
        //         labels,
        //         groups
        //     };
        // }

        // function segmentByNeighborPredicate(data, width, height, shouldConnect: (fromIndex: number, toIndex: number) => boolean, options = {}) {
        //     const minGroupSize = options.minGroupSize ?? 1;
        //     const maxGroupSize = options.maxGroupSize ?? Infinity;

        //     const labels = new Int32Array(data.length);
        //     labels.fill(-1);

        //     const assigned = new Uint8Array(data.length);
        //     const groups = [];
        //     let nextLabel = 0;

        //     for (let startIndex = 0; startIndex < data.length; startIndex++) {
        //         if (assigned[startIndex]) continue;
        //         if (!data[startIndex]) continue;

        //         assigned[startIndex] = 1;

        //         if (!shouldConnect(startIndex, startIndex, null, labels, -1, startIndex)) {
        //             continue;
        //         }

        //         const stack = [startIndex];
        //         const queued = new Uint8Array(data.length);
        //         queued[startIndex] = 1;

        //         const indices = [];
        //         labels[startIndex] = nextLabel;

        //         const neighborOffsets = [
        //             [-1, -1], [0, -1], [1, -1],
        //             [-1,  0],          [1,  0],
        //             [-1,  1], [0,  1], [1,  1]
        //         ];

        //         while (stack.length > 0) {
        //             const current = stack.pop();
        //             indices.push(current);

        //             const x = current % width;
        //             const z = Math.floor(current / width);

        //             for (let k = 0; k < 8; k++) {
        //                 const nx = x + neighborOffsets[k][0];
        //                 const nz = z + neighborOffsets[k][1];

        //                 if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

        //                 const ni = nz * width + nx;

        //                 if (assigned[ni] || queued[ni]) continue;
        //                 if (!shouldConnect(current, ni, indices, labels, current, startIndex)) continue;

        //                 queued[ni] = 1;
        //                 labels[ni] = nextLabel;
        //                 assigned[ni] = 1;
        //                 stack.push(ni);
        //             }
        //         }

        //         if (indices.length < minGroupSize || indices.length > maxGroupSize) {
        //             for (const index of indices) {
        //                 labels[index] = -1;
        //                 assigned[index] = 0;
        //             }
        //             continue;
        //         }

        //         groups.push({
        //             label: nextLabel,
        //             indices
        //         });

        //         nextLabel++;
        //     }

        //     return {
        //         labels,
        //         groups
        //     };
        // }

        // function segmentByNeighborPredicate(data, width, height, shouldConnect, options = {}) {
        //     const minGroupSize = options.minGroupSize ?? 1;
        //     const maxGroupSize = options.maxGroupSize ?? Infinity;

        //     const size = data.length;

        //     const labels = new Int32Array(size);
        //     labels.fill(-1);

        //     const assigned = new Uint8Array(size);
        //     const queued = new Uint32Array(size);

        //     const stack = new Int32Array(size);
        //     const groupBuffer = new Int32Array(size);

        //     const groups = [];

        //     let nextLabel = 0;
        //     let queueStamp = 1;

        //     for (let startIndex = 0; startIndex < size; startIndex++) {
        //         if (assigned[startIndex]) continue;
        //         if (!data[startIndex]) continue;

        //         assigned[startIndex] = 1;

        //         if (!shouldConnect(startIndex, startIndex, groupBuffer, 0, labels, -1, startIndex)) {
        //             continue;
        //         }

        //         let stackSize = 0;
        //         let groupSize = 0;

        //         stack[stackSize++] = startIndex;
        //         queued[startIndex] = queueStamp;
        //         labels[startIndex] = nextLabel;

        //         while (stackSize > 0) {
        //             const current = stack[--stackSize];
        //             groupBuffer[groupSize++] = current;

        //             const x = current % width;
        //             const z = (current / width) | 0;

        //             let ni;

        //             if (x > 0 && z > 0) {
        //                 ni = current - width - 1;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stack[stackSize++] = ni;
        //                 }
        //             }

        //             if (z > 0) {
        //                 ni = current - width;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stack[stackSize++] = ni;
        //                 }
        //             }

        //             if (x < width - 1 && z > 0) {
        //                 ni = current - width + 1;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stack[stackSize++] = ni;
        //                 }
        //             }

        //             if (x > 0) {
        //                 ni = current - 1;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stack[stackSize++] = ni;
        //                 }
        //             }

        //             if (x < width - 1) {
        //                 ni = current + 1;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stack[stackSize++] = ni;
        //                 }
        //             }

        //             if (x > 0 && z < height - 1) {
        //                 ni = current + width - 1;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stack[stackSize++] = ni;
        //                 }
        //             }

        //             if (z < height - 1) {
        //                 ni = current + width;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stack[stackSize++] = ni;
        //                 }
        //             }

        //             if (x < width - 1 && z < height - 1) {
        //                 ni = current + width + 1;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stack[stackSize++] = ni;
        //                 }
        //             }
        //         }

        //         if (groupSize < minGroupSize || groupSize > maxGroupSize) {
        //             for (let i = 0; i < groupSize; i++) {
        //                 const index = groupBuffer[i];
        //                 labels[index] = -1;
        //                 assigned[index] = 0;
        //             }
        //             queueStamp++;
        //             continue;
        //         }

        //         const indices = new Int32Array(groupSize);
        //         indices.set(groupBuffer.subarray(0, groupSize));

        //         groups.push({
        //             label: nextLabel,
        //             indices
        //         });

        //         nextLabel++;
        //         queueStamp++;
        //     }

        //     return { labels, groups };
        // }

        // function segmentByNeighborPredicate(data, width, height, shouldConnect, options = {}) {
        //     const minGroupSize = options.minGroupSize ?? 1;
        //     const maxGroupSize = options.maxGroupSize ?? Infinity;

        //     const size = data.length;

        //     const labels = new Int32Array(size);
        //     labels.fill(-1);

        //     const assigned = new Uint8Array(size);
        //     const queued = new Uint32Array(size);

        //     const stackIndex = new Int32Array(size);
        //     const stackX = new Int32Array(size);
        //     const stackZ = new Int32Array(size);

        //     const groupBuffer = new Int32Array(size);
        //     const groups = [];

        //     let nextLabel = 0;
        //     let queueStamp = 1;

        //     for (let startIndex = 0, startZ = 0, startX = 0; startIndex < size; startIndex++) {
        //         if (assigned[startIndex]) {
        //             startX++;
        //             if (startX === width) {
        //                 startX = 0;
        //                 startZ++;
        //             }
        //             continue;
        //         }

        //         if (!data[startIndex]) {
        //             startX++;
        //             if (startX === width) {
        //                 startX = 0;
        //                 startZ++;
        //             }
        //             continue;
        //         }

        //         assigned[startIndex] = 1;

        //         if (!shouldConnect(startIndex, startIndex, groupBuffer, 0, labels, -1, startIndex)) {
        //             startX++;
        //             if (startX === width) {
        //                 startX = 0;
        //                 startZ++;
        //             }
        //             continue;
        //         }

        //         let stackSize = 0;
        //         let groupSize = 0;

        //         stackIndex[stackSize] = startIndex;
        //         stackX[stackSize] = startX;
        //         stackZ[stackSize] = startZ;
        //         stackSize++;

        //         queued[startIndex] = queueStamp;
        //         labels[startIndex] = nextLabel;

        //         while (stackSize > 0) {
        //             stackSize--;

        //             const current = stackIndex[stackSize];
        //             const x = stackX[stackSize];
        //             const z = stackZ[stackSize];

        //             groupBuffer[groupSize++] = current;

        //             let ni;

        //             if (z > 0) {
        //                 const up = current - width;

        //                 if (x > 0) {
        //                     ni = up - 1;
        //                     if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                         shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                         queued[ni] = queueStamp;
        //                         labels[ni] = nextLabel;
        //                         assigned[ni] = 1;
        //                         stackIndex[stackSize] = ni;
        //                         stackX[stackSize] = x - 1;
        //                         stackZ[stackSize] = z - 1;
        //                         stackSize++;
        //                     }
        //                 }

        //                 ni = up;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stackIndex[stackSize] = ni;
        //                     stackX[stackSize] = x;
        //                     stackZ[stackSize] = z - 1;
        //                     stackSize++;
        //                 }

        //                 if (x < width - 1) {
        //                     ni = up + 1;
        //                     if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                         shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                         queued[ni] = queueStamp;
        //                         labels[ni] = nextLabel;
        //                         assigned[ni] = 1;
        //                         stackIndex[stackSize] = ni;
        //                         stackX[stackSize] = x + 1;
        //                         stackZ[stackSize] = z - 1;
        //                         stackSize++;
        //                     }
        //                 }
        //             }

        //             if (x > 0) {
        //                 ni = current - 1;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stackIndex[stackSize] = ni;
        //                     stackX[stackSize] = x - 1;
        //                     stackZ[stackSize] = z;
        //                     stackSize++;
        //                 }
        //             }

        //             if (x < width - 1) {
        //                 ni = current + 1;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stackIndex[stackSize] = ni;
        //                     stackX[stackSize] = x + 1;
        //                     stackZ[stackSize] = z;
        //                     stackSize++;
        //                 }
        //             }

        //             if (z < height - 1) {
        //                 const down = current + width;

        //                 if (x > 0) {
        //                     ni = down - 1;
        //                     if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                         shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                         queued[ni] = queueStamp;
        //                         labels[ni] = nextLabel;
        //                         assigned[ni] = 1;
        //                         stackIndex[stackSize] = ni;
        //                         stackX[stackSize] = x - 1;
        //                         stackZ[stackSize] = z + 1;
        //                         stackSize++;
        //                     }
        //                 }

        //                 ni = down;
        //                 if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stackIndex[stackSize] = ni;
        //                     stackX[stackSize] = x;
        //                     stackZ[stackSize] = z + 1;
        //                     stackSize++;
        //                 }

        //                 if (x < width - 1) {
        //                     ni = down + 1;
        //                     if (!assigned[ni] && queued[ni] !== queueStamp &&
        //                         shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)) {
        //                         queued[ni] = queueStamp;
        //                         labels[ni] = nextLabel;
        //                         assigned[ni] = 1;
        //                         stackIndex[stackSize] = ni;
        //                         stackX[stackSize] = x + 1;
        //                         stackZ[stackSize] = z + 1;
        //                         stackSize++;
        //                     }
        //                 }
        //             }
        //         }

        //         if (groupSize < minGroupSize || groupSize > maxGroupSize) {
        //             for (let i = 0; i < groupSize; i++) {
        //                 const index = groupBuffer[i];
        //                 labels[index] = -1;
        //                 assigned[index] = 0;
        //             }

        //             queueStamp++;

        //             startX++;
        //             if (startX === width) {
        //                 startX = 0;
        //                 startZ++;
        //             }
        //             continue;
        //         }

        //         const indices = new Int32Array(groupSize);
        //         indices.set(groupBuffer.subarray(0, groupSize));

        //         groups.push({
        //             label: nextLabel,
        //             indices
        //         });

        //         nextLabel++;
        //         queueStamp++;

        //         startX++;
        //         if (startX === width) {
        //             startX = 0;
        //             startZ++;
        //         }
        //     }

        //     return { labels, groups };
        // }

        // function segmentByNeighborPredicate(data, width, height, shouldConnect, options = {}) {
        //     const minGroupSize = options.minGroupSize ?? 1;
        //     const maxGroupSize = options.maxGroupSize ?? Infinity;

        //     const size = data.length;

        //     const labels = new Int32Array(size);
        //     labels.fill(-1);

        //     const assigned = new Uint8Array(size);
        //     const queued = new Uint32Array(size);

        //     const stackIndex = new Int32Array(size);
        //     const stackX = new Int32Array(size);
        //     const stackZ = new Int32Array(size);

        //     const groupBuffer = new Int32Array(size);

        //     // flat storage for all accepted group indices
        //     const allGroupIndices = new Int32Array(size);
        //     let allGroupIndicesCount = 0;

        //     const groupLabels = [];
        //     const groupStarts = [];
        //     const groupLengths = [];

        //     let nextLabel = 0;
        //     let queueStamp = 1;

        //     for (let startIndex = 0, startZ = 0, startX = 0; startIndex < size; startIndex++) {
        //         if (assigned[startIndex] || !data[startIndex]) {
        //             startX++;
        //             if (startX === width) {
        //                 startX = 0;
        //                 startZ++;
        //             }
        //             continue;
        //         }

        //         assigned[startIndex] = 1;

        //         if (!shouldConnect(startIndex, startIndex, groupBuffer, 0, labels, -1, startIndex)) {
        //             startX++;
        //             if (startX === width) {
        //                 startX = 0;
        //                 startZ++;
        //             }
        //             continue;
        //         }

        //         let stackSize = 0;
        //         let groupSize = 0;

        //         stackIndex[stackSize] = startIndex;
        //         stackX[stackSize] = startX;
        //         stackZ[stackSize] = startZ;
        //         stackSize++;

        //         queued[startIndex] = queueStamp;
        //         labels[startIndex] = nextLabel;

        //         while (stackSize > 0) {
        //             stackSize--;

        //             const current = stackIndex[stackSize];
        //             const x = stackX[stackSize];
        //             const z = stackZ[stackSize];

        //             groupBuffer[groupSize++] = current;

        //             let ni;

        //             if (z > 0) {
        //                 const up = current - width;

        //                 if (x > 0) {
        //                     ni = up - 1;
        //                     if (
        //                         !assigned[ni] &&
        //                         queued[ni] !== queueStamp &&
        //                         shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
        //                     ) {
        //                         queued[ni] = queueStamp;
        //                         labels[ni] = nextLabel;
        //                         assigned[ni] = 1;
        //                         stackIndex[stackSize] = ni;
        //                         stackX[stackSize] = x - 1;
        //                         stackZ[stackSize] = z - 1;
        //                         stackSize++;
        //                     }
        //                 }

        //                 ni = up;
        //                 if (
        //                     !assigned[ni] &&
        //                     queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
        //                 ) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stackIndex[stackSize] = ni;
        //                     stackX[stackSize] = x;
        //                     stackZ[stackSize] = z - 1;
        //                     stackSize++;
        //                 }

        //                 if (x < width - 1) {
        //                     ni = up + 1;
        //                     if (
        //                         !assigned[ni] &&
        //                         queued[ni] !== queueStamp &&
        //                         shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
        //                     ) {
        //                         queued[ni] = queueStamp;
        //                         labels[ni] = nextLabel;
        //                         assigned[ni] = 1;
        //                         stackIndex[stackSize] = ni;
        //                         stackX[stackSize] = x + 1;
        //                         stackZ[stackSize] = z - 1;
        //                         stackSize++;
        //                     }
        //                 }
        //             }

        //             if (x > 0) {
        //                 ni = current - 1;
        //                 if (
        //                     !assigned[ni] &&
        //                     queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
        //                 ) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stackIndex[stackSize] = ni;
        //                     stackX[stackSize] = x - 1;
        //                     stackZ[stackSize] = z;
        //                     stackSize++;
        //                 }
        //             }

        //             if (x < width - 1) {
        //                 ni = current + 1;
        //                 if (
        //                     !assigned[ni] &&
        //                     queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
        //                 ) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stackIndex[stackSize] = ni;
        //                     stackX[stackSize] = x + 1;
        //                     stackZ[stackSize] = z;
        //                     stackSize++;
        //                 }
        //             }

        //             if (z < height - 1) {
        //                 const down = current + width;

        //                 if (x > 0) {
        //                     ni = down - 1;
        //                     if (
        //                         !assigned[ni] &&
        //                         queued[ni] !== queueStamp &&
        //                         shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
        //                     ) {
        //                         queued[ni] = queueStamp;
        //                         labels[ni] = nextLabel;
        //                         assigned[ni] = 1;
        //                         stackIndex[stackSize] = ni;
        //                         stackX[stackSize] = x - 1;
        //                         stackZ[stackSize] = z + 1;
        //                         stackSize++;
        //                     }
        //                 }

        //                 ni = down;
        //                 if (
        //                     !assigned[ni] &&
        //                     queued[ni] !== queueStamp &&
        //                     shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
        //                 ) {
        //                     queued[ni] = queueStamp;
        //                     labels[ni] = nextLabel;
        //                     assigned[ni] = 1;
        //                     stackIndex[stackSize] = ni;
        //                     stackX[stackSize] = x;
        //                     stackZ[stackSize] = z + 1;
        //                     stackSize++;
        //                 }

        //                 if (x < width - 1) {
        //                     ni = down + 1;
        //                     if (
        //                         !assigned[ni] &&
        //                         queued[ni] !== queueStamp &&
        //                         shouldConnect(current, ni, groupBuffer, groupSize, labels, current, startIndex)
        //                     ) {
        //                         queued[ni] = queueStamp;
        //                         labels[ni] = nextLabel;
        //                         assigned[ni] = 1;
        //                         stackIndex[stackSize] = ni;
        //                         stackX[stackSize] = x + 1;
        //                         stackZ[stackSize] = z + 1;
        //                         stackSize++;
        //                     }
        //                 }
        //             }
        //         }

        //         if (groupSize < minGroupSize || groupSize > maxGroupSize) {
        //             for (let i = 0; i < groupSize; i++) {
        //                 const index = groupBuffer[i];
        //                 labels[index] = -1;
        //                 assigned[index] = 0;
        //             }

        //             queueStamp++;

        //             startX++;
        //             if (startX === width) {
        //                 startX = 0;
        //                 startZ++;
        //             }
        //             continue;
        //         }

        //         const groupStart = allGroupIndicesCount;
        //         for (let i = 0; i < groupSize; i++) {
        //             allGroupIndices[allGroupIndicesCount++] = groupBuffer[i];
        //         }

        //         groupLabels.push(nextLabel);
        //         groupStarts.push(groupStart);
        //         groupLengths.push(groupSize);

        //         nextLabel++;
        //         queueStamp++;

        //         startX++;
        //         if (startX === width) {
        //             startX = 0;
        //             startZ++;
        //         }
        //     }

        //     return {
        //         labels,
        //         groupLabels,
        //         groupStarts,
        //         groupLengths,
        //         allGroupIndices: allGroupIndices.subarray(0, allGroupIndicesCount)
        //     };
        // }

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

        function segmentRoofPlanes(heightData, slopeX, slopeZ, width, height, options = {}) {
            const size = width * height;

            const minGroupSize = options.minGroupSize ?? 8;
            const maxGroupSize = options.maxGroupSize ?? Infinity;

            const maxHeightDiff = options.maxHeightDiff ?? 0.3;
            const maxSlopeDiff = options.maxSlopeDiff ?? 0.08;
            const maxSeedHeightDiff = options.maxSeedHeightDiff ?? Infinity;
            const maxSeedSlopeDiff = options.maxSeedSlopeDiff ?? Infinity;
            const minValidHeight = options.minValidHeight ?? -Infinity;
            const maxValidHeight = options.maxValidHeight ?? Infinity;

            const useAverageNormal = options.useAverageNormal ?? false;
            const averageRecheckEvery = options.averageRecheckEvery ?? 16;
            const maxAverageSlopeDiff = options.maxAverageSlopeDiff ?? maxSlopeDiff;

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

            for (let startIndex = 0, startX = 0, startZ = 0; startIndex < size; startIndex++) {
                const seedHeight = heightData[startIndex];

                if (
                    assigned[startIndex] ||
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

                const seedSlopeX = slopeX[startIndex];
                const seedSlopeZ = slopeZ[startIndex];

                if (!Number.isFinite(seedSlopeX) || !Number.isFinite(seedSlopeZ)) {
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

                let avgSlopeX = seedSlopeX;
                let avgSlopeZ = seedSlopeZ;
                let slopeSumX = seedSlopeX;
                let slopeSumZ = seedSlopeZ;

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

                    const currentHeight = heightData[current];
                    const currentSlopeX = slopeX[current];
                    const currentSlopeZ = slopeZ[current];

                    groupBuffer[groupSize++] = current;

                    if (useAverageNormal && (groupSize % averageRecheckEvery === 0)) {
                        avgSlopeX = slopeSumX / groupSize;
                        avgSlopeZ = slopeSumZ / groupSize;
                    }

                    let ni;

                    if (z > 0) {
                        const up = current - width;

                        if (x > 0) {
                            ni = up - 1;
                            if (tryAddNeighbor(
                                ni, current, x - 1, z - 1,
                                currentHeight, currentSlopeX, currentSlopeZ,
                                seedHeight, seedSlopeX, seedSlopeZ,
                                avgSlopeX, avgSlopeZ
                            )) {
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x - 1;
                                stackZ[stackSize] = z - 1;
                                stackSize++;
                            }
                        }

                        ni = up;
                        if (tryAddNeighbor(
                            ni, current, x, z - 1,
                            currentHeight, currentSlopeX, currentSlopeZ,
                            seedHeight, seedSlopeX, seedSlopeZ,
                            avgSlopeX, avgSlopeZ
                        )) {
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x;
                            stackZ[stackSize] = z - 1;
                            stackSize++;
                        }

                        if (x < width - 1) {
                            ni = up + 1;
                            if (tryAddNeighbor(
                                ni, current, x + 1, z - 1,
                                currentHeight, currentSlopeX, currentSlopeZ,
                                seedHeight, seedSlopeX, seedSlopeZ,
                                avgSlopeX, avgSlopeZ
                            )) {
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x + 1;
                                stackZ[stackSize] = z - 1;
                                stackSize++;
                            }
                        }
                    }

                    if (x > 0) {
                        ni = current - 1;
                        if (tryAddNeighbor(
                            ni, current, x - 1, z,
                            currentHeight, currentSlopeX, currentSlopeZ,
                            seedHeight, seedSlopeX, seedSlopeZ,
                            avgSlopeX, avgSlopeZ
                        )) {
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x - 1;
                            stackZ[stackSize] = z;
                            stackSize++;
                        }
                    }

                    if (x < width - 1) {
                        ni = current + 1;
                        if (tryAddNeighbor(
                            ni, current, x + 1, z,
                            currentHeight, currentSlopeX, currentSlopeZ,
                            seedHeight, seedSlopeX, seedSlopeZ,
                            avgSlopeX, avgSlopeZ
                        )) {
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
                            if (tryAddNeighbor(
                                ni, current, x - 1, z + 1,
                                currentHeight, currentSlopeX, currentSlopeZ,
                                seedHeight, seedSlopeX, seedSlopeZ,
                                avgSlopeX, avgSlopeZ
                            )) {
                                stackIndex[stackSize] = ni;
                                stackX[stackSize] = x - 1;
                                stackZ[stackSize] = z + 1;
                                stackSize++;
                            }
                        }

                        ni = down;
                        if (tryAddNeighbor(
                            ni, current, x, z + 1,
                            currentHeight, currentSlopeX, currentSlopeZ,
                            seedHeight, seedSlopeX, seedSlopeZ,
                            avgSlopeX, avgSlopeZ
                        )) {
                            stackIndex[stackSize] = ni;
                            stackX[stackSize] = x;
                            stackZ[stackSize] = z + 1;
                            stackSize++;
                        }

                        if (x < width - 1) {
                            ni = down + 1;
                            if (tryAddNeighbor(
                                ni, current, x + 1, z + 1,
                                currentHeight, currentSlopeX, currentSlopeZ,
                                seedHeight, seedSlopeX, seedSlopeZ,
                                avgSlopeX, avgSlopeZ
                            )) {
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

            function tryAddNeighbor(
                ni, parent, nx, nz,
                currentHeight, currentSlopeX, currentSlopeZ,
                seedHeight, seedSlopeX, seedSlopeZ,
                avgSlopeX, avgSlopeZ
            ) {
                if (assigned[ni] || queued[ni] === queueStamp) return false;

                const h = heightData[ni];
                if (!Number.isFinite(h) || h < minValidHeight || h > maxValidHeight) return false;

                const sx = slopeX[ni];
                const sz = slopeZ[ni];
                if (!Number.isFinite(sx) || !Number.isFinite(sz)) return false;

                if (Math.abs(h - currentHeight) > maxHeightDiff) return false;
                if (Math.abs(sx - currentSlopeX) > maxSlopeDiff) return false;
                if (Math.abs(sz - currentSlopeZ) > maxSlopeDiff) return false;

                if (maxSeedHeightDiff !== Infinity && Math.abs(h - seedHeight) > maxSeedHeightDiff) return false;
                if (maxSeedSlopeDiff !== Infinity) {
                    if (Math.abs(sx - seedSlopeX) > maxSeedSlopeDiff) return false;
                    if (Math.abs(sz - seedSlopeZ) > maxSeedSlopeDiff) return false;
                }

                if (useAverageNormal) {
                    if (Math.abs(sx - avgSlopeX) > maxAverageSlopeDiff) return false;
                    if (Math.abs(sz - avgSlopeZ) > maxAverageSlopeDiff) return false;
                }

                queued[ni] = queueStamp;
                labels[ni] = nextLabel;
                assigned[ni] = 1;

                slopeSumX += sx;
                slopeSumZ += sz;

                return true;
            }
        }

































        // function listAdjacentGroups(labels, width, height, useDiagonals = true) {
        //     const adjacency = [];

        //     function addEdge(a, b) {
        //         if (a === b || a < 0 || b < 0) return;

        //         if (!adjacency[a]) adjacency[a] = [];
        //         if (!adjacency[b]) adjacency[b] = [];

        //         if (!adjacency[a].includes(b)) adjacency[a].push(b);
        //         if (!adjacency[b].includes(a)) adjacency[b].push(a);
        //     }

        //     for (let z = 0; z < height; z++) {
        //         for (let x = 0; x < width; x++) {
        //             const index = z * width + x;
        //             const label = labels[index];
        //             if (label < 0) continue;

        //             // Only check forward neighbors so pairs are not repeated
        //             if (x + 1 < width) {
        //                 addEdge(label, labels[index + 1]);
        //             }

        //             if (z + 1 < height) {
        //                 addEdge(label, labels[index + width]);
        //             }

        //             if (useDiagonals) {
        //                 if (x + 1 < width && z + 1 < height) {
        //                     addEdge(label, labels[index + width + 1]);
        //                 }

        //                 if (x - 1 >= 0 && z + 1 < height) {
        //                     addEdge(label, labels[index + width - 1]);
        //                 }
        //             }
        //         }
        //     }

        //     return adjacency;
        // }





























        function GetHeightByXZ(Heights: number[], X: number, Z: number, Width: number, Height: number) {
            return Heights[X * Width + Z];
        }

        function createGroundFromHeightArray(
            name: string,
            heights: number[],
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

            const ground = BABYLON.MeshBuilder.CreateGround(
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

            let colors: number[] = new Array(columns * rows * 4).fill(0);

            const sortedValues = Array.from(heights).sort((x, y) => x - y);
            const minValue = sortedValues[0];
            const maxValue = sortedValues.slice(-1)[0];

            // Babylon ground vertices are laid out as a grid.
            // Each vertex has x,y,z, so positions index is vertexIndex * 3 + component.
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < columns; col++) {
                    const vertexIndex = row * columns + col;
                    const heightValue = heights[vertexIndex];

                    positions[vertexIndex * 3 + 1] = (heightValue - minValue) * 39.3701 / 10; // Y
                    colors[vertexIndex * 3 * 4 + 1] = (heightValue - minValue) / (maxValue - minValue);
                    // colors[vertexIndex * 3 * 4 + 4] = 1;
                    // const GROUND = BABYLON.MeshBuilder.CreateGround("E", {
                    //     width: cellSizeX * 10,
                    //     height: cellSizeZ * 10,

                    // }, scene);
                    // GROUND.position.set(row * cellSizeX, (heightValue - maxValue) * 39.3701 / 10, col * cellSizeZ);
                }
            }

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

                        if (true) {
                            let Length = TESTING_HEIGHTs.Length; // 938; // 301;
                            let Width = TESTING_HEIGHTs.Width; // 936; // 300;
                            let Floats = Array.from(TESTING_HEIGHTs.Heights); // await fetch("/testing.json").then(r => r.json());

                            // console.log("YAYYYYY", Floats);

                            const sortedValues = Array.from(Floats).sort((x, y) => x - y);
                            const minValue = sortedValues[0];
                            const maxValue = sortedValues.slice(-1)[0];

                            // let CountHeightsSimp: number[] = []; // CM?
                            // let CountHeights: number[] = []; // MM?
                            let NormalizedHeights: number[] = []; // .for((Value) => Value-minValue);
                            for (let Index in Floats) {
                                let Height = Math.round((Floats[Index] - minValue) * 1000) / 10;
                                NormalizedHeights[Index] = Height;
                                // CountHeights[Height] = (CountHeights[Height] ?? 0) + 1;
                                // let HeightSimp = Math.round(Height / 10);
                                // CountHeightsSimp[HeightSimp] = (CountHeightsSimp[HeightSimp] ?? 0) + 1;
                            }
                            console.log(Math.round((maxValue - minValue) * 1000), NormalizedHeights);

                            // let HeightCounts = [];
                            // for (let Height in CountHeights) {
                            //     HeightCounts.push({ Height: +Height, Count: CountHeights[Height] });
                            // }
                            // HeightCounts.sort((A, B) => B.Count - A.Count);

                            // let HeightCountsSimp = [];
                            // for (let Height in CountHeightsSimp) {
                            //     HeightCountsSimp.push({ Height: +Height, Count: CountHeightsSimp[Height] });
                            // }
                            // HeightCountsSimp.sort((A, B) => B.Count - A.Count);

                            // console.log(HeightCounts, HeightCountsSimp);

                            // let Sobel5x5Map = [];
                            // let Sobel3x3Map = [];
                            // for (let Index in NormalizedHeights) {
                            //     Sobel5x5Map[Index] = getSobel5x5GradientAtIndex(Index, NormalizedHeights, Width, Length);
                            //     Sobel3x3Map[Index] = getSobelGradientAtIndex(Index, NormalizedHeights, Width, Length);
                            // }
                            // let SobelMap = Sobel5x5Map;

                            // // createGroundFromHeightArray("E", NormalizedHeights, Length, Width, 39.3701, 39.3701, Editor.ActiveEditor.Scene);

                            // let ChaosData = analyzeLocalSlopeChaos3x3(SobelMap, Width, Length);

                            // let CapSlope = 24;

                            // let CountSlopes: number[] = [];
                            // let Slopes: any[] = [];
                            // for (let Index in Floats) {
                            //     let Sobel = SobelMap[Index];

                            //     // let IDK = ChaosData[Index];

                            //     // Sobel?.dYdX
                            //     // let Slope = Math.atan2(Sobel?.dYdZ, Sobel?.dYdX) // Math.atan2(Sobel?.normal.z, Sobel?.normal.x) // Math.round(Sobel.slope * 12 * 2) / 2;
                            //     // let Slope = Math.atan2(Sobel?.normal.z, Sobel?.normal.x) // Math.round(Sobel.slope * 12 * 2) / 2;
                            //     // let Slope = IDK.averageSlopeAngleDifferenceDegrees; // Math.round(IDK.slopeStdDev * 12);
                            //     let Slope = Math.round(Sobel.slope * 12); // Math.min(CapSlope, Math.round(Sobel.slope * 12));
                            //     Slopes[Index] = Slope;
                            //     CountSlopes[Slope] = (CountSlopes[Slope] ?? 0) + 1;
                            // }

                            // let SlopeCounts = [];
                            // for (let Slope in CountSlopes) {
                            //     SlopeCounts.push({ Slope: +Slope, Count: CountSlopes[Slope] });
                            // }
                            // SlopeCounts.sort((A, B) => B.Count - A.Count);


                            // const SORTED_SLOPES = Array.from(Slopes).sort((x, y) => x - y);
                            // const MinSlope = SORTED_SLOPES[0];
                            // const MaxSlope = SORTED_SLOPES.slice(-1)[0];

                            // console.log("SLOPES", MinSlope, MaxSlope, Slopes, SORTED_SLOPES, SlopeCounts);

                            const FITTINGS = computePlaneMap(NormalizedHeights, Width, Length, 2);
                            console.log("FITTINGS", FITTINGS);

                            // let EdgeDetections = [];
                            // for (let Index in Floats) {
                            //     let Sobel = SobelMap[Index];

                            //     if (Math.max(...(Sobel?.heights as number[])) <= Sobel?.height + Sobel?.slope / 2) {
                            //         Sobel.TOP = true;
                            //     }
                            // }

                            // Maybe try by the pitch. //

                            // BodiesByHeight
                            let YES = segmentByNeighborPredicate(FITTINGS, Width, Length, (fromIndex: number, toIndex: number, CurrentGroup: number[], labels: number[]) => {
                                // const a = Sobel3x3Map[fromIndex];
                                // const b = Sobel3x3Map[toIndex];


                                const a = FITTINGS[fromIndex];
                                const b = FITTINGS[toIndex];

                                // const a25 = Sobel5x5Map[fromIndex];
                                // const b25 = Sobel5x5Map[toIndex];

                                if (!a || !b) return false;
                                // if (a.chaotic || b.chaotic) return false;
                                // if (fromIndex == toIndex) return true;

                                if (b.slope <= 1 || b.slope > 21) return false;
                                if (b.RMSE > 2) return false;


                                // const dot = a.dYdX * b.dYdX + a.dYdZ * b.dYdZ;
                                // const magA = Math.hypot(a.dYdX, a.dYdZ);
                                // const magB = Math.hypot(b.dYdX, b.dYdZ);
                                // const angle = Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB))));

                                // const slopeDiff = Math.abs(a.slope - b.slope);

                                // const azimuthDiff = Math.abs(Math.atan2(a.dYdZ, a.dYdX) - Math.atan2(b.dYdZ, b.dYdX))
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
                                return true
                                    // && (heightDiff <= slopeDiff)
                                    // && angle <= 3 * Math.PI / 180
                                    // && azimuthDiff <= 5 * Math.PI / 180
                                    // && dxDiff <= 15 * Math.PI / 180
                                    // && dzDiff <= 15 * Math.PI / 180
                                    // && slopeDiff <= 2
                                    // && normalDiff <= 5 * Math.PI / 180
                                    // && heightDiff <= .1 // .05 // .1 // .05 // .1
                                    // && slopeDiff <= 2
                                    ;
                            }, {
                                useDiagonals: true,
                                minGroupSize: 27 * 4 // 108 * 4 // 27 // 9 // 9*4 = 36sq in
                            });

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

                            // let FaceGroupIDs = [];
                            // let PerFace = segmentByNeighborPredicate(SobelMap, Width, Height, (fromIndex: number, toIndex: number, data, newLabels) => {
                            //     const a = Sobel3x3Map[fromIndex];
                            //     const b = Sobel3x3Map[toIndex];

                            //     const a5x5 = Sobel5x5Map[fromIndex];
                            //     const b5x5 = Sobel5x5Map[toIndex];

                            //     if (!a || !b) return false;
                            //     // if (a.chaotic || b.chaotic) return false;

                            //     let aBodyGroupID = ExpandedBodies.labels[fromIndex];
                            //     let bBodyGroupID = ExpandedBodies.labels[toIndex];

                            //     // if (aBodyGroupID != bBodyGroupID && aBodyGroupID != -1 && bBodyGroupID != -1 || aBodyGroupID == -1 && bBodyGroupID == -1) return false;
                            //     // if (aBodyGroupID != bBodyGroupID) return false;
                            //     // if (newLabels[fromIndex] != -1 && newLabels[toIndex] != -1 || newLabels[fromIndex] != newLabels[toIndex]) return false;

                            //     let allowedByParentRules = false;

                            //     // same existing parent group
                            //     if (aBodyGroupID != -1 && bBodyGroupID != -1)
                            //         allowedByParentRules = aBodyGroupID === bBodyGroupID;
                            //     // grouped -> unused OR unused -> grouped
                            //     // else if (aBodyGroupID != -1 && (bBodyGroupID == -1 && (newLabels[toIndex] == -1 || newLabels[toIndex] == null)) || (aBodyGroupID == -1 && (newLabels[fromIndex] == -1 || newLabels[fromIndex] == null)) && bBodyGroupID != -1)
                            //     //     allowedByParentRules = true;

                            //     if (!allowedByParentRules) return false;

                            //     // if (aBodyGroupID != 17) return false;
                            //     let FaceGroup = FaceGroupIDs[newLabels[fromIndex]] ??= [fromIndex]

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

                            //     let GroupTogether = true
                            //         // && heightDiff >= slopeDiff
                            //         // && heightDiff <= 1 // .05 // .1 // .05 // .1
                            //         // && 
                            //         && azimuthDiff <= 5 * Math.PI / 180
                            //         // && dxDiff <= 5 * Math.PI / 180
                            //         // && dzDiff <= 5 * Math.PI / 180
                            //         // && slopeDiff <= 1
                            //         // && normalDiff <= 5 * Math.PI / 180
                            //         ;
                            //     if (!GroupTogether) return false;
                            //     FaceGroup.push(toIndex);
                            //     return true;
                            // }, {
                            //     useDiagonals: true,
                            //     minGroupSize: 9 // 9*4 = 36sq in
                            // });

                            // EXPAND
                            // let YES = segmentByNeighborPredicate(SobelMap, Width, Height, (fromIndex: number, toIndex: number, data, newLabels) => {
                            //     const a = Sobel3x3Map[fromIndex];
                            //     const b = Sobel3x3Map[toIndex];

                            //     const a5x5 = Sobel5x5Map[fromIndex];
                            //     const b5x5 = Sobel5x5Map[toIndex];

                            //     if (!a || !b) return false;
                            //     // if (a.chaotic || b.chaotic) return false;

                            //     let aBodyGroupID = PerFace.labels[fromIndex];
                            //     let bBodyGroupID = PerFace.labels[toIndex];

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

                            //     let Face_dYdX = 0;
                            //     let Face_dYdZ = 0;

                            //     for (let Index of FaceGroupIDs[aBodyGroupID]) {
                            //         Face_dYdX += Sobel3x3Map[Index].dYdX;
                            //         Face_dYdZ += Sobel3x3Map[Index].dYdZ;
                            //     }

                            //     Face_dYdX /= FaceGroupIDs[aBodyGroupID].length;
                            //     Face_dYdZ /= FaceGroupIDs[aBodyGroupID].length;

                            //     // const dot = a.dYdX * b.dYdX + a.dYdZ * b.dYdZ;
                            //     // const magA = Math.hypot(a.dYdX, a.dYdZ);
                            //     // const magB = Math.hypot(b.dYdX, b.dYdZ);
                            //     // const angle = Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB))));

                            //     const normalDiff = angleBetweenNormals(a.normal, b.normal);
                            //     const slopeDiff = Math.abs(a.slope - b.slope);

                            //     const azimuthDiff = Math.abs(Math.atan2(Face_dYdZ, Face_dYdX) - Math.atan2(b.dYdZ, b.dYdX))
                            //     const dxDiff = Math.abs(Face_dYdX - b.dYdX);
                            //     const dzDiff = Math.abs(Face_dYdZ - b.dYdZ);
                            //     const heightDiff = Math.abs(a.height - b.height);

                            //     // 
                            //     // BodiesByHeight.groups

                            //     return true
                            //         // && heightDiff >= slopeDiff
                            //         // && heightDiff <= 1 // .05 // .1 // .05 // .1
                            //         // && 
                            //         // && azimuthDiff <= 2 * Math.PI / 180
                            //         && dxDiff <= 5 * Math.PI / 180
                            //         && dzDiff <= 5 * Math.PI / 180
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

                            // createGroundFromHeightArray("E", Floats, Width, Height, 39.3701 / 10, 39.3701 / 10, Editor.ActiveEditor.Scene);
                            // for (let )

                            // if (true) break;
                            {
                                const canvas = document.createElement('canvas')
                                canvas.width = Width
                                canvas.height = Length
                                const ctx = canvas.getContext('2d')

                                // Convert RGB to RGBA by adding alpha channel
                                const rgba = new Uint8ClampedArray(Width * Length * 4);
                                // console.log("LENGTH OF RGB???", width, height, rasters.length, rasters)
                                for (let i = 0, j = 0; i < Width * Length; i++, j += 4) {
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
                                    let Pitch = Fit.slope;
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
                                    let HSV = BABYLON.Color3.FromHSV(
                                        // YES.labels[i] == -1 ? 0 : YES.labels[i] / (YES.groups.length) * 360,
                                        YES.labels[i] == -1 ? 0 : YES.labels[i] / (YES.groupLabels.length) * 360,
                                        // 1 - Math.min(24, Pitch) / 24, // 1,
                                        1,
                                        YES.labels[i] == -1 ? 0 : 1
                                    )
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     (Math.atan(Sobel5x5.slope) * 180 / Math.PI) / 90 * 360,
                                    //     // 1 - Math.min(24, Pitch) / 24, // 1,
                                    //     1, // 1,
                                    //     1, // YES.labels[i] == -1 ? 0 : 1
                                    // )

                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth,
                                    //     1, // Math.min(Pitch, 12) / 12,
                                    //     1 - Math.max(0, Fit.RMSE / 10) // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // let HSV = BABYLON.Color3.FromHSV(
                                    //     Azimuth,
                                    //     Math.min(Pitch, 12) / 12,
                                    //     1 - Math.min(Fit.RMSE, 1) // Fit.RMSE < 2 ? 1 : 0 // Fit.RMSE < 1 ? 1 : 0 // HeightAtPixel / ((maxValue - minValue) * 100)
                                    // );
                                    // Fit.c Fit.RMSE

                                    let BLUE = Math.round(HSV.b * 255)
                                    let GREEN = Math.round(HSV.g * 255)
                                    let RED = Math.round(HSV.r * 255)

                                    rgba[j] = RED;
                                    rgba[j + 1] = GREEN; // rasters[1][i]; // G
                                    rgba[j + 2] = BLUE; // rasters[2][i]; // B
                                    rgba[j + 3] = 255;      // A (opaque)
                                }
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
                        }








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