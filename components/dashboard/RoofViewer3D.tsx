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
  onCanvasReady,
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
      if (!canvasRef.current || disposed) return;

      try { engineRef.current?.dispose?.(); } catch { }
      meshesRef.current = [];
      const Engine = new BABYLON.Engine(canvasRef.current, true, {
        antialias: true,
        powerPreference: "high-performance",
        stencil: true, preserveDrawingBuffer: true, alpha: true
      });
      Engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
      engineRef.current = Engine;

      const Scene = new BABYLON.Scene(Engine);
      Scene.clearColor = new BABYLON.Color4(0.92, 0.93, 0.95, 1); // Light gray sky
      // Environment texture optional for StandardMaterial

      const { run, rise, slopeAngle, slopedLen, wTop } = dims;

      // Camera — start at a generous radius; will be auto-fitted after mesh creation
      const Camera = new BABYLON.ArcRotateCamera(
        "Camera",
        BABYLON.Tools.ToRadians(45),
        BABYLON.Tools.ToRadians(55),
        1500,
        BABYLON.Vector3.Zero(),
        Scene
      );
      Camera.attachControl(canvasRef.current, true);
      Camera.minZ = 1;
      Camera.maxZ = 100000;
      Camera.lowerRadiusLimit = 50;
      Camera.upperRadiusLimit = 10000;
      Camera.wheelDeltaPercentage = 0.01;
      Camera.panningSensibility = 5;
      cameraRef.current = Camera;

      // Lighting — bright enough for metallic PBR materials
      const hemiLight = new BABYLON.HemisphericLight("h", new BABYLON.Vector3(0, 1, 0), Scene);
      hemiLight.intensity = 1.2;
      hemiLight.groundColor = BABYLON.Color3.FromHexString("#6080a0");

      const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.5, -1, -0.3), Scene);
      sun.position = new BABYLON.Vector3(500, 1000, 500);
      sun.intensity = 1.5;
      sun.diffuse = BABYLON.Color3.FromHexString("#fffaf0");

      // Root transform for rotation
      const root = new BABYLON.TransformNode("root", Scene);

      // Roof panel material — StandardMaterial for reliable visibility
      const panelMat = new BABYLON.StandardMaterial("panelMat", Scene);
      panelMat.diffuseColor = BABYLON.Color3.FromHexString(selectedColor);
      panelMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
      panelMat.backFaceCulling = false;
      panelMaterialRef.current = panelMat;

      // Check for renderable roof data — prefer _google_raw for proper azimuth rotation
      const googleRaw = roofData?._google_raw;
      const segments = googleRaw?.roofSegmentStats || googleRaw?.solarPotential?.roofSegmentStats;
      const googleCenter = googleRaw?.center;
      const hasRoofData = (segments?.length > 0 && !!googleCenter) || (roofData?.planes?.length > 0 && roofData.planes.some((p: any) => p.vertices?.length >= 3));
      console.log("[RoofViewer3D] hasRoofData:", hasRoofData, "segments:", segments?.length ?? 0);














      if (hasRoofData) {
        const createdMeshes: BABYLON.Mesh[] = [];

        if (segments?.length > 0 && googleCenter) {
          // --- RENDER WITH AZIMUTH ROTATION FROM _google_raw ---
          const LAT_SCALE = 111320;
          const LNG_SCALE = 111320 * Math.cos(googleCenter.latitude * Math.PI / 180);
          const toLocal = (lat: number, lon: number) => ({
            x: (lon - googleCenter.longitude) * LNG_SCALE,
            z: (lat - googleCenter.latitude) * LAT_SCALE,
          });

          let minH = Infinity;
          for (const seg of segments) if (seg.planeHeightAtCenterMeters != null) minH = Math.min(minH, seg.planeHeightAtCenterMeters);
          if (!isFinite(minH)) minH = 0;

          for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const gArea = seg.stats?.groundAreaMeters2;
            if (!gArea || gArea < 1) continue;

            const pitchRad = (seg.pitchDegrees || 0) * Math.PI / 180;
            const azRad = (seg.azimuthDegrees || 0) * Math.PI / 180;
            const hM = (seg.planeHeightAtCenterMeters || 0) - minH;
            const c = toLocal(seg.center.latitude, seg.center.longitude);

            // Compute ridge width and ground depth from bounding box aspect ratio + area
            let rW: number, gD: number;
            if (seg.boundingBox?.ne && seg.boundingBox?.sw) {
              const ne = toLocal(seg.boundingBox.ne.latitude, seg.boundingBox.ne.longitude);
              const sw = toLocal(seg.boundingBox.sw.latitude, seg.boundingBox.sw.longitude);
              const bbW = Math.max(Math.abs(ne.x - sw.x), 0.5);
              const bbH = Math.max(Math.abs(ne.z - sw.z), 0.5);
              // Use bbox aspect ratio but compute actual dimensions from ground area
              const aspect = bbW / bbH;
              // For the roof plane rotated by azimuth:
              // Ridge runs perpendicular to azimuth, depth runs along azimuth
              // Use the bbox dimension that aligns more with each direction
              const cosAz = Math.abs(Math.cos(azRad)), sinAz = Math.abs(Math.sin(azRad));
              // Ridge extent from bbox: mostly EW when az~0/180, mostly NS when az~90/270
              const ridgeFromBB = bbW * cosAz + bbH * sinAz;
              const depthFromBB = bbW * sinAz + bbH * cosAz;
              const bbAspect = Math.max(ridgeFromBB, 0.5) / Math.max(depthFromBB, 0.5);
              // Scale to match actual ground area
              gD = Math.sqrt(gArea / bbAspect);
              rW = gArea / gD;
            } else {
              rW = Math.sqrt(gArea * 1.4);
              gD = gArea / rW;
            }

            const rise = gD * Math.tan(pitchRad);
            // Google Solar: 0°=South, 90°=West, 180°=North, 270°=East (clockwise from south)
            const dx = -Math.sin(azRad), dz = -Math.cos(azRad); // downslope
            const rx = -Math.cos(azRad), rz = Math.sin(azRad);  // ridge direction
            const hw = rW / 2;

            console.log(
              `[Seg ${i}] az=${seg.azimuthDegrees?.toFixed(1)}° pitch=${seg.pitchDegrees?.toFixed(1)}°` +
              ` rW=${rW.toFixed(1)}m gD=${gD.toFixed(1)}m rise=${rise.toFixed(1)}m`
            );

            const positions = [
              c.x - dx * gD / 2 + rx * hw, hM + rise, c.z - dz * gD / 2 + rz * hw,
              c.x - dx * gD / 2 - rx * hw, hM + rise, c.z - dz * gD / 2 - rz * hw,
              c.x + dx * gD / 2 - rx * hw, hM,        c.z + dz * gD / 2 - rz * hw,
              c.x + dx * gD / 2 + rx * hw, hM,        c.z + dz * gD / 2 + rz * hw,
            ];
            const indices = [0,1,2, 0,2,3, 0,2,1, 0,3,2];
            const normals: number[] = [];
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);
            const mesh = new BABYLON.Mesh(`seg-${i}`, Scene);
            const vd = new BABYLON.VertexData();
            vd.positions = positions; vd.indices = indices; vd.normals = normals;
            vd.applyToMesh(mesh);
            mesh.material = panelMat; mesh.parent = root;
            createdMeshes.push(mesh);
            meshesRef.current.push([mesh, null, `seg-${i}`]);
          }
        } else if (roofData?.planes?.length > 0) {
          // Fallback: render from backend planes[].vertices
          for (let i = 0; i < roofData.planes.length; i++) {
            const plane = roofData.planes[i];
            if (!plane.vertices || plane.vertices.length < 3) continue;
            const positions: number[] = [];
            for (const v of plane.vertices) positions.push(v[0], v[1], v[2]);
            const indices: number[] = [];
            for (let t = 1; t < plane.vertices.length - 1; t++) { indices.push(0, t, t+1, 0, t+1, t); }
            const normals: number[] = [];
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);
            const mesh = new BABYLON.Mesh(`plane-${i}`, Scene);
            const vd = new BABYLON.VertexData();
            vd.positions = positions; vd.indices = indices; vd.normals = normals;
            vd.applyToMesh(mesh);
            mesh.material = panelMat; mesh.parent = root;
            createdMeshes.push(mesh);
            meshesRef.current.push([mesh, null, `plane-${i}`]);
          }
        }

        console.log(`[RoofViewer3D] Rendered ${createdMeshes.length} roof planes`);

        // Auto-center and fit camera to all geometry
        if (createdMeshes.length > 0) {
          let bMin = new BABYLON.Vector3(Infinity, Infinity, Infinity);
          let bMax = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
          for (const mesh of createdMeshes) {
            mesh.computeWorldMatrix(true);
            const bi = mesh.getBoundingInfo();
            bMin = BABYLON.Vector3.Minimize(bMin, bi.boundingBox.minimumWorld);
            bMax = BABYLON.Vector3.Maximize(bMax, bi.boundingBox.maximumWorld);
          }

          const cx = (bMin.x + bMax.x) / 2;
          const cy = (bMin.y + bMax.y) / 2;
          const cz = (bMin.z + bMax.z) / 2;
          root.position.set(-cx, -cy, -cz);

          const span = BABYLON.Vector3.Distance(bMin, bMax);

          Camera.setTarget(BABYLON.Vector3.Zero());
          Camera.radius = span * 0.9;
          Camera.lowerRadiusLimit = span * 0.2;
          Camera.upperRadiusLimit = span * 4;
          Camera.minZ = 0.01;
          Camera.maxZ = span * 10;

          // Ground plane
          const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: span * 2, height: span * 2 }, Scene);
          const groundMat = new BABYLON.StandardMaterial("groundMat", Scene);
          groundMat.diffuseColor = BABYLON.Color3.FromHexString("#3a4a3a");
          groundMat.specularColor = BABYLON.Color3.Black();
          ground.material = groundMat;
          ground.position.y = -(bMax.y - bMin.y) / 2 - 0.05;
          ground.parent = root;

          console.log(`[RoofViewer3D] Span: ${span.toFixed(1)}m, camera: ${(span * 0.9).toFixed(1)}`);
        }
      }

      // --- FALLBACK: Mock gable roof when no real data ---
      if (!hasRoofData) {
        const makePanel = (name: string, side: "left" | "right") => {
          const boxSettings: any = {
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
        const ridgeMat = new BABYLON.StandardMaterial("ridgeMat", Scene);
        ridgeMat.diffuseColor = BABYLON.Color3.FromHexString("#374151");
        ridgeMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        ridge.material = ridgeMat;
        ridge.position.set(0, rise + ridge.getBoundingInfo().boundingBox.extendSize.y, 0);
        ridge.parent = root;
      }

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

      [panelMat].forEach(m => m.freeze?.());
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
  }, [dims, overhang, thickness, seamSpacing, spin, onCanvasReady, roofData]); // , selectedColor]);

  // Update material color when selectedColor changes
  useEffect(() => {
    if (panelMaterialRef.current) {
      panelMaterialRef.current.diffuseColor = BABYLON.Color3.FromHexString(selectedColor);
    }
  }, [selectedColor]);

  // Standing seam width change — currently visual only (future: update mesh geometry)
  useEffect(() => {
    // Panel profile changes will trigger scene rebuild via roofData dependency
  }, [standingSeamWidth, panelProfile]);

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
                className={`group relative p-3 rounded-xl transition-all ${
                  panelProfile === profile.id
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
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${
                      standingSeamWidth === w
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
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  currentView === view.id
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
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all border ${
              isRotating
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
        className={`absolute top-0 right-0 h-full z-20 transition-all duration-300 ease-in-out ${
          showColorPicker ? 'w-[30%] min-w-[320px]' : 'w-0'
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
                    className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      selectedSeries === series
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
                    className={`group relative aspect-square rounded-xl transition-all hover:scale-105 ${
                      selectedColor === colorOption.hex
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
