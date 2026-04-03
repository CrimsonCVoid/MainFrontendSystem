"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const RoofViewer3D = dynamic(
  () => import("@/components/dashboard/RoofViewer3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    ),
  }
);

export default function TestPage() {
  const [address, setAddress] = useState("1600 Amphitheatre Parkway, Mountain View, CA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roofData, setRoofData] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<string>("");

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRoofData(null);
    setRawResponse("");

    try {
      // Call backend directly (bypasses auth)
      const res = await fetch("/api/test-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();
      setRawResponse(JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data.error || `Backend returned ${res.status}`);
      }

      setRoofData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold mb-4">Backend + 3D Viewer Test</h1>

      {/* Input */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter address..."
          className="flex-1 px-4 py-2 border rounded-lg text-sm"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !address.trim()}
          className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Roof"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      {roofData && (
        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Total Area</div>
            <div className="text-lg font-bold">{roofData.total_area_sf?.toLocaleString()} SF</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Planes</div>
            <div className="text-lg font-bold">{roofData.planes?.length}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Ridge</div>
            <div className="text-lg font-bold">{roofData.measurements?.ridge_length_ft?.toFixed(1)} ft</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Perimeter</div>
            <div className="text-lg font-bold">{roofData.measurements?.total_perimeter_ft?.toFixed(1)} ft</div>
          </div>
        </div>
      )}

      {/* 3D Viewer */}
      <div className="border rounded-xl overflow-hidden" style={{ height: "500px" }}>
        <RoofViewer3D
          className="h-full w-full"
          spin={!roofData}
          hideControls={false}
          roofData={roofData}
        />
      </div>

      {/* Raw JSON */}
      {rawResponse && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-500 font-medium">
            Raw Backend Response
          </summary>
          <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs overflow-auto max-h-96">
            {rawResponse}
          </pre>
        </details>
      )}
    </div>
  );
}
