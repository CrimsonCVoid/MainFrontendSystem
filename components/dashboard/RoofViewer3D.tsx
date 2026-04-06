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
import { SketchLine } from "@/lib/drawings";
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
  /** real roof data from algorithm — overrides width/depth/pitch when present */
  roofData?: any;
  /** project ID for fetching reconstruction data from server */
  projectId?: string;
  /** callback when canvas is ready for screenshot capture */
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

export default function RoofViewer3D({
  className = "",
  width: widthProp = 12,
  depth: depthProp = 8,
  pitch: pitchProp = 0.5,
  overhang = 0.20,
  thickness = 0.035,
  seamSpacing = 0.4572,
  spin = true,
  color = "#4B5563",
  hideControls = false,
  roofData,
  projectId,
  onCanvasReady,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<any>(null);
  // const panelMaterialRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const meshesRef = useRef<any>(null);
  const [selectedColor, setSelectedColor] = useState(color);
  const [selectedSeries, setSelectedSeries] = useState<"select" | "reserve" | "benchmark">("select");
  const [isRotating, setIsRotating] = useState(spin);
  const [currentView, setCurrentView] = useState<"perspective" | "top" | "front" | "side">("perspective");
  const [panelProfile, setPanelProfile] = useState<PanelProfile>("standing-seam");
  const [showColorPicker, setShowColorPicker] = useState(true);
  const [standingSeamWidth, setStandingSeamWidth] = useState(16); // Default 16 inches

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

  // Derive effective dimensions from roofData when available, fall back to props
  const { width, depth, pitch } = useMemo(() => {
    if (roofData?.total_area_sf && roofData.total_area_sf > 0) {
      // Convert total area from sq ft to sq meters for 3D scene
      const areaM2 = roofData.total_area_sf / 10.7639;
      // Approximate roof footprint as rectangle (width:depth ≈ 1.4:1)
      const effectiveWidth = Math.sqrt(areaM2 * 1.4);
      const effectiveDepth = areaM2 / effectiveWidth;
      // Use average slope from planes, convert degrees to rise/run
      const avgSlope = roofData.planes?.length
        ? roofData.planes.reduce((sum: number, p: any) => sum + (p.slope || 0), 0) / roofData.planes.length
        : 0;
      const effectivePitch = avgSlope > 0
        ? Math.tan((avgSlope * Math.PI) / 180)
        : pitchProp;
      return { width: effectiveWidth, depth: effectiveDepth, pitch: effectivePitch };
    }
    return { width: widthProp, depth: depthProp, pitch: pitchProp };
  }, [roofData, widthProp, depthProp, pitchProp]);

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
      console.log("AND THEN THERE WAS LIGHT");
      meshesRef.current = [];
      const Engine = new BABYLON.Engine(canvasRef.current, true, {
        antialias: true,
        powerPreference: "high-performance",
        stencil: true, preserveDrawingBuffer: true, // alpha: true
      });
      Engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
      engineRef.current = Engine;

      for (let i in SketchLine.AllDrawings) {
        SketchLine.AllDrawings[i].Delete();
        delete SketchLine.AllDrawings[i];
        // SketchLine.AllDrawings[i] = undefined;
      }
      SketchLine.AllDrawings = [];

      Editor.canvasRef = canvasRef;

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
      Camera.upperRadiusLimit = 50 * InchesInMeter; // ~1967 units, prevent infinite zoom-out
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
      new BABYLON.HemisphericLight("h", new BABYLON.Vector3(0, 1, 0), Scene).intensity = 0.8;
      const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.6, 1, -0.3), Scene);
      sun.position = new BABYLON.Vector3(15, 2000, 12);
      sun.intensity = 1.1;

      // Root transform node for rotation control
      const root = new BABYLON.TransformNode("root", Scene);

      // Metal roof panel material (PBR with metallic properties)
      const panelMat = new BABYLON.PBRMetallicRoughnessMaterial("panelMat", Scene);
      panelMat.baseColor = BABYLON.Color3.FromHexString(selectedColor);
      panelMat.metallic = 0.5;
      panelMat.roughness = 0.25;
      panelMat.backFaceCulling = false;

      // Build roof plane meshes from roofData when available
      if (roofData?.planes?.length) {
        // Convert [x, y, z] vertices (meters relative to building center) to inches
        const M_TO_IN = 39.3701;

        // Find centroid across all planes to center the model
        let cx = 0, cy = 0, cz = 0, totalVerts = 0;
        for (const plane of roofData.planes) {
          if (!plane.vertices?.length) continue;
          for (const v of plane.vertices) {
            cx += v[0]; cy += v[1]; cz += v[2];
            totalVerts++;
          }
        }
        if (totalVerts > 0) { cx /= totalVerts; cy /= totalVerts; cz /= totalVerts; }

        roofData.planes.forEach((plane: any, i: number) => {
          if (!plane.vertices?.length || plane.vertices.length < 3) return;

          // Create vertex positions array (Babylon uses x-right, y-up, z-forward)
          const positions: number[] = [];
          for (const v of plane.vertices) {
            positions.push(
              (v[0] - cx) * M_TO_IN,  // x
              (v[1] - cy) * M_TO_IN,  // y (height)
              (v[2] - cz) * M_TO_IN   // z
            );
          }

          // Build triangle indices (fan triangulation for convex polygons)
          const indices: number[] = [];
          const vertCount = plane.vertices.length;
          for (let t = 1; t < vertCount - 1; t++) {
            indices.push(0, t, t + 1);
          }

          // Compute normals
          const normals: number[] = [];
          BABYLON.VertexData.ComputeNormals(positions, indices, normals);

          // Create custom mesh
          const mesh = new BABYLON.Mesh(`roof-plane-${i}`, Scene);
          const vertexData = new BABYLON.VertexData();
          vertexData.positions = positions;
          vertexData.indices = indices;
          vertexData.normals = normals;
          vertexData.applyToMesh(mesh);

          mesh.material = panelMat;
          mesh.parent = root;
        });

        // Adjust camera to frame the roof
        const bounds = root.getHierarchyBoundingVectors(true);
        const center = bounds.min.add(bounds.max).scale(0.5);
        const extent = bounds.max.subtract(bounds.min);
        const maxDim = Math.max(extent.x, extent.y, extent.z);
        Camera.setTarget(center);
        Camera.radius = maxDim * 1.5;
      }









      // var UpperMostLayer = new BABYLON.UtilityLayerRenderer(Scene);


      // CreateGoogleDebugMesh();

      // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
      let light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), Scene);
      light.intensity = 0; // .2; // 0.7;

      // let HoverHighlight = new BABYLON.HighlightLayer("highlight", Scene);
      // let SelectionHighlight = new BABYLON.HighlightLayer("highlight", Scene);
      // SelectionHighlight.color3 = 

      // let GUI3D = new BABYLON.GUI.GUI3DManager(Scene);
      // let actionManager = new BABYLON.ActionManager(Scene);
      // let PreviousMeshHover;
      // let PreviousMeshSelected;

      // // Action for when the pointer enters the mesh (hover start)
      // actionManager.registerAction(
      //   new BABYLON.ExecuteCodeAction(
      //     BABYLON.ActionManager.OnPointerOverTrigger,
      //     function (event) {
      //       if (event.source && event.source.ShowOnHover)
      //         for (let SHOW of event.source.ShowOnHover)
      //           SHOW.isVisible = true;
      //       if (PreviousMeshHover != null) HoverHighlight.removeMesh(PreviousMeshHover);
      //       if (event.source == PreviousMeshSelected && PreviousMeshSelected != null) return;
      //       PreviousMeshHover = event.source;
      //       if (PreviousMeshHover != null) HoverHighlight.addMesh(PreviousMeshHover, BABYLON.Color3.Blue());
      //     }
      //   )
      // );

      // // Action for when the pointer exits the mesh (hover end)
      // actionManager.registerAction(
      //   new BABYLON.ExecuteCodeAction(
      //     BABYLON.ActionManager.OnPointerOutTrigger,
      //     function (event) {
      //       if (event.source && event.source.ShowOnHover)
      //         for (let SHOW of event.source.ShowOnHover)
      //           SHOW.isVisible = false;
      //       if (PreviousMeshHover == null) return;
      //       HoverHighlight.removeMesh(PreviousMeshHover);
      //       PreviousMeshHover = null;
      //     }
      //   )
      // );

      // actionManager.registerAction(
      //   new BABYLON.ExecuteCodeAction(
      //     BABYLON.ActionManager.OnPickTrigger,
      //     function (event) {
      //       // Restore original material color
      //       console.log("AAAAAAAAA");
      //       // event.source.edgesColor = new BABYLON.Color4(1, 1, 1, 1);
      //       // event.source.material.wireframe = true;
      //       if (PreviousMeshSelected) PreviousMeshSelected.PanelAlt.isVisible = false;
      //       if (PreviousMeshHover != null) HoverHighlight.removeMesh(PreviousMeshHover);
      //       PreviousMeshHover = null;
      //       if (PreviousMeshSelected != null) SelectionHighlight.removeMesh(PreviousMeshSelected);
      //       PreviousMeshSelected = event.source;
      //       if (PreviousMeshSelected == null) return;
      //       SelectionHighlight.addMesh(PreviousMeshSelected, BABYLON.Color3.White());
      //       PreviousMeshSelected.PanelAlt.isVisible = true;
      //     }
      //   )
      // );

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

      window.addEventListener("resize", () => Engine.resize());










      Editor.window = window;
      console.log("EDITOR WINDOW", window);
      let ActiveEditor = Editor.ActiveEditor = new Editor(Engine, Scene, Camera, RoofUI, window);

      // Editor.RoofPBR_Material?.dispose();
      // Editor.RoofPBR_Material?.resetDrawCache?.();
      // let RoofPBR_Material = Editor.RoofPBR_Material = new BABYLON.PBRMetallicRoughnessMaterial("PanelMaterial", Scene);

      Editor.RoofColor = BABYLON.Color3.FromHexString(selectedColor);

      // Reconstruct roof from server-side JSON_Output if available
      if (roofData?._sketch_json?.length) {
        console.log(`[RoofViewer3D] Reconstructing from ${roofData._sketch_json.length} sketch entries...`);
        try {
          ActiveEditor.reconstructFromJSON(roofData._sketch_json);
          ActiveEditor.focusOnRoof(roofData._sketch_json);
        } catch (err) {
          console.error("[RoofViewer3D] Sketch reconstruction failed:", err);
        }
      } else if (projectId) {
        // Auto-load from Supabase via API — works whether roofData exists or not
        console.log("[RoofViewer3D] Loading reconstruction from server...");
        fetch(`/api/roof-reconstruct`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        })
          .then((res) => res.ok ? res.json() : Promise.reject(res.statusText))
          .then((data) => {
            if (data.sketch_json?.length && Editor.ActiveEditor) {
              console.log(`[RoofViewer3D] Server returned ${data.sketch_json.length} sketch entries`);
              Editor.ActiveEditor.reconstructFromJSON(data.sketch_json);
              Editor.ActiveEditor.focusOnRoof(data.sketch_json);
            }
          })
          .catch((err) => console.warn("[RoofViewer3D] Reconstruction request failed:", err));
      }
      // RoofPBR_Material.backFaceCulling = false;
      // RoofPBR_Material.useLogarithmicDepth = true; // Disappears?

      // RoofPBR_Material.needDepthPrePass = true;
      // Editor.MapDebugging.CreateGoogleDebugMesh();
      // Editor.meshesRef = meshesRef;















      // const makePanel = (name: string, side: "left" | "right") => {
      //   const boxSettings = {
      //     width: wTop,
      //     height: thickness,
      //     depth: slopedLen,
      //     updatable: true,
      //   };
      //   const box = BABYLON.MeshBuilder.CreateBox(name, boxSettings, Scene);
      //   boxSettings.instance = box;
      //   box.material = panelMat;
      //   Editor.meshesRef = meshesRef;
      //   meshesRef.current.push([box, boxSettings, name]);

      //   const sign = side === "left" ? -1 : +1;
      //   box.rotation.x = sign * slopeAngle;

      //   const zEdge = (slopedLen / 2) * Math.cos(slopeAngle);
      //   const yEdge = (slopedLen / 2) * Math.sin(slopeAngle);
      //   box.position.z = sign * zEdge;
      //   box.position.y = rise - yEdge;
      //   box.parent = root;
      //   return box;
      // };

      // makePanel("panelL", "left");
      // makePanel("panelR", "right");

      // ridge cap
      // const ridge = BABYLON.MeshBuilder.CreateBox("ridge", {
      //   width: wTop * 1.01,
      //   height: Math.max(0.06, thickness * 1.2),
      //   depth: 0.20,
      // }, Scene);
      // const ridgeMat = new BABYLON.PBRMetallicRoughnessMaterial("ridgeMat", Scene);
      // ridgeMat.baseColor = BABYLON.Color3.FromHexString("#374151");
      // ridgeMat.metallic = 1; ridgeMat.roughness = 0.3;
      // ridge.material = ridgeMat;
      // ridge.position.set(0, rise + ridge.getBoundingInfo().boundingBox.extendSize.y, 0);
      // ridge.parent = root;

      // spin
      let rotationEnabled = isRotating;
      Scene.onBeforeRenderObservable.add(() => {
        if (rotationEnabled) { // && Editor.ActiveEditor?.Root) {
          Editor.ActiveEditor.Camera.alpha += Engine.getDeltaTime() * 0.0006;
        }
      });

      (window as any)._toggleRotation = (enabled: boolean) => {
        rotationEnabled = enabled;
      };

      // [panelMat, ridgeMat].forEach(m => m.freeze?.());
      Scene.blockMaterialDirtyMechanism = true;

      Engine.runRenderLoop(() => Scene.render());
      Engine.resize();

      // Notify parent that canvas is ready for screenshot capture
      if (onCanvasReady && canvasRef.current) {
        onCanvasReady(canvasRef.current);
      }

      return () => {
        try { Engine.stopRenderLoop(); } catch { }
        try { Scene.dispose(); } catch { }
        try { Engine.dispose(); } catch { }
      };
    })();

    return () => { disposed = true; };
  }, [dims, overhang, thickness, seamSpacing, spin, roofData]); // , selectedColor]);

  // Standing seam width change — currently visual only (future: update mesh geometry)
  useEffect(() => {
    // Panel profile changes will trigger scene rebuild via roofData dependency
    Editor.SelectedProfile = panelProfile;
    Editor.SelectedPanelWidth = standingSeamWidth;
    Editor.RoofColor = BABYLON.Color3.FromHexString(selectedColor);
    for (let Sketch of SketchLine.AllDrawings) Sketch.DrawLine.UpdatePanelMesh();
  }, [standingSeamWidth, panelProfile, selectedColor]);

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
    const target = new BABYLON.Vector3(0, 0, 0);
    const radius = 600; // Math.max(width, run * 2) * 1.2;

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

  // Get current color info
  const currentColorInfo = [...roofColors.select, ...roofColors.reserve, ...roofColors.benchmark]
    .find(c => c.hex === selectedColor);

  // Minimal mode (hideControls)
  if (hideControls) {
    return (
      <div className={`relative ${className}`} style={{ height: '100%', minHeight: '400px' }}>
        <div ref={wrapRef} className="absolute inset-0">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-[#1a1d23] overflow-hidden ${className}`} style={{ height: '100%', minHeight: '600px' }}>
      {/* Full-bleed 3D Canvas */}
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Floating Top Bar - Logo Only */}
      <div className="absolute top-0 left-0 z-10 p-4">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl rounded-xl px-4 py-2.5 border border-white/10">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Roof Configurator</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">3D Preview</p>
          </div>
        </div>
      </div>

      {/* Bottom Left - Panel Profile Selector + View Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex items-end gap-3">
        <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">Panel Profile</h3>
            {panelProfile === "standing-seam" && (
              <span className="text-xs font-bold text-cyan-400">{standingSeamWidth}" width</span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {panelProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  setPanelProfile(profile.id);
                }}
                className={`group relative p-3 rounded-xl transition-all ${panelProfile === profile.id
                  ? "bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-2 border-cyan-400"
                  : "bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10"
                  }`}
              >
                <div className="flex justify-center mb-2">
                  {profile.id === "standing-seam" && (
                    <div className="flex gap-0.5">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`w-1.5 h-6 rounded-t ${panelProfile === profile.id ? "bg-cyan-400" : "bg-white/40"}`} />
                      ))}
                    </div>
                  )}
                  {profile.id === "r-panel" && (
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className={`w-3 h-5 rounded-t-full ${panelProfile === profile.id ? "bg-cyan-400" : "bg-white/40"}`} />
                      ))}
                    </div>
                  )}
                  {profile.id === "5v-crimp" && (
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-2 h-5 ${panelProfile === profile.id ? "bg-cyan-400" : "bg-white/40"}`}
                          style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
                      ))}
                    </div>
                  )}
                  {profile.id === "pbr-panel" && (
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className={`w-3 h-5 rounded-b-lg ${panelProfile === profile.id ? "bg-cyan-400" : "bg-white/40"}`} />
                      ))}
                    </div>
                  )}
                </div>
                <p className={`text-[10px] font-semibold text-center ${panelProfile === profile.id ? "text-white" : "text-white/60"}`}>
                  {profile.name.split(" ")[0]}
                </p>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                  {profile.description}
                </div>
              </button>
            ))}
          </div>

          {panelProfile === "standing-seam" && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium text-white/50 uppercase w-8">10"</span>
                <input
                  type="range"
                  min={10}
                  max={30}
                  step={0.5}
                  value={standingSeamWidth}
                  onChange={(e) => setStandingSeamWidth(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-cyan-400/50 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-[10px] font-medium text-white/50 uppercase w-8 text-right">30"</span>
              </div>
              <div className="flex justify-center gap-1 mt-2">
                {[12, 14, 16, 16.5, 18, 20, 24].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setStandingSeamWidth(w)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${standingSeamWidth === w
                      ? "bg-cyan-500 text-white"
                      : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/70"
                      }`}
                  >
                    {w}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View Controls - Next to Panel Profile */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center bg-black/50 backdrop-blur-xl rounded-xl p-1 border border-white/10">
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
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${currentView === view.id
                  ? "bg-white text-gray-900"
                  : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* Rotation Toggle */}
          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all border ${isRotating
              ? "bg-cyan-500 text-white border-cyan-400"
              : "bg-black/50 backdrop-blur-xl text-white/70 hover:text-white border-white/10"
              }`}
            title={isRotating ? "Stop rotation" : "Auto-rotate"}
          >
            <svg className={`w-4 h-4 ${isRotating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs font-semibold">{isRotating ? "Stop" : "Rotate"}</span>
          </button>
        </div>
      </div>

      {/* Floating Help Text - Top Center */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-black/30 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
          <p className="text-[10px] text-white/50 uppercase tracking-wider">
            <span className="text-white/70">Drag</span> rotate • <span className="text-white/70">Scroll</span> zoom • <span className="text-white/70">Right-click</span> pan
          </p>
        </div>
      </div>

      {/* Roof Data Stats Overlay */}
      {roofData?.total_area_sf && (
        <div className="absolute top-4 right-4 z-10" style={{ right: showColorPicker ? 'calc(30% + 16px)' : '16px' }}>
          <div className="bg-black/50 backdrop-blur-xl rounded-xl p-4 border border-white/10 min-w-[200px]">
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Roof Data</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Total Area</span>
                <span className="text-sm font-bold text-cyan-400">
                  {roofData.total_area_sf.toLocaleString(undefined, { maximumFractionDigits: 0 })} sf
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Planes</span>
                <span className="text-sm font-bold text-white">{roofData.planes?.length || 0}</span>
              </div>
              {roofData.planes?.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Avg Pitch</span>
                  <span className="text-sm font-bold text-white">
                    {(roofData.planes.reduce((s: number, p: any) => s + (p.slope || 0), 0) / roofData.planes.length).toFixed(1)}°
                  </span>
                </div>
              )}
              {roofData.measurements?.ridge_length_ft > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Ridge</span>
                  <span className="text-sm font-bold text-white">{roofData.measurements.ridge_length_ft.toFixed(0)} ft</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Right Side Panel - Color Selector (30% width, collapsible) */}
      <div
        className={`absolute top-0 right-0 h-full z-20 transition-all duration-300 ease-in-out ${showColorPicker ? 'w-[30%] min-w-[320px]' : 'w-0'
          }`}
      >
        {showColorPicker && (
          <div className="h-full bg-black/70 backdrop-blur-xl border-l border-white/10 flex flex-col">
            {/* Panel Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl shadow-lg border-2 border-white/20"
                  style={{ backgroundColor: selectedColor }}
                />
                <div>
                  <h2 className="text-sm font-bold text-white">Color Selection</h2>
                  <p className="text-xs text-white/50">{currentColorInfo?.name || 'Custom'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowColorPicker(false)}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Series Tabs */}
            <div className="p-4 border-b border-white/10">
              <div className="flex gap-1 p-1 bg-white/10 rounded-xl">
                {(["select", "reserve", "benchmark"] as const).map((series) => (
                  <button
                    key={series}
                    type="button"
                    onClick={() => setSelectedSeries(series)}
                    className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${selectedSeries === series
                      ? "bg-white text-gray-900 shadow-lg"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                  >
                    {series}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-4 gap-3">
                {roofColors[selectedSeries].map((colorOption) => (
                  <button
                    key={colorOption.hex}
                    type="button"
                    onClick={() => setSelectedColor(colorOption.hex)}
                    className={`group relative aspect-square rounded-xl transition-all hover:scale-105 ${selectedColor === colorOption.hex
                      ? "ring-3 ring-cyan-400 ring-offset-2 ring-offset-black/70 scale-105"
                      : "hover:ring-2 hover:ring-white/30"
                      }`}
                    style={{ backgroundColor: colorOption.hex }}
                  >
                    {selectedColor === colorOption.hex && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {/* Color name tooltip */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                      {colorOption.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Color Details */}
            {currentColorInfo && (
              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-xl shadow-xl border-2 border-white/20"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{currentColorInfo.name}</h3>
                    <p className="text-xs text-white/50 uppercase tracking-wider mt-1">{currentColorInfo.coating}</p>
                    <p className="text-xs text-cyan-400 mt-1">{currentColorInfo.hex}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Color Panel Toggle Button (when collapsed) - Top Right */}
      {!showColorPicker && (
        <button
          type="button"
          onClick={() => setShowColorPicker(true)}
          className="absolute top-4 right-4 z-20 flex items-center gap-3 px-4 py-3 bg-black/50 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-black/70 transition-all group"
        >
          <div
            className="w-8 h-8 rounded-lg shadow-lg border-2 border-white/20"
            style={{ backgroundColor: selectedColor }}
          />
          <div className="text-left">
            <p className="text-xs font-bold text-white">Colors</p>
            <p className="text-[10px] text-white/50">{currentColorInfo?.name || 'Custom'}</p>
          </div>
          <svg className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
