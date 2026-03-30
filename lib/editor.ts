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

                            let MinHeight = Infinity;
                            let MaxHeight = -Infinity;
                            for (let y of NormalizedHeights) {
                                MinHeight = Math.min(MinHeight, y);
                                MaxHeight = Math.max(MaxHeight, y);
                            }
                            console.log("NORMALIZED HEIGHTS (MM)", NormalizedHeights, MinHeight, MaxHeight);

                            // i didn't realize that .map was turning it into whole numbers... oml.
                            let MapHeights = []; // NormalizedHeights.map((Height) => Height / 100); // mm to dm //
                            for (let Height of NormalizedHeights) {
                                MapHeights.push(Height / 100);
                                // MapHeights.push(Math.round(Height / 100)); // Might have this re-enabled to prevent people from just taking the DSMs, idk.
                            }

                            let MinHeightInDM = Infinity;
                            let MaxHeightInDM = -Infinity;
                            for (let y of MapHeights) {
                                MinHeightInDM = Math.min(MinHeightInDM, y);
                                MaxHeightInDM = Math.max(MaxHeightInDM, y);
                            }

                            console.log("MAP HEIGHTS (DM)", MapHeights, MinHeightInDM, MaxHeightInDM);
                            // console.log("Min Height", Math.min(...MapHeights));
                            // console.log("Max Height", Math.max(...MapHeights));
                            // Each pixel is 1 dm, and the height are whole numbers measured in dm. //

                            let ModifiedMask = removeBorderConnected(KissMyAss.Mask, Width, Length); // new Uint8Array(KissMyAss.Mask.byteLength).fill(1); // 

                            /*
                            Forgetting the previous questions regarding roofing to prevent any bias and repetition. I have a DSM raster that consists of heights measured in whole decimeters, each pixel is 1dm in width and height, it is also not aligned with the house at all. I am trying to recreate a roof with each roof plane split up as its own. I would like each roof plane to be as complete as possible where obstructions above it do not affect its geometry unless it is a gap of some sort, due to this, I would like it to reconstruct those areas like if a tree was covering part of the roof and it detected the height being much higher than it should be, especially if the (slightly unreliable) roof mask (consisting of 0 and 1s for non-roof and roof) determined it was not a roof at that point. I would like to use multi-plane fitting to determine shared edges between these roof planes. These roof planes need to be simple and sharp with straight lines, no jagged/stair-stepping, that way I can layer a custom roof model on top of them. The 3D model is being made in Babylon.js. All I have to feed it should be the DSM raster, roof mask (slightly unreliable, but helps with figuring out where to start), width, height, the Babylon scene, and the scalar. I'd advise for the most consistent results to use intersections on every height from top to bottom (via azimuth) within the height boundaries of each roof plane to stretch it both ways unless it detects that it is a gable or whatever other limiter that makes sense. This would allow for straight and shared lines.
                            
                            */

                            // if (true) return;

                            console.log("HEIGHTS", MapHeights);
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

                            // console.log(result);

                            {
                                // console.log("LENGTH OF RGB???", width, height, rasters.length, rasters)
                                for (let i = 0, k = 0; i < Width * Length; i++, k += 3) {
                                    // let HeightAtPixel = NormalizedHeights[i];
                                    // let HeightAtPixelSimp = Math.round(NormalizedHeights[i] / 10);
                                    // let Most = HeightCounts[0];
                                    // let MostSimp = HeightCountsSimp[0];
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

                                    let Relativity = (MapHeights[i] - RoofMinHeight) / (RoofMaxHeight - RoofMinHeight); // HouseAzimuth
                                    if (ModifiedMask[i] == 1) {
                                        DrawRGB[k] = KissMyAss.RGB[k] * Relativity;
                                        DrawRGB[k + 1] = KissMyAss.RGB[k + 1] * Relativity;
                                        DrawRGB[k + 2] = KissMyAss.RGB[k + 2] * Relativity;
                                    }
                                }

                                createGroundFromHeightArray("E", DrawHeights, DrawRGB, Width, Length, 39.3701 / 10, 39.3701 / 10, Editor.ActiveEditor.Scene);

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