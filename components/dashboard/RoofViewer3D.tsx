"use client";

/**
 * ROOFVIEWER3D - 3D Roof Visualization Component
 *
 * Interactive Babylon.js-powered 3D roof configurator.
 * Currently displays a mock gable roof with configurable dimensions.
 *
 * KY - INTEGRATION POINTS:
 * 1. Add `roofData` prop to replace mock geometry (see line 160-171 and line 243-249)
 * 2. roofData should contain: { planes: [...], measurements: {...}, total_area_sf: number }
 * 3. This component will render actual roof geometry from your algorithm instead of simple gable
 *
 * CURRENT BEHAVIOR:
 * - Loads Babylon.js from CDN
 * - Creates simple two-sided gable roof with panels
 * - Displays ridge cap, gutter trim, and standing seam panels
 * - User can orbit camera, spin auto-rotation, change color
 *
 * HOW IT WORKS:
 * - ensureBabylon(): Dynamically loads Babylon.js library
 * - useLayoutEffect: Initializes 3D scene when component mounts
 * - makePanel(): Creates individual roof plane geometry (REPLACE with real data)
 * - Material system: Uses PBR materials for realistic metal appearance
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as BABYLON from "@babylonjs/core";
/* eslint-disable no-constant-binary-expression */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Editor } from "@/lib/editor";
// import { CreateGoogleDebugMesh, GetMapCenterLAT, GetMapCenterLON, SetMapCenter } from "@/lib/utils";

declare global { interface Window { BABYLON?: any } }

// // Babylon.js CDN loader - ensures library is loaded before creating scene
// let babylonReady: Promise<void> | null = null;
// async function ensureBabylon() {
//   if (typeof window === "undefined" || window.BABYLON) return;
//   if (!babylonReady) {
//     const add = (src: string) =>
//       new Promise<void>((res, rej) => {
//         const s = window.document.createElement("script");
//         s.src = src; s.async = true;
//         s.onload = () => res();
//         s.onerror = () => rej(new Error(`Failed to load ${src}`));
//         window.document.head.appendChild(s);
//       });
//     babylonReady = Promise.resolve().then(() => add("https://cdn.babylonjs.com/babylon.js"));
//   }
//   await babylonReady;
// }

type PanelProfile = "standing-seam" | "r-panel" | "5v-crimp" | "pbr-panel";

type Props = {
  className?: string;
  /** eave-to-eave (X), meters */
  width?: number;
  /** rake-to-rake (Z across slope direction), meters */
  depth?: number;
  /** rise/run (0.5 ≈ 6:12) */
  pitch?: number;
  /** horizontal overhang at the eaves (meters) */
  overhang?: number;
  /** panel thickness (meters) */
  thickness?: number;
  /** standing-seam spacing (m) ~0.4572 = 18" */
  seamSpacing?: number;
  /** spin the roof */
  spin?: boolean;
  /** panel color */
  color?: string;
  /** hide all UI controls (for hero/landing page) */
  hideControls?: boolean;
};

export default function RoofViewer3D({
  className = "",
  width = 12,
  depth = 8,
  pitch = 0.5,
  overhang = 0.20,
  thickness = 0.035,
  seamSpacing = 0.4572,
  spin = true,
  color = "#4B5563",
  hideControls = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<any>(null);
  const panelMaterialRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const meshesRef = useRef<any>(null);
  const [selectedColor, setSelectedColor] = useState(color);
  const [selectedSeries, setSelectedSeries] = useState<"select" | "reserve" | "benchmark">("select");
  const [isRotating, setIsRotating] = useState(spin);
  const [currentView, setCurrentView] = useState<"perspective" | "top" | "front" | "side">("perspective");
  const [panelProfile, setPanelProfile] = useState<PanelProfile>("standing-seam");
  const [showColorPicker, setShowColorPicker] = useState(true);

  // MMR color collections (official color chart)
  const roofColors = {
    select: [
      { name: "Aged Copper", hex: "#8B6F47", coating: "PVDF 70%" },
      { name: "Almond", hex: "#E6D5B8", coating: "PVDF 70%" },
      { name: "Bayside Black", hex: "#1A1A1A", coating: "PVDF 70%" },
      { name: "Buckskin", hex: "#C8B896", coating: "PVDF 70%" },
      { name: "Burgundy", hex: "#6B1F3D", coating: "PVDF 70%" },
      { name: "Charcoal Gray", hex: "#4A5568", coating: "PVDF 70%" },
      { name: "Colonial Red", hex: "#8B2E2E", coating: "PVDF 70%" },
      { name: "Dark Bronze", hex: "#4A3728", coating: "PVDF 70%" },
      { name: "Dove Gray", hex: "#9E9E9E", coating: "PVDF 70%" },
      { name: "Evergreen", hex: "#2D5016", coating: "PVDF 70%" },
      { name: "Hartford Green", hex: "#3D5A3D", coating: "PVDF 70%" },
      { name: "Hemlock Green", hex: "#2F4538", coating: "PVDF 70%" },
      { name: "Mansard Brown", hex: "#5C4033", coating: "PVDF 70%" },
      { name: "Matte Black", hex: "#2B2B2B", coating: "PVDF 70%" },
      { name: "Medium Bronze", hex: "#6B4423", coating: "PVDF 70%" },
      { name: "Patina Green", hex: "#4A6B5C", coating: "PVDF 70%" },
      { name: "Regal Blue", hex: "#2C5F8D", coating: "PVDF 70%" },
      { name: "Regal Red", hex: "#A23B3B", coating: "PVDF 70%" },
      { name: "Regal White", hex: "#F5F5F5", coating: "PVDF 70%" },
      { name: "Sandstone", hex: "#D4C5A9", coating: "PVDF 70%" },
      { name: "Sierra Tan", hex: "#C8A882", coating: "PVDF 70%" },
      { name: "Slate Blue", hex: "#546E7A", coating: "PVDF 70%" },
      { name: "Slate Gray", hex: "#6B7C8C", coating: "PVDF 70%" },
      { name: "Solar White", hex: "#FCFCFC", coating: "PVDF 70%" },
      { name: "Terra Cotta", hex: "#B8704F", coating: "PVDF 70%" },
      { name: "Tropical Patina", hex: "#5A7C6B", coating: "PVDF 70%" },
    ],
    reserve: [
      { name: "Champagne Metallic", hex: "#D4AF6A", coating: "Metallic" },
      { name: "Copper Metallic", hex: "#B87333", coating: "Metallic" },
      { name: "Pre-Weathered Metallic", hex: "#6B675F", coating: "Metallic" },
      { name: "Silver Metallic", hex: "#C0C0C0", coating: "Metallic" },
      { name: "Vintage Copper", hex: "#9C6B4E", coating: "Weathered" },
      { name: "Vintage Galvalume", hex: "#A8A8A8", coating: "Weathered" },
      { name: "Vintage Steel", hex: "#5C5C5C", coating: "Weathered" },
    ],
    benchmark: [
      { name: "Berry", hex: "#6B2D5C", coating: "SMP" },
      { name: "Black", hex: "#2B2B2B", coating: "SMP" },
      { name: "Buckskin", hex: "#C8B896", coating: "SMP" },
      { name: "Charcoal", hex: "#4A5568", coating: "SMP" },
      { name: "Cocoa Brown", hex: "#5C4033", coating: "SMP" },
      { name: "Colony Green", hex: "#3D5A3D", coating: "SMP" },
      { name: "Copper Metallic", hex: "#B87333", coating: "SMP" },
      { name: "Crimson Red", hex: "#A23B3B", coating: "SMP" },
      { name: "Evergreen", hex: "#2D5016", coating: "SMP" },
      { name: "Gallery Blue", hex: "#4A6B8C", coating: "SMP" },
      { name: "Hawaiian Blue", hex: "#5A8BAF", coating: "SMP" },
      { name: "Ivory", hex: "#FFFFF0", coating: "SMP" },
      { name: "Light Stone", hex: "#D4C5A9", coating: "SMP" },
      { name: "Old Town Gray", hex: "#8B8680", coating: "SMP" },
      { name: "Polar White", hex: "#FAFAFA", coating: "SMP" },
      { name: "Rustic Red", hex: "#8B4545", coating: "SMP" },
      { name: "Saddle Tan", hex: "#B8956F", coating: "SMP" },
    ],
  };

  // Panel profile options
  const panelProfiles = [
    {
      id: "standing-seam" as const,
      name: "Standing Seam",
      description: "Concealed fasteners",
      icon: "|||"
    },
    {
      id: "r-panel" as const,
      name: "R-Panel",
      description: "Exposed fasteners",
      icon: "∩∩∩"
    },
    {
      id: "5v-crimp" as const,
      name: "5V Crimp",
      description: "Agricultural panel",
      icon: "VVV"
    },
    {
      id: "pbr-panel" as const,
      name: "PBR Panel",
      description: "Purlin bearing rib",
      icon: "∪∪∪"
    },
  ];

  // KY - INTEGRATION POINT:
  // Replace these mock dimensions with real roof data from your rendering algorithm
  // Add roofData prop to component: roofData?: { planes: [], measurements: {}, total_area_sf: number }
  // Then use roofData.planes to render actual geometry instead of simple mock roof
  const dims = useMemo(() => {
    const run = depth / 2;
    const rise = pitch * run;
    const slopeAngle = Math.atan(pitch);
    const slopedLen = Math.sqrt(run * run + rise * rise);
    const wTop = width;
    return { run, rise, slopeAngle, slopedLen, wTop };
  }, [width, depth, pitch]);

  // keep canvas sized to wrapper
  useLayoutEffect(() => {
    if (!wrapRef.current || !canvasRef.current) return;
    const wrap = wrapRef.current, canvas = canvasRef.current;
    const ro = new ResizeObserver(() => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      canvas.width = w; canvas.height = h;
      engineRef.current?.resize?.();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    (async () => {
      // await ensureBabylon();
      // const BABYLON = BABYLON; // window.BABYLON!;
      if (!canvasRef.current || disposed) return;

      try { engineRef.current?.dispose?.(); meshesRef.current?.dispose?.(); } catch { }
      meshesRef.current = [];
      const Engine = new BABYLON.Engine(canvasRef.current, true, {
        antialias: true,
        powerPreference: "high-performance",
        stencil: true, preserveDrawingBuffer: true, alpha: true
      });
      Engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
      engineRef.current = Engine;

      const Scene = new BABYLON.Scene(Engine);
      Scene.clearColor = BABYLON.Color4.FromInts(25, 25, 30, 0); // BABYLON.Color4.FromInts(230, 230, 235, 0);
      // Scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);
      Scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
        "https://assets.babylonjs.com/environments/environmentSpecular.env",
        Scene
      );

      const { run, rise, slopeAngle, slopedLen, wTop } = dims;

      var InchesInMeter = 39.3701;

      // camera
      const Camera = new BABYLON.ArcRotateCamera(
        "Camera",
        BABYLON.Tools.ToRadians(45),
        BABYLON.Tools.ToRadians(45),
        25 * InchesInMeter,
        BABYLON.Vector3.Zero(),
        Scene
      );
      Camera.attachControl(canvasRef.current, false);
      // Camera.panningSensibility = 0;
      Camera.minZ = 0.1;
      Camera.lowerRadiusLimit = 10;
      // Camera.speed *= 10;
      // Camera.wheelDeltaPercentage *= 10 * InchesInMeter; // Does nothing?
      Camera.wheelDeltaPercentage = .01;
      Camera.setTarget(BABYLON.Vector3.Zero());
      Camera.wheelPrecision = .3;
      Camera.panningSensibility *= .005;
      Camera.angularSensibilityX *= 1;
      Camera.angularSensibilityY *= 1;
      Camera.inputs.attached.pointers.buttons = [1, 2]; // Disables left-click.
      Camera.attachControl(canvasRef.current, true);
      cameraRef.current = Camera;

      // light
      new BABYLON.HemisphericLight("h", new BABYLON.Vector3(0, 1, 0), Scene).intensity = .4; // 0.8;
      const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.6, -1, -0.3), Scene);
      sun.position = new BABYLON.Vector3(15, 20, 12);
      sun.intensity = .4; // 1.1;

      // Root transform node for rotation control
      const root = new BABYLON.TransformNode("root", Scene);

      // Metal roof panel material (PBR with metallic properties)
      const panelMat = new BABYLON.PBRMetallicRoughnessMaterial("panelMat", Scene);
      panelMat.baseColor = BABYLON.Color3.FromHexString(selectedColor);
      panelMat.metallic = 1; panelMat.roughness = 0.25;
      panelMat.backFaceCulling = false;
      panelMaterialRef.current = panelMat;

      // KY - INTEGRATION POINT:
      // Replace makePanel logic with actual roof geometry from roofData.planes
      // Loop through roofData.planes and create meshes from vertices:
      // roofData.planes.forEach(plane => {
      //   const mesh = BABYLON.MeshBuilder.CreatePolygon("plane", { shape: plane.vertices }, scene);
      //   mesh.material = panelMat;
      // });









      var UpperMostLayer = new BABYLON.UtilityLayerRenderer(Scene);


      // CreateGoogleDebugMesh();

      // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
      let light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), Scene);
      light.intensity = 0; // .2; // 0.7;

      let HoverHighlight = new BABYLON.HighlightLayer("highlight", Scene);
      let SelectionHighlight = new BABYLON.HighlightLayer("highlight", Scene);
      // SelectionHighlight.color3 = 

      // let GUI3D = new BABYLON.GUI.GUI3DManager(Scene);
      let actionManager = new BABYLON.ActionManager(Scene);
      let PreviousMeshHover;
      let PreviousMeshSelected;

      // Action for when the pointer enters the mesh (hover start)
      actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnPointerOverTrigger,
          function (event) {
            if (event.source && event.source.ShowOnHover)
              for (let SHOW of event.source.ShowOnHover)
                SHOW.isVisible = true;
            if (PreviousMeshHover != null) HoverHighlight.removeMesh(PreviousMeshHover);
            if (event.source == PreviousMeshSelected && PreviousMeshSelected != null) return;
            PreviousMeshHover = event.source;
            if (PreviousMeshHover != null) HoverHighlight.addMesh(PreviousMeshHover, BABYLON.Color3.Blue());
          }
        )
      );

      // Action for when the pointer exits the mesh (hover end)
      actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnPointerOutTrigger,
          function (event) {
            if (event.source && event.source.ShowOnHover)
              for (let SHOW of event.source.ShowOnHover)
                SHOW.isVisible = false;
            if (PreviousMeshHover == null) return;
            HoverHighlight.removeMesh(PreviousMeshHover);
            PreviousMeshHover = null;
          }
        )
      );

      actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
          BABYLON.ActionManager.OnPickTrigger,
          function (event) {
            // Restore original material color
            console.log("AAAAAAAAA");
            // event.source.edgesColor = new BABYLON.Color4(1, 1, 1, 1);
            // event.source.material.wireframe = true;
            if (PreviousMeshSelected) PreviousMeshSelected.PanelAlt.isVisible = false;
            if (PreviousMeshHover != null) HoverHighlight.removeMesh(PreviousMeshHover);
            PreviousMeshHover = null;
            if (PreviousMeshSelected != null) SelectionHighlight.removeMesh(PreviousMeshSelected);
            PreviousMeshSelected = event.source;
            if (PreviousMeshSelected == null) return;
            SelectionHighlight.addMesh(PreviousMeshSelected, BABYLON.Color3.White());
            PreviousMeshSelected.PanelAlt.isVisible = true;
          }
        )
      );

      // BABYLON.MeshDebugPluginMaterial.PrepareMeshForTrianglesAndVerticesMode(Polygon);

      // new BABYLON.MeshDebugPluginMaterial(Polygon.material, {
      //     mode: BABYLON.MeshDebugMode.TRIANGLES_VERTICES, // TRIANGLES
      //     wireframeVerticesColor: new BABYLON.Color3(0.8, 0.8, 0.8),
      //     wireframeThickness: 0.7,
      //     vertexColor: new BABYLON.Color3(0, 0, 0),
      //     vertexRadius: 1.2
      // });

      // const CompatibilityXR = BABYLON.WebXRSessionManager.IsSessionSupported('immersive-ar');

      let RoofUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
      RoofUI.idealWidth = 1920 / 2;
      RoofUI.idealHeight = 1080 / 2;

      // import { GoogleDataTesting } from "./BackendLogicTesting.ts";

      async function EEEEE() {
        // const response = await fetch(`/api/getroofbycoords?lat=${GetMapCenterLAT()}&lon=${GetMapCenterLON()}`, {
        //   method: "GET",
        //   headers: {
        //     "Authorization": "TOKEN",
        //     "Accept": "application/json"
        //   }
        // });
        // console.log("FFFF");
        // // console.log('RESPONSE', response);
        // const RawJSON = await response.json();
        // if (response.status != 200) {
        //   console.error('findClosestBuilding\n'); // , RawJSON);
        //   throw RawJSON;
        // }
        // console.log('buildingInsightsResponse'); // , RawJSON);
        // GoogleDataTesting(RawJSON);
        // console.log("File content:", fileContent);
        // Process the file content here
        // let RawJSON = content; //JSON.parse(content);
        // ExecuteGoogle(RawJSON);
        // let Data = Convert_EagleView(RawJSON);
        // let Data = Convert_Google(RawJSON);
        // console.log(Data);
      }

      // let LAT = (37.4449703 + Math.random()); // .toFixed(5);
      // let LON = (-122.1391467 + Math.random()); // .toFixed(5);

      let LAT = 37.44288953971293, LON = -122.13907401452673; // COMPLICATED HOUSE //
      // let LAT = 38.1265454, LON = -121.300558; // HOUSE //
      // let LAT = 37.4440563, LON = -122.1393081; // GIANT BUILDING //
      // let LAT = 37.44318785801852, LON = -122.13798024271368; // SIMPLER HOUSE //

      // ouiy4it_VhI1BPMzwEmNU0ub5LQ= \\ SECRET
      // document.getElementById('randomHouse').addEventListener('click', async function (event) {
      //   SetMapCenter(LAT, LON);
      //   EEEEE();
      // });

      // document.getElementById('coordsHouse').addEventListener('click', async function (event) {
      //   let LAT_INPUT = document.getElementById('latHouse').value; if ((+LAT_INPUT) == null || LAT_INPUT == "") return;
      //   let LON_INPUT = document.getElementById('lonHouse').value; if ((+LON_INPUT) == null || LON_INPUT == "") return;
      //   SetMapCenter(+LAT_INPUT, +LON_INPUT);
      //   EEEEE();
      // });

      // Register a render loop to repeatedly render the Scene
      // Engine.runRenderLoop(function () {
      //   Scene.render();
      // });

      // // Watch for browser/RoofingEditor resize events
      // window.addEventListener("resize", () => Engine.resize());











      let ActiveEditor = new Editor(Engine, Scene, Camera, RoofUI, window);















      const makePanel = (name: string, side: "left" | "right") => {
        const boxSettings = {
          width: wTop,
          height: thickness,
          depth: slopedLen,
          updatable: true,
        };
        const box = BABYLON.MeshBuilder.CreateBox(name, boxSettings, Scene);
        boxSettings.instance = box;
        box.material = panelMat;
        meshesRef.current.push([box, boxSettings, name]);

        const sign = side === "left" ? -1 : +1;
        box.rotation.x = sign * slopeAngle;

        const zEdge = (slopedLen / 2) * Math.cos(slopeAngle);
        const yEdge = (slopedLen / 2) * Math.sin(slopeAngle);
        box.position.z = sign * zEdge;
        box.position.y = rise - yEdge;
        box.parent = root;
        return box;
      };

      makePanel("panelL", "left");
      makePanel("panelR", "right");

      // ridge cap
      const ridge = BABYLON.MeshBuilder.CreateBox("ridge", {
        width: wTop * 1.01,
        height: Math.max(0.06, thickness * 1.2),
        depth: 0.20,
      }, Scene);
      const ridgeMat = new BABYLON.PBRMetallicRoughnessMaterial("ridgeMat", Scene);
      ridgeMat.baseColor = BABYLON.Color3.FromHexString("#374151");
      ridgeMat.metallic = 1; ridgeMat.roughness = 0.3;
      ridge.material = ridgeMat;
      ridge.position.set(0, rise + ridge.getBoundingInfo().boundingBox.extendSize.y, 0);
      ridge.parent = root;

      // spin
      let rotationEnabled = isRotating;
      Scene.onBeforeRenderObservable.add(() => {
        if (rotationEnabled) {
          root.rotation.y += Engine.getDeltaTime() * 0.0006;
        }
      });

      (window as any)._toggleRotation = (enabled: boolean) => {
        rotationEnabled = enabled;
      };

      [panelMat, ridgeMat].forEach(m => m.freeze?.());
      Scene.blockMaterialDirtyMechanism = true;

      Engine.runRenderLoop(() => Scene.render());
      Engine.resize();

      return () => {
        try { Engine.stopRenderLoop(); } catch { }
        try { Scene.dispose(); } catch { }
        try { Engine.dispose(); } catch { }
      };
    })();

    return () => { disposed = true; };
  }, [dims, overhang, thickness, seamSpacing, spin]); // , selectedColor]);

  // Update material color when selectedColor changes
  useEffect(() => {
    if (panelMaterialRef.current) {
      panelMaterialRef.current.baseColor = BABYLON.Color3.FromHexString(selectedColor);
      for (let Data of meshesRef.current) {
        Data[0].material = panelMaterialRef.current; // .baseColor = BABYLON.Color3.FromHexString(selectedColor);
        Data[0] = BABYLON.MeshBuilder.CreateBox(Data[2], Data[1]);
        // Data[0].material
      }
    }
  }, [selectedColor]);

  // Update rotation when isRotating changes
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any)._toggleRotation) {
      (window as any)._toggleRotation(isRotating);
    }
  }, [isRotating]);

  // Update camera view when currentView changes
  useEffect(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;

    const { run, rise } = dims;
    const target = new BABYLON.Vector3(0, rise * 0.6, 0);
    const radius = Math.max(width, run * 2) * 1.2;

    switch (currentView) {
      case "top":
        cam.setPosition(new BABYLON.Vector3(0, rise + radius, 0));
        cam.setTarget(target);
        break;
      case "front":
        cam.setPosition(new BABYLON.Vector3(0, rise * 0.6, -radius));
        cam.setTarget(target);
        break;
      case "side":
        cam.setPosition(new BABYLON.Vector3(radius, rise * 0.6, 0));
        cam.setTarget(target);
        break;
      case "perspective":
      default:
        cam.alpha = BABYLON.Tools.ToRadians(35);
        cam.beta = BABYLON.Tools.ToRadians(60);
        cam.radius = radius;
        cam.setTarget(target);
        break;
    }
  }, [currentView, dims, width]);

  return (
    <div className={`flex flex-col lg:flex-row gap-6 ${className}`}>
      {/* 3D Viewport - Takes more space */}
      <div className="flex-1">
        <div className={`bg-white dark:bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col ${hideControls ? 'border-0 rounded-xl' : ''}`} style={{ height: hideControls ? '100%' : '700px' }}>
          {/* Header - Hidden when hideControls is true */}
          {!hideControls && (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg font-black">3D</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Metal Roof Configurator</h3>
                  <p className="text-xs text-white/80">Interactive visualization</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${showColorPicker
                    ? "bg-white text-blue-600"
                    : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                >
                  Colors
                </button>
                <button
                  type="button"
                  onClick={() => setIsRotating(!isRotating)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${isRotating
                    ? "bg-white text-blue-600"
                    : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                >
                  {isRotating ? "Stop" : "Rotate"}
                </button>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div ref={wrapRef} className="relative bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-gray-900 dark:via-gray-950 dark:to-black" style={{ height: hideControls ? '100%' : '400px' }}>
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* View Selector - Hidden when hideControls is true */}
            {!hideControls && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                {[
                  { id: "perspective", label: "3D" },
                  { id: "top", label: "Top" },
                  { id: "front", label: "Front" },
                  { id: "side", label: "Side" },
                ].map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setCurrentView(view.id as any)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${currentView === view.id
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-white/95 dark:bg-gray-900/95 text-muted-foreground hover:bg-blue-100"
                      }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel Profile Selector - Hidden when hideControls is true */}
          {!hideControls && (
            <div className="p-4 border-t border-border flex-shrink-0">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Panel Profile</p>
              <div className="grid grid-cols-4 gap-2">
                {panelProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setPanelProfile(profile.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${panelProfile === profile.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-border hover:border-blue-300"
                      }`}
                  >
                    <div className="text-2xl font-bold mb-1 text-blue-500">{profile.icon}</div>
                    <div className="text-xs font-semibold text-foreground">{profile.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Color Picker Sidebar - Hidden when hideControls is true */}
      {!hideControls && showColorPicker && (
        <div className="lg:w-80">
          <div className="bg-white dark:bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '700px' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Colors</h3>
                    <p className="text-xs text-white/80">MMR</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowColorPicker(false)}
                  className="text-white hover:bg-white/10 rounded-lg p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
              {/* Series Tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                {(["select", "reserve", "benchmark"] as const).map((series) => (
                  <button
                    key={series}
                    type="button"
                    onClick={() => setSelectedSeries(series)}
                    className={`flex-1 px-2 py-2 text-xs font-bold rounded-lg transition-all ${selectedSeries === series
                      ? "bg-white dark:bg-card shadow-md text-orange-600"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {series.charAt(0).toUpperCase() + series.slice(1)}
                  </button>
                ))}
              </div>

              {/* Color Grid */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Available Colors</p>
                <div className="grid grid-cols-4 gap-2">
                  {roofColors[selectedSeries].map((colorOption) => (
                    <button
                      key={colorOption.hex}
                      type="button"
                      onClick={() => setSelectedColor(colorOption.hex)}
                      className={`aspect-square rounded-lg transition-all relative group ${selectedColor === colorOption.hex
                        ? "ring-3 ring-orange-500 ring-offset-2 shadow-lg scale-105"
                        : "hover:shadow-md hover:scale-105 border-2 border-border"
                        }`}
                      style={{ backgroundColor: colorOption.hex }}
                      title={colorOption.name}
                    >
                      {selectedColor === colorOption.hex && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        {colorOption.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Color Display */}
              {selectedColor && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Current Selection</p>
                  <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-border shadow-sm flex-shrink-0"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {[...roofColors.select, ...roofColors.reserve, ...roofColors.benchmark]
                          .find(c => c.hex === selectedColor)?.name || 'Custom'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[...roofColors.select, ...roofColors.reserve, ...roofColors.benchmark]
                          .find(c => c.hex === selectedColor)?.coating || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
