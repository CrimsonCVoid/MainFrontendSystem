"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

declare global { interface Window { BABYLON?: any; } }

// Load Babylon once per app session
let babylonReady: Promise<void> | null = null;
async function ensureBabylon() {
  if (typeof window === "undefined" || window.BABYLON) return;
  if (!babylonReady) {
    const add = (src: string) =>
      new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = src; s.async = true;
        s.onload = () => res();
        s.onerror = () => rej(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });
    babylonReady = Promise.resolve()
      .then(() => add("https://cdn.babylonjs.com/babylon.js"))
      .then(() => add("https://cdn.babylonjs.com/gui/babylon.gui.min.js"))
      .then(() => add("https://cdn.babylonjs.com/materialsLibrary/babylon.gridMaterial.min.js"));
  }
  await babylonReady;
}

type Viewer3DProps = {
  address: string;
  className?: string; // Size via CSS (e.g., w-full h-[220px])
  seed?: string;
};

export default function Viewer3D({ address, className, seed }: Viewer3DProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);

  const labelText = useMemo(() => address?.trim() || "Roof Preview", [address]);

  // Keep canvas matched to container size (works in dialogs/resizes)
  useLayoutEffect(() => {
    if (!wrapRef.current || !canvasRef.current) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;

    const ro = new ResizeObserver(() => {
      if (!wrap || !canvas) return;
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
      await ensureBabylon();
      const BABYLON = window.BABYLON!;
      if (!canvasRef.current || !wrapRef.current || disposed) return;

      // Dispose any existing engine/scene (hot reload / re-open modal)
      try { engineRef.current?.dispose?.(); } catch {}
      engineRef.current = null;
      sceneRef.current = null;

      const engine = new BABYLON.Engine(canvasRef.current, true, {
        preserveDrawingBuffer: true, stencil: true, doNotHandleContextLost: false,
      });
      engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.12, 1);
      sceneRef.current = scene;

      // Camera (turntable)
      const camera = new BABYLON.ArcRotateCamera(
        "cam",
        BABYLON.Tools.ToRadians(35),
        BABYLON.Tools.ToRadians(35),
        18,
        BABYLON.Vector3.Zero(),
        scene
      );
      camera.minZ = 0.1;
      camera.lowerRadiusLimit = 6;
      camera.upperRadiusLimit = 60;
      camera.wheelDeltaPercentage = 0.02;
      camera.useAutoRotationBehavior = true;
      const rot = camera.autoRotationBehavior;
      rot.idleRotationSpeed = 0.32;
      rot.idleRotationWaitTime = 300;
      rot.idleRotationSpinUpTime = 900;
      camera.attachControl(canvasRef.current, true);

      // Lighting & shadows
      const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
      hemi.intensity = 0.55;
      const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.5, -1, -0.6), scene);
      dir.position = new BABYLON.Vector3(20, 30, 20);
      dir.intensity = 1.1;
      const sh = new BABYLON.ShadowGenerator(2048, dir, true);
      sh.usePercentageCloserFiltering = true;

      // Environment ground for contact shadows
      scene.createDefaultEnvironment({
        createSkybox: false,
        createGround: true,
        groundSize: 150,
        enableGroundShadow: true,
        groundShadowLevel: 0.35,
      });

      // Post-FX
      const pipe = new BABYLON.DefaultRenderingPipeline("pipe", true, scene, [camera]);
      pipe.fxaaEnabled = true;
      pipe.sharpenEnabled = true;
      pipe.sharpen.edgeAmount = 0.12;
      pipe.bloomEnabled = true;
      pipe.bloomThreshold = 0.72;
      pipe.bloomWeight = 0.24;
      pipe.bloomKernel = 48;
      pipe.imageProcessingEnabled = true;
      pipe.imageProcessing.toneMappingEnabled = true;
      pipe.imageProcessing.exposure = 1.08;
      pipe.imageProcessing.contrast = 1.03;

      // Placeholder roof massing (swap with real geometry when ready)
      const roof = BABYLON.MeshBuilder.CreateBox("roof", { width: 9.6, height: 2, depth: 7.6 }, scene);
      roof.position.y = 1.05;
      const ridge = BABYLON.MeshBuilder.CreateBox("ridge", { width: 9.8, height: 0.12, depth: 0.32 }, scene);
      ridge.position.y = 2.1;

      const m1 = new BABYLON.PBRMaterial("m1", scene);
      m1.metallic = 0; m1.roughness = 0.36; m1.albedoColor = new BABYLON.Color3(0.9, 0.93, 0.98);
      roof.material = m1;

      const m2 = new BABYLON.PBRMaterial("m2", scene);
      m2.metallic = 0; m2.roughness = 0.6; m2.albedoColor = new BABYLON.Color3(0.7, 0.78, 0.85);
      ridge.material = m2;

      sh.addShadowCaster(roof); sh.addShadowCaster(ridge);

      // Subtle idle motion
      let t = 0;
      scene.onBeforeRenderObservable.add(() => {
        t += scene.getEngine().getDeltaTime() * 0.0015;
        const y = 1.05 + Math.sin(t) * 0.045;
        roof.position.y = y; ridge.position.y = y + 1.05;
      });

      // Address label
      const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("ui", true, scene);
      const label = new BABYLON.GUI.TextBlock();
      label.text = labelText;
      label.color = "white"; label.fontSize = 12;
      label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      label.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
      label.left = "12px"; label.top = "-10px";
      gui.addControl(label);

      // Start render loop and trigger an initial resize
      engine.runRenderLoop(() => scene.render());
      const w = Math.max(1, wrapRef.current!.clientWidth);
      const h = Math.max(1, wrapRef.current!.clientHeight);
      canvasRef.current!.width = w; canvasRef.current!.height = h;
      engine.resize();

      return () => {
        try { engine.stopRenderLoop(); } catch {}
        try { scene.dispose(); } catch {}
        try { engine.dispose(); } catch {}
      };
    })();

    return () => { disposed = true; };
  }, [labelText, seed]);

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
