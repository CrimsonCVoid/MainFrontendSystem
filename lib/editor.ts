// @ts-nocheck
// import * as BABYLON from "@babylonjs/core/index.js";

import * as BABYLON from "@babylonjs/core";
import * as BABYLON_UI from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";

import { SketchLine } from "./drawings";

// EditorUI.json was removed — GUI controls are created programmatically if needed
import { AdvancedDynamicTexture } from "@babylonjs/gui";
// import { FromSupabase } from "./og-backend"; // DebuggingClass
import { CFrame, Vector3 } from "./positioning";

type xyz_Class = { x: number, y: number, z: number };

export type SketchJsonEntry = {
    Length: number;
    Angle: number;
    StartX: number;
    StartY: number;
    StartZ: number;
    LeftSide: Array<{ x: number; y: number; z: number } | { X: number; Y: number; Z: number }>;
    RightSide: Array<{ x: number; y: number; z: number } | { X: number; Y: number; Z: number }>;
    PITCH: number;
    RISE: number;
    RUN: number;
};

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
    // static RoofPBR_Material: BABYLON.PBRMetallicRoughnessMaterial;
    static SelectedProfile = "standing-seam";
    static SelectedPanelWidth = 16;
    static RoofColor = BABYLON.Color3.FromHexString("#FFFFFF");

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
        Editor.ActiveEditor = this; // ig this also works?
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


        // GUI controls created inline below (EditorUI.json removed)
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

        // Camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        Camera.minZ = 0.1;
        Camera.maxZ = 100000;

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
        };

        // Scene.onBeforeRenderObservable.add(() => {
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

        Camera.lowerBetaLimit = 0; // -Math.PI / 2;
        Camera.upperBetaLimit = Math.PI / 2;

        var PanelViewCollapsed = true;

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

                            // const Results = await FromSupabase(file, jsonfile);

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
        });
    }

    /**
     * Reconstruct roof sketch lines from backend JSON_Output data.
     * This takes the serialized sketch data from ExportData and rebuilds
     * the full SketchLine geometry in the editor's Babylon.js scene.
     */
    reconstructFromJSON(jsonOutput: SketchJsonEntry[]) {
        // Clear existing drawings
        for (const drawing of SketchLine.AllDrawings) {
            drawing.Delete();
        }
        SketchLine.AllDrawings = [];

        for (let i = 0; i < jsonOutput.length; i++) {
            const entry = jsonOutput[i];
            console.log(`[Editor] Sketch ${i}: Start=(${entry.StartX?.toFixed(1)}, ${entry.StartY?.toFixed(1)}, ${entry.StartZ?.toFixed(1)}), Len=${entry.Length?.toFixed(1)}, Angle=${entry.Angle?.toFixed(3)}, PITCH=${entry.PITCH?.toFixed(3)}, RISE=${entry.RISE?.toFixed(1)}, RUN=${entry.RUN?.toFixed(1)}, Left=${entry.LeftSide?.length}pts, Right=${entry.RightSide?.length}pts`);
            // Normalize LeftSide/RightSide to Vector3[] (backend may send either format)
            const toVec3 = (p: any): Vector3 => {
                if (p instanceof Vector3) return p;
                const x = p.X ?? p.x ?? 0;
                const y = p.Y ?? p.y ?? 0;
                const z = p.Z ?? p.z ?? 0;
                return new Vector3(x, y, z);
            };

            const LeftSide = entry.LeftSide.map(toVec3);
            const RightSide = entry.RightSide.map(toVec3);

            const Sketch = new SketchLine(this, entry.StartX, entry.StartY, entry.StartZ);
            Sketch.DrawLine.LeftSidePoints = LeftSide;
            Sketch.DrawLine.RightSidePoints = RightSide;
            Sketch.DrawLine.LengthAnchor = 0;
            Sketch.DrawLine.RunAnchor = 0;
            Sketch.Start();

            Sketch.DrawLine.Angle = entry.Angle;
            Sketch.DrawLine.Length = entry.Length;
            Sketch.DrawLine.PRIMARY = "D";
            Sketch.DrawLine.PITCH = entry.PITCH;
            Sketch.DrawLine.RISE = entry.RISE;
            Sketch.DrawLine.RUN = entry.RUN;

            Sketch.Commit();
            Sketch.Commit();
            Sketch.DrawLine.UpdateData();
            Sketch.DrawLine.Update();
        }

        console.log(`[Editor] Reconstructed ${jsonOutput.length} sketch lines from JSON`);

        // Debug: log all Panel meshes and TopLine points
        for (let i = 0; i < SketchLine.AllDrawings.length; i++) {
            const dl = SketchLine.AllDrawings[i].DrawLine;
            const tp = dl.TopLineSettings.points;
            const bp = dl.BottomLineSettings.points;
            console.log(`[Editor] Sketch ${i} TopLine: (${tp[0]?.x?.toFixed(1)},${tp[0]?.y?.toFixed(1)},${tp[0]?.z?.toFixed(1)}) → (${tp[1]?.x?.toFixed(1)},${tp[1]?.y?.toFixed(1)},${tp[1]?.z?.toFixed(1)})`);
            console.log(`[Editor] Sketch ${i} BottomLine: (${bp[0]?.x?.toFixed(1)},${bp[0]?.y?.toFixed(1)},${bp[0]?.z?.toFixed(1)}) → (${bp[1]?.x?.toFixed(1)},${bp[1]?.y?.toFixed(1)},${bp[1]?.z?.toFixed(1)})`);
            console.log(`[Editor] Sketch ${i} Panel exists: ${!!dl.Panel}, Panel vertices: ${dl.Panel?.getTotalVertices?.() ?? 'N/A'}`);
            if (dl.Panel) {
                const b = dl.Panel.getBoundingInfo?.()?.boundingBox;
                if (b) console.log(`[Editor] Sketch ${i} Panel bbox: min=(${b.minimumWorld.x.toFixed(1)},${b.minimumWorld.y.toFixed(1)},${b.minimumWorld.z.toFixed(1)}), max=(${b.maximumWorld.x.toFixed(1)},${b.maximumWorld.y.toFixed(1)},${b.maximumWorld.z.toFixed(1)})`);
            }
        }

        return SketchLine.AllDrawings;
    }

    /**
     * Focus the camera on all reconstructed SketchLines.
     * Computes a bounding box from all line endpoints and targets the camera at the center.
     * If no Panels were created, falls back to rendering simple polygon meshes from the sketch data.
     */
    focusOnRoof(jsonOutput?: SketchJsonEntry[]) {
        // First check if any Panel meshes actually exist with vertices
        let hasPanels = false;
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const sketch of SketchLine.AllDrawings) {
            const dl = sketch.DrawLine;
            if (dl.Panel && dl.Panel.getTotalVertices() > 0) {
                hasPanels = true;
                const b = dl.Panel.getBoundingInfo()?.boundingBox;
                if (b) {
                    minX = Math.min(minX, b.minimumWorld.x); maxX = Math.max(maxX, b.maximumWorld.x);
                    minY = Math.min(minY, b.minimumWorld.y); maxY = Math.max(maxY, b.maximumWorld.y);
                    minZ = Math.min(minZ, b.minimumWorld.z); maxZ = Math.max(maxZ, b.maximumWorld.z);
                }
            }
            // Also check TopLine/BottomLine points
            const points = [...dl.TopLineSettings.points, ...dl.BottomLineSettings.points];
            for (const p of points) {
                if (!p) continue;
                minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
            }
        }

        console.log(`[Editor] focusOnRoof — hasPanels=${hasPanels}, bounds: (${minX.toFixed(1)},${minY.toFixed(1)},${minZ.toFixed(1)}) → (${maxX.toFixed(1)},${maxY.toFixed(1)},${maxZ.toFixed(1)})`);

        // Fallback: if no panels rendered, create simple polygon meshes from LeftSide/RightSide data
        if (!hasPanels && jsonOutput?.length) {
            console.log(`[Editor] No panels found — rendering fallback polygon meshes from sketch data`);
            this._renderFallbackMeshes(jsonOutput);
        }

        if (!isFinite(minX)) {
            // If no bounds from SketchLines, try to compute from raw JSON data
            if (jsonOutput?.length) {
                for (const entry of jsonOutput) {
                    const allPts = [...(entry.LeftSide || []), ...(entry.RightSide || [])];
                    for (const p of allPts) {
                        const x = (p as any).X ?? (p as any).x ?? 0;
                        const y = (p as any).Y ?? (p as any).y ?? 0;
                        const z = (p as any).Z ?? (p as any).z ?? 0;
                        // SketchLine maps: Babylon x=X, y=Z, z=Y (swapped Y/Z)
                        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                        minY = Math.min(minY, z); maxY = Math.max(maxY, z);
                        minZ = Math.min(minZ, y); maxZ = Math.max(maxZ, y);
                    }
                }
            }
            if (!isFinite(minX)) return;
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);

        console.log(`[Editor] focusOnRoof — center=(${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)}), extent=${extent.toFixed(1)}`);

        const target = new BABYLON.Vector3(centerX, centerY, centerZ);
        this.Camera.setTarget(target);
        this.Camera.radius = extent * 1.2;
        this.Camera.lowerRadiusLimit = extent * 0.3;
        this.Camera.upperRadiusLimit = extent * 5;
    }

    /**
     * Fallback renderer: creates simple colored polygon meshes from LeftSide/RightSide vertex data.
     * Used when the SketchLine Panel rendering fails.
     */
    private _fallbackMeshes: BABYLON.Mesh[] = [];

    private _renderFallbackMeshes(jsonOutput: SketchJsonEntry[]) {
        // Dispose old fallback meshes
        for (const m of this._fallbackMeshes) m.dispose();
        this._fallbackMeshes = [];

        const mat = new BABYLON.PBRMetallicRoughnessMaterial("fallbackRoofMat", this.Scene);
        mat.baseColor = Editor.RoofColor;
        mat.metallic = 0.5;
        mat.roughness = 0.25;
        mat.backFaceCulling = false;

        for (let i = 0; i < jsonOutput.length; i++) {
            const entry = jsonOutput[i];
            const left = entry.LeftSide || [];
            const right = entry.RightSide || [];
            if (left.length < 2 || right.length < 2) continue;

            // Build a quad/polygon from LeftSide + reversed RightSide
            // Backend coordinate system: X,Y,Z where Y is height
            // Babylon: x=right, y=up, z=forward
            // The editor's LabelMarker maps: Babylon(V3.x, V3.z, V3.y) suggesting x→x, y→z, z→y
            const positions: number[] = [];
            const allPts: Array<{x: number, y: number, z: number}> = [];

            for (const p of left) {
                const px = (p as any).X ?? (p as any).x ?? 0;
                const py = (p as any).Y ?? (p as any).y ?? 0;
                const pz = (p as any).Z ?? (p as any).z ?? 0;
                allPts.push({x: px, y: pz, z: py}); // swap Y/Z for Babylon
            }
            for (let j = right.length - 1; j >= 0; j--) {
                const p = right[j];
                const px = (p as any).X ?? (p as any).x ?? 0;
                const py = (p as any).Y ?? (p as any).y ?? 0;
                const pz = (p as any).Z ?? (p as any).z ?? 0;
                allPts.push({x: px, y: pz, z: py}); // swap Y/Z for Babylon
            }

            if (allPts.length < 3) continue;

            for (const pt of allPts) {
                positions.push(pt.x, pt.y, pt.z);
            }

            // Fan triangulation
            const indices: number[] = [];
            for (let t = 1; t < allPts.length - 1; t++) {
                indices.push(0, t, t + 1);
            }

            const normals: number[] = [];
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);

            const mesh = new BABYLON.Mesh(`fallback-roof-${i}`, this.Scene);
            const vd = new BABYLON.VertexData();
            vd.positions = positions;
            vd.indices = indices;
            vd.normals = normals;
            vd.applyToMesh(mesh);
            mesh.material = mat;
            this._fallbackMeshes.push(mesh);

            const bb = mesh.getBoundingInfo()?.boundingBox;
            console.log(`[Editor] Fallback mesh ${i}: ${allPts.length} verts, bbox=(${bb?.minimumWorld.x.toFixed(1)},${bb?.minimumWorld.y.toFixed(1)},${bb?.minimumWorld.z.toFixed(1)}) → (${bb?.maximumWorld.x.toFixed(1)},${bb?.maximumWorld.y.toFixed(1)},${bb?.maximumWorld.z.toFixed(1)})`);
        }
    }
}