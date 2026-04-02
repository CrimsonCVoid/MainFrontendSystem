/**
 * 3D CANVAS SCREENSHOT CAPTURE UTILITY
 *
 * Captures screenshots from Babylon.js canvas for PDF generation.
 * Requires preserveDrawingBuffer: true in Babylon.js engine options.
 */

declare global {
  interface Window {
    BABYLON?: any;
  }
}

/**
 * Captures a screenshot from a Babylon.js canvas
 * @param canvasRef - React ref to the canvas element
 * @param width - Target width for resized image (default 800)
 * @param height - Target height for resized image (default 600)
 * @returns Base64 data URL of the screenshot, or null if capture fails
 */
export async function capture3DScreenshot(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  width: number = 800,
  height: number = 600
): Promise<string | null> {
  if (!canvasRef?.current) {
    console.warn("capture3DScreenshot: No canvas ref provided");
    return null;
  }

  try {
    // Wait for next render frame to ensure scene is complete
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Capture as data URL
    const dataUrl = canvasRef.current.toDataURL("image/png", 1.0);

    // Resize for PDF (reduces file size)
    return await resizeImage(dataUrl, width, height);
  } catch (error) {
    console.error("Failed to capture 3D screenshot:", error);
    return null;
  }
}

/**
 * Captures a top-down (bird's eye) view screenshot from a Babylon.js canvas
 * Temporarily moves camera to overhead position, captures, then restores
 * @param canvasRef - React ref to the canvas element
 * @param width - Target width (default 800)
 * @param height - Target height (default 500)
 * @returns Base64 data URL of the screenshot, or null if capture fails
 */
export async function captureTopDownScreenshot(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  width: number = 800,
  height: number = 500
): Promise<string | null> {
  if (!canvasRef?.current) {
    console.warn("captureTopDownScreenshot: No canvas ref provided");
    return null;
  }

  const B = window.BABYLON;
  if (!B) {
    console.warn("captureTopDownScreenshot: Babylon.js not loaded");
    return capture3DScreenshot(canvasRef, width, height);
  }

  try {
    // Find the engine and scene from the canvas
    const engine = B.Engine.LastCreatedEngine;
    if (!engine) {
      console.warn("captureTopDownScreenshot: No Babylon engine found");
      return capture3DScreenshot(canvasRef, width, height);
    }

    const scene = engine.scenes?.[0];
    if (!scene) {
      console.warn("captureTopDownScreenshot: No scene found");
      return capture3DScreenshot(canvasRef, width, height);
    }

    const camera = scene.activeCamera;
    if (!camera || !camera.alpha !== undefined) {
      console.warn("captureTopDownScreenshot: No ArcRotateCamera found");
      return capture3DScreenshot(canvasRef, width, height);
    }

    // Store original camera position
    const originalAlpha = camera.alpha;
    const originalBeta = camera.beta;
    const originalRadius = camera.radius;
    const originalTarget = camera.target?.clone?.();

    // Disable auto-rotation temporarily
    const wasRotating = (window as any)._toggleRotation;
    if (wasRotating) {
      (window as any)._toggleRotation(false);
    }

    // Set camera to top-down view
    // Beta = 0 means looking straight down, but we use a slight angle (0.1) for better visual
    camera.alpha = 0; // Look from the front
    camera.beta = 0.15; // Nearly straight down (small angle for depth perception)
    camera.radius = originalRadius * 1.3; // Pull back a bit for full view

    // Wait for a couple render frames for camera to update
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    scene.render();

    // Capture the screenshot
    const dataUrl = canvasRef.current.toDataURL("image/png", 1.0);

    // Restore original camera position
    camera.alpha = originalAlpha;
    camera.beta = originalBeta;
    camera.radius = originalRadius;
    if (originalTarget && camera.setTarget) {
      camera.setTarget(originalTarget);
    }

    // Re-enable rotation if it was enabled
    if (wasRotating) {
      (window as any)._toggleRotation(true);
    }

    // Wait for camera to restore
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Resize for PDF
    return await resizeImage(dataUrl, width, height);
  } catch (error) {
    console.error("Failed to capture top-down screenshot:", error);
    // Fall back to regular screenshot
    return capture3DScreenshot(canvasRef, width, height);
  }
}

/**
 * Resize an image to fit within max dimensions while maintaining aspect ratio
 */
async function resizeImage(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Calculate aspect ratio
      const aspectRatio = width / height;

      // Scale to fit within bounds while maintaining aspect ratio
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

/**
 * Capture canvas to blob for larger images
 */
export async function capture3DScreenshotAsBlob(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
): Promise<Blob | null> {
  if (!canvasRef?.current) return null;

  return new Promise((resolve) => {
    canvasRef.current!.toBlob(
      (blob) => resolve(blob),
      "image/png",
      0.95
    );
  });
}
