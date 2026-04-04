// @ts-nocheck
import * as BABYLON from "@babylonjs/core";
import * as BABYLON_UI from "@babylonjs/gui";
import { GridMaterial } from "@babylonjs/materials";
import { SketchPlane } from "./drawings";
import "./drawings-babylon";
import { FromSupabase, FromGoogle } from "./og-backend";

export class Editor {
    static ActiveEditor: Editor;

    Engine: BABYLON.Engine;
    Scene: BABYLON.Scene;
    Camera: BABYLON.ArcRotateCamera;
    RoofUI: BABYLON_UI.AdvancedDynamicTexture;

    static RoofColor = new BABYLON.Color3(1, 1, 1);
    static SelectedProfile = "standing-seam";
    static SelectedPanelWidth = 16;

    DesignGrid: BABYLON.Mesh;

    LabelMarkerXYZ(X: number, Y: number, Z: number, Text: string = "Vertex") {
        let marker = BABYLON.MeshBuilder.CreateSphere("marker", { diameter: 0.01 }, this.Scene);
        marker.isVisible = false; // don’t show it
        marker.position.set(X, Y, Z);
        let text = new BABYLON_UI.TextBlock();
        text.text = Text;
        this.RoofUI.addControl(text);
        text.linkWithMesh(marker); // text follows invisible mesh
        text.color = "white"; // "Black";
        return [marker, text];
    }

    ReconstructFromJson(JSON_Output) {
        for (let SketchID in SketchPlane.AllDrawings) {
            SketchPlane.AllDrawings[SketchID].Delete();
            delete SketchPlane.AllDrawings[SketchID];
        }
        SketchPlane.AllDrawings = [];

        for (let SketchJson of JSON_Output) {
            let Sketch = new SketchPlane(Editor.ActiveEditor, SketchJson.StartX, SketchJson.StartY, SketchJson.StartZ, SketchJson.Angle);
            Sketch.LeftSidePoints = SketchJson.LeftSide;
            Sketch.RightSidePoints = SketchJson.RightSide;
            Sketch.LengthAnchor = 0;
            Sketch.RunAnchor = 0;

            Sketch.Length = SketchJson.Length;
            Sketch.PRIMARY = "D";
            Sketch.PITCH = SketchJson.PITCH;
            Sketch.RISE = SketchJson.RISE;
            Sketch.RUN = SketchJson.RUN;

            Sketch.Update();
        }
    }

    constructor(Engine: BABYLON.Engine, Scene: BABYLON.Scene, Camera: BABYLON.ArcRotateCamera, RoofUI: BABYLON_UI.AdvancedDynamicTexture) {
        // Editor.ActiveEditor = this; // ig this also works?
        this.Engine = Engine;
        this.Scene = Scene;
        this.Camera = Camera;
        this.RoofUI = RoofUI;

        let DesignGrid = this.DesignGrid = BABYLON.Mesh.CreateGround("ground", 10000, 10000, 10, Scene);
        var gridMaterial = new GridMaterial("gridMaterial", Scene);
        gridMaterial.mainColor = BABYLON.Color4.FromInts(230, 230, 235, 255);
        gridMaterial.lineColor = BABYLON.Color4.FromInts(25, 25, 30);
        gridMaterial.opacity = .8;
        DesignGrid.material = gridMaterial
        // DesignGrid.isVisible = false;

        Scene.onKeyboardObservable.add(async (kbInfo) => {
            if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
                // console.log(kbInfo.event.key)
                switch (kbInfo.event.key.toLowerCase()) {
                    case "o":
                        // await FromGoogle(36.278701199722306, -86.53096983274459);
                        // console.log('werk?')
                        // if (true) break;
                        const fileInput = document.createElement("input");
                        fileInput.type = "file";
                        fileInput.multiple = true;
                        fileInput.style.display = "none";
                        fileInput.accept = ".kyxr";
                        document.body.appendChild(fileInput);

                        fileInput.addEventListener("change", async () => {
                            const file = fileInput.files?.[0];
                            if (!file) return;

                            fileInput.value = "";
                            fileInput.remove();

                            const Bytes = new Uint8Array(await file.arrayBuffer());
                            const Results = await FromSupabase(Bytes);

                            this.ReconstructFromJson(Results.Main);

                            // console.log("DrawHeights", Results.DrawHeights);

                            // const ground = createGroundFromHeightArray("E", Results.DrawHeights, Results.DrawRGB, Results.Width, Results.Length, 39.3701 / 10, 39.3701 / 10, Editor.ActiveEditor.Scene);
                            // ground.position.y -= 5;
                        });

                        fileInput.click();
                        break;
                }
            }
        });
    }
}