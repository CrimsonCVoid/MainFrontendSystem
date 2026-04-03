<<<<<<< HEAD
=======
// @ts-nocheck
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
// import * as BABYLON from "@babylonjs/core/index.js";

import * as BABYLON from "@babylonjs/core";
import * as BABYLON_UI from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";

<<<<<<< HEAD
import { SketchLine } from "./drawings";

import TestingConfig from "./EditorUI.json";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { FromSupabase } from "./backend"; // DebuggingClass
import { CFrame, Vector3 } from "./positioning";

type xyz_Class = { x: number, y: number, z: number };

// async function Test() {

// }
=======
// import { PanelEngine } from "./panelview.bl.js";
// import { Scene, Camera, Engine, RoofUI } from "./roofedit.bl.js";
import { CFrame, Vector3 } from "./positioning";
// import * from "./Editor.d.ts";
import { SketchLine } from "./drawings";
import { Test } from "./backend";

// No-op — map overlay not yet implemented
function SwitchMap(_enabled: boolean) {}

import TestingConfig from "./EditorUI.json";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa

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
<<<<<<< HEAD
    // static MapDebugging: DebuggingClass;
=======
    static meshesRef: any;
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa

    Engine: BABYLON.Engine;
    Scene: BABYLON.Scene;
    Camera: BABYLON.ArcRotateCamera;
    RoofUI: AdvancedDynamicTexture;
    UI_Controls: EditorControls;

<<<<<<< HEAD
    // Root: BABYLON.TransformNode;
    // static RoofPBR_Material: BABYLON.PBRMetallicRoughnessMaterial;
    RoofColor = BABYLON.Color3.FromHexString("#FFFFFF");

=======
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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

<<<<<<< HEAD
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
=======
    LabelMarker(V3: Vector3 | BABYLON.Vector3, Text: string = "Vertex") {
        let marker = BABYLON.MeshBuilder.CreatePlane("marker", { diameter: 0.01 }, this.Scene);
        marker.isVisible = false; // don’t show it
        marker.position.set(V3.x, V3.z, V3.y);
        // marker.position.set(V3.X, V3.Y, V3.Z);
        let text = new BABYLON_UI.TextBlock();
        text.text = Text;
        this.RoofUI.addControl(text);
        text.linkWithMesh(marker); // text follows invisible mesh
        text.color = "Black";
        return marker;
    }

    CreateMarker(Name: string = "") {
        const Marker = BABYLON.MeshBuilder.CreateSphere(Name + "Marker", {
            diameter: 0.01
        }, this.Scene);
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
=======
        Editor.ActiveEditor = this;
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
        this.Engine = Engine;
        this.Scene = Scene;
        this.Camera = Camera;
        this.RoofUI = RoofUI;
<<<<<<< HEAD
        console.log("WINDOWWWWWWWWWWWWWWWWWWWWWWW", window);
        // Editor.MapDebugging = new DebuggingClass();
=======
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa

        let DesignGrid = this.DesignGrid = BABYLON.Mesh.CreateGround("ground", 10000, 10000, 10, Scene);
        var gridMaterial = new GridMaterial("gridMaterial", Scene);
        gridMaterial.mainColor = BABYLON.Color4.FromInts(230, 230, 235, 255);
        gridMaterial.lineColor = BABYLON.Color4.FromInts(25, 25, 30);
        gridMaterial.opacity = .8;
        DesignGrid.material = gridMaterial
<<<<<<< HEAD
        // DesignGrid.isVisible = false;

        // this.Root = new BABYLON.TransformNode("ROOT", Scene);
=======

>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa


        RoofUI.parseSerializedObject(TestingConfig); // await RoofUI.parseFromURLAsync("EditorUI.json");
        let EditorUI = RoofUI;

        const DrawingCursor = BABYLON.MeshBuilder.CreateSphere("DrawingCursor", { diameter: .5 }, Scene);
<<<<<<< HEAD
        DrawingCursor.isVisible = false;
=======
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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

<<<<<<< HEAD
=======
        let PrimaryText0 = UI_Controls.PrimaryText0 = UI_Controls.Primary0.children[0] as BABYLON_UI.TextBlock;
        let PrimaryText1 = UI_Controls.PrimaryText1 = UI_Controls.Primary1.children[0] as BABYLON_UI.TextBlock;
        let PrimaryText2 = UI_Controls.PrimaryText2 = UI_Controls.Primary2.children[0] as BABYLON_UI.TextBlock;
        let PrimaryText3 = UI_Controls.PrimaryText3 = UI_Controls.Primary3.children[0] as BABYLON_UI.TextBlock;

>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
        // Camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        Camera.minZ = 0.1;
        Camera.maxZ = 100000;

<<<<<<< HEAD
=======
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

>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
        };

        // Scene.onBeforeRenderObservable.add(() => {
        //     if (!FirstRotation) DesignGrid.rotation.y = -Camera.alpha;
        // });

        // console.log(Camera);
=======


            // console.log(zoom, 1500 / zoom)
            // let Scale = 1 / Camera.radius * SketchLine.DrawingScale / ratio * 1450; // zoom; // * .9366666; // 25; // * .9;
            // FlatMapElement.style.scale = Scale.toString();
            // // console.log(Camera.orthoTop, Scale);
            // // May still not be perfect, but honestly, idrk anymore.
            // FlatMapElement.style.left = -(FlatMapElement.clientWidth - RenderWidth) / 2 + "px";
            // FlatMapElement.style.top = -(FlatMapElement.clientHeight - RenderHeight) / 2 + "px";
        };

        Scene.onBeforeRenderObservable.add(() => {
            // FlatMapElement.style.rotate = Camera.alpha + "rad";
            // FlatMapElement.style.transform // Need to look into using skew.
            // console.log(Camera.alpha);

            let Scale = 1500 / Camera.radius * .921;

            let CheapCF = CFrame.Angles(0, -Camera.alpha, 0).ToWorldSpace(CFrame.fromXYZ(-Camera.target.z * Scale, 0, -Camera.target.x * Scale));
            // FlatMapElement.style.translate = `${CheapCF.x}px ${CheapCF.z}px`;
            if (!FirstRotation) DesignGrid.rotation.y = -Camera.alpha;
        });

        console.log(Camera);
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa

        updateOrtho();

        Camera.onViewMatrixChangedObservable.add(updateOrtho);

        window.addEventListener("resize", () => {
            // Engine.resize();
            updateOrtho();
        });

        // console.log(BABYLON.PointerEventTypes.POINTERDOWN);
        // console.log(BABYLON.PointerEventTypes.POINTERMOVE);
        // console.log(BABYLON.PointerEventTypes.POINTERUP);

<<<<<<< HEAD
        // let HoldingShift = false;
        // let ChangingPitch = false;
        // let CanDraw = true;
        // let FirstRotation = false;

        // Scene.onPointerObservable.add((pi) => {
        //     // if (this.RoofUI.isForegroundPicked) return; // Prevent drawing when interacting with GUI
        //     // pi.pickInfo?

        //     const p = this.pickOnGround(Scene.pointerX, Scene.pointerY);
        //     if (!p) return;
        //     DrawingCursor.position.x = Math.round(p.x);
        //     DrawingCursor.position.y = Math.round(p.y);
        //     DrawingCursor.position.z = Math.round(p.z);
        //     // DesignGrid.rotationQuaternion.copyFrom(BABYLON.Quaternion.FromEulerAngles(0, Camera.rotation.y, 0));
        //     // DesignGrid.rotate(BABYLON.Vector3.Up, Camera.rotation.y, BABYLON.Space.WORLD);
        //     if (pi.type === BABYLON.PointerEventTypes.POINTERDOWN && CanDraw) {
        //         if (pi.event.button !== 0) return;
        //         if (SketchLine.ActiveSketch) {
        //             if (SketchLine.ActiveSketch.Commit()) {
        //                 console.log("COMMIT");
        //                 SketchLine.ActiveSketch = null;
        //                 // DesignGrid.position.y -= 20;
        //                 return;
        //             }
        //             console.log("EXTRUDE");
        //             // DesignGrid.rotation.y = -Camera.alpha;
        //             FirstRotation = true;
        //         } else {
        //             // SketchLine.ActiveSketch = new SketchLine(Math.round(p.x), Math.round(p.z), Math.round(p.y));
        //             if (!FirstRotation) {
        //                 DesignGrid.position.x = p.x;
        //                 DesignGrid.position.z = p.z;
        //             };
        //             SketchLine.ActiveSketch = new SketchLine(this, p.x, Math.round(p.y), p.z);
        //             SketchLine.ActiveSketch.Start();
        //         }
        //     }

        //     if (pi.type === BABYLON.PointerEventTypes.POINTERMOVE && SketchLine.ActiveSketch) {
        //         SketchLine.ActiveSketch.SnapAngle = -DesignGrid.rotation.y; // Camera.alpha;
        //         SketchLine.ActiveSketch.Update(p.x, p.z, HoldingShift);
        //     }

        //     if (ChangingPitch && pi.type === BABYLON.PointerEventTypes.POINTERWHEEL && SketchLine.ActiveSketch) {
        //         // console.log(pi);
        //         // console.log(pi.event.wheelDelta);
        //         let IncrementValue = (HoldingShift ? .5 : 1) * (pi.event.wheelDelta / 120);
        //         SketchLine.ActiveSketch.DrawLine.PITCH = Math.max(0, SketchLine.ActiveSketch.DrawLine.PITCH + IncrementValue);
        //         SketchLine.ActiveSketch.UpdateWithPointer(HoldingShift);
        //     }
        // });
=======
        let HoldingShift = false;
        let ChangingPitch = false;
        let CanDraw = true;
        let FirstRotation = false;

        Scene.onPointerObservable.add((pi) => {
            if (this.RoofUI.isForegroundPicked) return; // Prevent drawing when interacting with GUI
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
                    SketchLine.ActiveSketch = new SketchLine(this, p.x, p.z, Math.round(p.y));
                    SketchLine.ActiveSketch.Start();
                }
            }

            if (pi.type === BABYLON.PointerEventTypes.POINTERMOVE && SketchLine.ActiveSketch) {
                SketchLine.ActiveSketch.SnapAngle = -DesignGrid.rotation.y; // Camera.alpha;
                SketchLine.ActiveSketch.Update(p.x, p.z, HoldingShift);
            }

            if (ChangingPitch && pi.type === BABYLON.PointerEventTypes.POINTERWHEEL && SketchLine.ActiveSketch) {
                console.log(pi);
                // console.log(pi.event.wheelDelta);
                let IncrementValue = (HoldingShift ? .5 : 1) * (pi.event.wheelDelta / 120);
                SketchLine.ActiveSketch.Line0.PITCH = Math.max(0, SketchLine.ActiveSketch.Line0.PITCH + IncrementValue);
                SketchLine.ActiveSketch.Line1.PITCH = Math.max(0, SketchLine.ActiveSketch.Line1.PITCH + IncrementValue);
                SketchLine.ActiveSketch.LineA.PITCH = Math.max(0, SketchLine.ActiveSketch.LineA.PITCH + IncrementValue);
                SketchLine.ActiveSketch.LineB.PITCH = Math.max(0, SketchLine.ActiveSketch.LineB.PITCH + IncrementValue);
                SketchLine.ActiveSketch.UpdateWithPointer(HoldingShift);
            }
        });
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa

        Camera.lowerBetaLimit = 0; // -Math.PI / 2;
        Camera.upperBetaLimit = Math.PI / 2;

        var PanelViewCollapsed = true;

<<<<<<< HEAD
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

            const ADDITIONAL_FACTOR = 1; // 10 / 39.3701;

            const width = (columns - 1) * cellSizeX * ADDITIONAL_FACTOR;
            const height = (rows - 1) * cellSizeZ * ADDITIONAL_FACTOR;

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

                positions[i * 3 + 1] = (heightValue - minValue) * 39.3701 / 10 * ADDITIONAL_FACTOR; // Y
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

            // ground.convertToFlatShadedMesh();

            ground.rotation = new BABYLON.Vector3(0, -Math.PI / 2, 0);

            return ground;

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
=======
        Scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                switch (kbInfo.event.key) {
                    case "p":
                        Camera.mode = Camera.mode == BABYLON.Camera.ORTHOGRAPHIC_CAMERA ? BABYLON.Camera.PERSPECTIVE_CAMERA : BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
                        if (Camera.mode == BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
                            SwitchMap(false);
                            Camera.lowerBetaLimit = 0;
                            Camera.upperBetaLimit = 0;
                        } else {
                            SwitchMap(true);
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                            Camera.lowerBetaLimit = 0; // -Math.PI / 2;
                            Camera.upperBetaLimit = Math.PI / 2;
                        }
                        updateOrtho();
<<<<<<< HEAD
                        // console.log("Pressed P");
=======
                        console.log("Pressed P");
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                        break;

                    case "t":
                        // Camera.alpha = 0t;
                        Camera.beta = 0;
                        // Camera.lowerBetaLimit = 0;
                        // Camera.upperBetaLimit = 0;
                        break;

<<<<<<< HEAD
                    // case "q":
                    //     SketchLine.ActiveSketch?.Delete();
                    //     SketchLine.ActiveSketch = null;
                    //     break;

                    // case "f":
                    //     if (SketchLine.ActiveSketch && SketchLine.ActiveSketch.HasExtruded) SketchLine.ActiveSketch.DrawingMode = SketchLine.ActiveSketch.DrawingMode == "LINE" ? "EXTRUSION" : "LINE";
                    //     SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                    //     break;



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
                        fileInput.multiple = true;
                        fileInput.style.display = "none";
                        fileInput.accept = ".kyxr,.json";
                        document.body.appendChild(fileInput);

                        fileInput.addEventListener("change", async () => {
                            const jsonfile = fileInput.files?.[0];
                            if (!jsonfile) return;
                            const file = fileInput.files?.[1];
                            if (!file) return;


                            fileInput.value = "";
                            fileInput.remove();

                            const Results = await FromSupabase(file, jsonfile);

                            // console.log("DrawHeights", Results.DrawHeights);

                            // const ground = createGroundFromHeightArray("E", Results.DrawHeights, Results.DrawRGB, Results.Width, Results.Length, 39.3701 / 10, 39.3701 / 10, Editor.ActiveEditor.Scene);
                            // ground.position.y -= 5;

                            // if (true) return;











                            // if (true) return;

                            // const result = segmentRoofPlanesMultiFit(
                            //     // Results.MapHeights,   // Float32Array | Float64Array | number[]
                            //     Results.NormalizedHeights,   // Float32Array | Float64Array | number[]
                            //     Results.ModifiedMask,   // Uint8Array | number[]
                            //     Results.Width,
                            //     Results.Length,
                            //     {
                            //         pixelSizeMm: 100,

                            //         localRadiusPx: 2,
                            //         localMinSamples: 9,
                            //         localRobustIters: 4,

                            //         seedRmseMm: 5,
                            //         seedMeanEdgeMax: 1.2,
                            //         seedNormalDeg: 3,
                            //         seedPlaneDiffMm: 25,
                            //         minSeedSize: 12,

                            //         growResidualMm: 20,
                            //         growNormalDeg: 8,
                            //         growEdgeScore: 1.75,
                            //         growMaxScore: 3.0,
                            //         refitEvery: 32,

                            //         mergeNormalDeg: 4,
                            //         mergeEdgeScore: 1.0,
                            //         mergeRmseBumpMm: 10,

                            //         includeExteriorBorders: true,
                            //     }
                            //     // {
                            //     //     pixelSizeMm: 100,

                            //     //     localRadiusPx: 2,
                            //     //     localMinSamples: 10,

                            //     //     seedRmseMm: 5,
                            //     //     growEdgeScore: 1.5,
                            //     //     mergeNormalDeg: 0,

                            //     //     growResidualMm: 20,
                            //     //     growNormalDeg: 1,
                            //     // }
                            //     // {
                            //     //     pixelSizeMm: 1,

                            //     //     localRadiusPx: 2,
                            //     //     localMinSamples: 4,

                            //     //     seedRmseMm: .01,
                            //     //     growEdgeScore: .5,
                            //     //     mergeNormalDeg: 10,

                            //     //     growResidualMm: .5,
                            //     //     growNormalDeg: 10,
                            //     // }
                            // );

                            // const { labels, regions, borderSegments, local, edges } = result;

                            // const seg0 = segmentRoofPlanesMultiFit(...);

                            // const cleaned = cleanupLabelsPostProcess(
                            //     Results.NormalizedHeights,
                            //     Results.ModifiedMask,
                            //     Results.Width,
                            //     Results.Length,
                            //     result.labels,
                            //     result.regions,
                            //     result.local,
                            //     result.edges,
                            //     {
                            //         pixelSizeMm: 100,
                            //         minRegionSizePx: 20,
                            //         maxHoleSizePx: 80,
                            //         fillResidualMm: 100,
                            //         fillNormalDeg: 8,
                            //     }
                            // );

                            // const orientedBorders = extractOrientedBorderSegments(
                            //     cleaned.labels,
                            //     Results.ModifiedMask,
                            //     Results.Width,
                            //     Results.Length,
                            //     100,
                            //     true
                            // );

                            // const polylines = traceBorderPolylines(orientedBorders);

                            // const classified = classifyBorderPolylines(
                            //     polylines,
                            //     cleaned.regions,
                            //     orientedBorders
                            // );

                            // console.log("RESULT", result, cleaned, orientedBorders, polylines, classified);

                            // for (let yes of classified) {
                            //     // let projpoints = [];
                            //     // for (let point of yes.points) {
                            //     //     // const marker = BABYLON.MeshBuilder.CreateSphere("marker", { diameter: 0.1 }, Editor.ActiveEditor.Scene);
                            //     //     // marker.position.set(point.x / 39.3701 * 10, 0, point.y / 39.3701 * 10);
                            //     //     projpoints.push(new BABYLON.Vector3(point.x / 1000 * 39.3701, 0, point.y / 1000 * 39.3701));
                            //     // }
                            //     // BABYLON.MeshBuilder.CreateLines("e", { points: projpoints }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 1);
                            //     for (let segment of yes.segments) {
                            //         BABYLON.MeshBuilder.CreateLines("e", {
                            //             points: [
                            //                 new BABYLON.Vector3(segment.x1 / 1000 * 39.3701, 0, segment.y1 / 1000 * 39.3701),
                            //                 new BABYLON.Vector3(segment.x2 / 1000 * 39.3701, 0, segment.y2 / 1000 * 39.3701)
                            //             ]
                            //         }, Editor.ActiveEditor.Scene).color = new BABYLON.Color3(1, 0, 1);

                            //     }
                            // }

                            // const canvas = document.createElement('canvas')
                            // canvas.width = Results.Width
                            // canvas.height = Results.Length
                            // const ctx = canvas.getContext('2d')

                            // // Convert RGB to RGBA by adding alpha channel
                            // const rgba = new Uint8ClampedArray(Results.Width * Results.Length * 4);
                            // // console.log("LENGTH OF RGB???", width, height, rasters.length, rasters)
                            // for (let i = 0, j = 0, k = 0; i < Results.Width * Results.Length; i++, j += 4, k += 3) {
                            //     const HSV = BABYLON.Color3.FromHSV(
                            //         // labels[i] / regions.length * 360,
                            //         result.labels[i] / result.regions.length * 360,
                            //         // result.assignedPlaneIndex[i] / result.planes.length * 360,
                            //         1,
                            //         1
                            //     )

                            //     rgba[j] = Math.round(HSV.r * 255);
                            //     rgba[j + 1] = Math.round(HSV.g * 255);
                            //     rgba[j + 2] = Math.round(HSV.b * 255);
                            //     rgba[j + 3] = 255;      // A (opaque)

                            //     // rgba[j] = KissMyAss.RGB[k] * Relativity;
                            //     // rgba[j + 1] = KissMyAss.RGB[k + 1] * Relativity;
                            //     // rgba[j + 2] = KissMyAss.RGB[k + 2] * Relativity;
                            //     // rgba[j + 3] = 0 < Relativity && Relativity < 1 ? 255 : 0 // ModifiedMask[i] * 255;      // A (opaque)
                            // }

                            // const imageData = new ImageData(rgba, Results.Width, Results.Length)
                            // ctx.putImageData(imageData, 0, 0)

                            // // Convert canvas to PNG bytes
                            // const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))

                            // const url = URL.createObjectURL(blob);
                            // const a = document.createElement("a");
                            // a.href = url;
                            // a.download = "eeee.png"; //filename ?? `Estimate_${data.projectName.replace(/\s+/g, "_")}.pdf`;
                            // document.body.appendChild(a);
                            // a.click();
                            // document.body.removeChild(a);
                            // URL.revokeObjectURL(url);
                        });

                        fileInput.click();







                        console.log("um?");
                        break;

                    // case "i":

                    //     break;


                    // case "e":
                    //     ChangingPitch = true;
                    //     Camera.lowerRadiusLimit = Camera.radius;
                    //     Camera.upperRadiusLimit = Camera.radius;
                    //     break;

                    // case "shift":
                    //     console.log("Shift is down");
                    //     HoldingShift = true;
                    //     SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                    //     break;
                }
            }

            // if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
            //     // console.log("Released:", kbInfo.event.key);
            //     switch (kbInfo.event.key.toLowerCase()) {
            //         case "shift":
            //             HoldingShift = false;
            //             SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
            //             break;

            //         case "e":
            //             ChangingPitch = false;
            //             Camera.lowerRadiusLimit = 10;
            //             Camera.upperRadiusLimit = null;
            //             break;
            //     }
            // }
=======
                    case "q":
                        SketchLine.ActiveSketch?.Delete();
                        SketchLine.ActiveSketch = null;
                        break;

                    case "f":
                        if (SketchLine.ActiveSketch && SketchLine.ActiveSketch.HasExtruded) SketchLine.ActiveSketch.DrawingMode = SketchLine.ActiveSketch.DrawingMode == "LINE" ? "EXTRUSION" : "LINE";
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;

                    case "e":
                        ChangingPitch = true;
                        Camera.lowerRadiusLimit = Camera.radius;
                        Camera.upperRadiusLimit = Camera.radius;
                        break;

                    case "1":
                        UI_Controls.Checkbox0.isChecked = !UI_Controls.Checkbox0.isChecked;
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;

                    case "2":
                        UI_Controls.Checkbox1.isChecked = !UI_Controls.Checkbox1.isChecked;
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;

                    case "3":
                        UI_Controls.Checkbox2.isChecked = !UI_Controls.Checkbox2.isChecked;
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;

                    case "4":
                        UI_Controls.Checkbox3.isChecked = !UI_Controls.Checkbox3.isChecked;
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;

                    case "Shift":
                        console.log("Shift is down");
                        HoldingShift = true;
                        SketchLine.ActiveSketch?.UpdateWithPointer(HoldingShift);
                        break;

                    case "Escape":
                        PanelViewCollapsed = !PanelViewCollapsed;
                        let RoofingEditor = window.document.getElementById("RoofingEditor") as HTMLElement;
                        let PanelViewer = window.document.getElementById("PanelViewer") as HTMLElement;
                        // FlatMapElement.style.marginLeft =
                        RoofingEditor.style.marginLeft = PanelViewCollapsed ? "0%" : "30%";
                        RoofingEditor.style.width = PanelViewCollapsed ? "100%" : "70%";
                        PanelViewer.style.marginRight = PanelViewCollapsed ? "0%" : "70%";
                        PanelViewer.style.width = PanelViewCollapsed ? "0%" : "30%";
                        Engine.resize();
                        this.PanelEngine?.resize();
                        updateOrtho();
                        console.log("Escape key pressed");
                        break;
                }
            }

            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
                console.log("Released:", kbInfo.event.key);
                switch (kbInfo.event.key) {
                    case "Shift":
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

        EditorUI.onControlPickedObservable.add(control => {
            if (control.isPointerBlocker) {
                CanDraw = false;
                // Camera.detachControl();
            }
        });

        EditorUI.executeOnAllControls(control => {
            if (control.isPointerBlocker) {
                control.onPointerOutObservable.add(() => {
                    CanDraw = true;
                    // Camera.attachControl(true);
                });
            }
        });

        setTimeout(() => {
            UI_Controls.Rectangle1.isPointerBlocker = true;
        }, 500);


        console.log(UI_Controls.Line0A)

        function UpdateDrawing() {
            let Y0 = UI_Controls.Checkbox0.isChecked ? ((UI_Controls.Checkbox2.isChecked && UI_Controls.Checkbox3.isChecked) ? "160px" : "128px") : "192px";
            UI_Controls.Line.y1 = Y0;
            UI_Controls.Line0A.y2 = Y0;
            UI_Controls.Line0B.y2 = Y0;

            let Y1 = UI_Controls.Checkbox1.isChecked ? ((UI_Controls.Checkbox2.isChecked && UI_Controls.Checkbox3.isChecked) ? "32px" : "64px") : "0px";
            UI_Controls.Line.y2 = Y1;
            UI_Controls.Line1A.y2 = Y1;
            UI_Controls.Line1B.y2 = Y1;

            // console.log(UI_Controls.Line);
            UI_Controls.Line.lineWidth = (UI_Controls.Checkbox2.isChecked && UI_Controls.Checkbox3.isChecked) ? 1 : 3;

            let LineX = UI_Controls.Checkbox2.isChecked ? (UI_Controls.Checkbox3.isChecked ? "32px" : "64px") : "0px";
            UI_Controls.Line.x1 = LineX
            UI_Controls.Line.x2 = LineX;
            UI_Controls.Line1A.x2 = LineX;
            UI_Controls.Line1B.x2 = LineX;
            UI_Controls.Line0A.x2 = LineX;
            UI_Controls.Line0B.x2 = LineX;

            UI_Controls.Textblock0.isVisible = UI_Controls.Checkbox0.isChecked;
            UI_Controls.Textblock1.isVisible = UI_Controls.Checkbox1.isChecked;
            UI_Controls.Textblock2.isVisible = UI_Controls.Checkbox2.isChecked;
            UI_Controls.Textblock3.isVisible = UI_Controls.Checkbox3.isChecked;
        };

        UpdateDrawing();

        // UI_Controls.Primary0.getChildByName()
        PrimaryText0.text = "RUN";
        PrimaryText1.text = "RUN";

        UI_Controls.Primary0.onPointerClickObservable.add(function (eventData, eventState) {
            let TEXT = PrimaryText0.text;
            PrimaryText0.text = (TEXT == "RUN") ? "RISE" : (TEXT == "RISE") ? "PITCH" : (TEXT == "PITCH") ? "RUN" : "N/A";
            if (!SketchLine.ActiveSketch) return;
            SketchLine.ActiveSketch.Line0.PRIMARY = PrimaryText0.text;
        });

        UI_Controls.Primary1.onPointerClickObservable.add(function (eventData, eventState) {
            let TEXT = PrimaryText1.text;
            PrimaryText1.text = (TEXT == "RUN") ? "RISE" : (TEXT == "RISE") ? "PITCH" : (TEXT == "PITCH") ? "RUN" : "N/A";
            if (!SketchLine.ActiveSketch) return;
            SketchLine.ActiveSketch.Line1.PRIMARY = PrimaryText1.text;
        });

        UI_Controls.Primary2.onPointerClickObservable.add(function (eventData, eventState) {
            let TEXT = PrimaryText2.text;
            PrimaryText2.text = (TEXT == "RUN") ? "RISE" : (TEXT == "RISE") ? "PITCH" : (TEXT == "PITCH") ? "RUN" : "N/A";
            if (!SketchLine.ActiveSketch) return;
            SketchLine.ActiveSketch.LineA.PRIMARY = PrimaryText2.text;
        });

        UI_Controls.Primary3.onPointerClickObservable.add(function (eventData, eventState) {
            let TEXT = PrimaryText3.text;
            PrimaryText3.text = (TEXT == "RUN") ? "RISE" : (TEXT == "RISE") ? "PITCH" : (TEXT == "PITCH") ? "RUN" : "N/A";
            if (!SketchLine.ActiveSketch) return;
            SketchLine.ActiveSketch.LineB.PRIMARY = PrimaryText3.text;
        });
        // console.log(UI_Controls.Rise0);
        // UI_Controls.Rise0.onTextChangedObservable.add(function (test) {
        //     console.log("TEST", test.text == +test.text);
        // });

        // UI_Controls.Rise0.onEnterPressedObservable.add(function (test) {
        //     console.log("TEST2", test.text == +test.text);
        // });

        // UI_Controls.Rise0.onPointerUpObservable.add(function (test) {
        //     console.log("EEE", test);
        //     // console.log("TEST3", test.text == +test.text);
        // });

        UI_Controls.Checkbox0.onIsCheckedChangedObservable.add(function (Value) {
            UpdateDrawing();
            if (!SketchLine.ActiveSketch) return;
            SketchLine.ActiveSketch.Line0.ENABLED = Value;
        });

        UI_Controls.Checkbox1.onIsCheckedChangedObservable.add(function (Value) {
            UpdateDrawing();
            if (!SketchLine.ActiveSketch) return;
            SketchLine.ActiveSketch.Line1.ENABLED = Value;
        });

        UI_Controls.Checkbox2.onIsCheckedChangedObservable.add(function (Value) {
            UI_Controls.Checkbox3.isChecked = Value ? UI_Controls.Checkbox3.isChecked : true
            UpdateDrawing();
            if (!SketchLine.ActiveSketch) return;
            SketchLine.ActiveSketch.LineB.ENABLED = UI_Controls.Checkbox3.isChecked;
            SketchLine.ActiveSketch.LineA.ENABLED = Value;
        });

        UI_Controls.Checkbox3.onIsCheckedChangedObservable.add(function (Value) {
            UI_Controls.Checkbox2.isChecked = Value ? UI_Controls.Checkbox2.isChecked : true;
            UpdateDrawing();
            if (!SketchLine.ActiveSketch) return;
            SketchLine.ActiveSketch.LineA.ENABLED = UI_Controls.Checkbox2.isChecked;
            SketchLine.ActiveSketch.LineB.ENABLED = Value;
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
        });
    }
}