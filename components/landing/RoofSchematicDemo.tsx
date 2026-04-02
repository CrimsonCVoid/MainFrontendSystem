"use client";

import { useEffect, useRef, useState } from "react";

// Mock roof data — realistic 7-plane house
const DEMO_PLANES = [
  { id: "P0", vertices: [[-6,0,-7],[6,0,-7],[6,4.2,0],[-6,4.2,0]], area_sf: 850, slope: 22, azimuth: 180 },
  { id: "P1", vertices: [[-6,4.2,0],[6,4.2,0],[6,0,7],[-6,0,7]], area_sf: 850, slope: 22, azimuth: 0 },
  { id: "P2", vertices: [[6,0,-7],[12,0,-7],[12,3.1,-1.5],[6,4.2,0]], area_sf: 420, slope: 18, azimuth: 270 },
  { id: "P3", vertices: [[6,4.2,0],[12,3.1,-1.5],[12,0,5],[6,0,7]], area_sf: 380, slope: 18, azimuth: 90 },
  { id: "P4", vertices: [[-6,0,-7],[-10,0,-7],[-10,2.8,-2],[-6,4.2,0]], area_sf: 320, slope: 20, azimuth: 270 },
  { id: "P5", vertices: [[-6,4.2,0],[-10,2.8,-2],[-10,0,5],[-6,0,7]], area_sf: 310, slope: 20, azimuth: 90 },
  { id: "P6", vertices: [[-10,0,-7],[-14,0,-4],[-14,1.8,-1],[-10,2.8,-2]], area_sf: 120, slope: 15, azimuth: 225 },
];

const EDGE_COLORS: Record<string, string> = {
  ridge: "#2563eb", eave: "#16a34a", rake: "#eab308",
};
const PLANE_FILLS = ["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#2dd4bf","#fb923c"];

const AZ_LABELS: Record<number, string> = { 0:"N",90:"E",180:"S",270:"W",45:"NE",135:"SE",225:"SW",315:"NW" };
function azLabel(az: number) {
  const n = [0,45,90,135,180,225,270,315].reduce((p,c) => Math.abs(c-az)<Math.abs(p-az)?c:p);
  return AZ_LABELS[n] || `${az}°`;
}

export default function RoofSchematicDemo({ className = "", viewRx, viewRz }: { className?: string; viewRx?: number; viewRz?: number }) {
  const rotXRef = useRef(30);
  const rotZRef = useRef(-35);

  // Respond to external view changes
  useEffect(() => {
    if (viewRx !== undefined) rotXRef.current = viewRx;
    if (viewRz !== undefined) rotZRef.current = viewRz;
  }, [viewRx, viewRz]);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, rx: 0, rz: 0 });
  const rafRef = useRef(0);
  const autoRotRef = useRef(true);
  const [, forceRender] = useState(0);

  // Auto-rotate
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (autoRotRef.current && !draggingRef.current) {
        rotZRef.current -= 0.15;
        forceRender((n) => n + 1);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);

  // Bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of DEMO_PLANES) for (const v of p.vertices) {
    minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]);
    minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]);
    minZ = Math.min(minZ, v[2]); maxZ = Math.max(maxZ, v[2]);
  }
  const cx3d = (minX+maxX)/2, cy3d = (minY+maxY)/2, cz3d = (minZ+maxZ)/2;
  const span = Math.max(maxX-minX, maxY-minY, maxZ-minZ, 1);
  const svgW = 600, svgH = 400;
  const scale = Math.min(svgW, svgH) * 0.95 / span;

  const rx = rotXRef.current, rz = rotZRef.current;
  const project = (x: number, y: number, z: number) => {
    const px = x-cx3d, py = y-cy3d, pz = z-cz3d;
    const rxR = rx*Math.PI/180, rzR = rz*Math.PI/180;
    const x1 = px*Math.cos(rzR)-pz*Math.sin(rzR);
    const z1 = px*Math.sin(rzR)+pz*Math.cos(rzR);
    const y2 = py*Math.cos(rxR)-z1*Math.sin(rxR);
    const z2 = py*Math.sin(rxR)+z1*Math.cos(rxR);
    return { x: svgW/2+x1*scale, y: svgH/2-y2*scale, depth: z2 };
  };

  const scheduleRender = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(() => forceRender((n)=>n+1)); };

  const onMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, rx: rotXRef.current, rz: rotZRef.current };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    rotZRef.current = dragStartRef.current.rz + (e.clientX - dragStartRef.current.x) * 0.4;
    rotXRef.current = Math.max(5, Math.min(85, dragStartRef.current.rx - (e.clientY - dragStartRef.current.y) * 0.4));
    scheduleRender();
  };
  const onMouseUp = () => { draggingRef.current = false; };

  const classifyEdge = (i: number, total: number) => {
    if (total === 4) { if (i === 0) return "ridge"; if (i === 2) return "eave"; return "rake"; }
    return "eave";
  };
  const edgeLen = (v0: number[], v1: number[]) =>
    Math.sqrt((v1[0]-v0[0])**2+(v1[1]-v0[1])**2+(v1[2]-v0[2])**2) * 3.28084;

  const sorted = DEMO_PLANES.map((p, i) => ({
    plane: p, index: i,
    depth: p.vertices.reduce((s, v) => s + project(v[0],v[1],v[2]).depth, 0) / p.vertices.length,
  })).sort((a, b) => a.depth - b.depth);

  return (
    <div
      className={`cursor-grab active:cursor-grabbing select-none ${className}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full">
        {/* Dot grid */}
        <defs>
          <pattern id="demogrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.3" fill="#94a3b8" opacity={0.3} />
          </pattern>
        </defs>
        <rect width={svgW} height={svgH} fill="transparent" />

        {/* Ground grid */}
        {Array.from({ length: 9 }).map((_, i) => {
          const t = (i-4)*span*0.25;
          const a = project(cx3d+t, minY-0.05, cz3d-span);
          const b = project(cx3d+t, minY-0.05, cz3d+span);
          const c = project(cx3d-span, minY-0.05, cz3d+t);
          const d = project(cx3d+span, minY-0.05, cz3d+t);
          return <g key={i} opacity={0.06}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth={0.5}/><line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#475569" strokeWidth={0.5}/></g>;
        })}

        {/* Fills */}
        {sorted.map(({ plane, index: i }) => {
          const pts = plane.vertices.map(v => project(v[0],v[1],v[2]));
          const d = pts.map((p,j) => `${j===0?"M":"L"} ${p.x} ${p.y}`).join(" ")+" Z";
          return <path key={`f-${i}`} d={d} fill={PLANE_FILLS[i%PLANE_FILLS.length]} fillOpacity={0.3} stroke="none" />;
        })}

        {/* Edges */}
        {sorted.map(({ plane, index: pi }) =>
          plane.vertices.map((v, ei) => {
            const v2 = plane.vertices[(ei+1)%plane.vertices.length];
            const p0 = project(v[0],v[1],v[2]);
            const p1 = project(v2[0],v2[1],v2[2]);
            const et = classifyEdge(ei, plane.vertices.length);
            return <line key={`e-${pi}-${ei}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
              stroke={EDGE_COLORS[et]||"#94a3b8"} strokeWidth={et==="ridge"?4:et==="rake"?3:et==="eave"?2.5:1.5} strokeLinecap="round" />;
          })
        )}

        {/* Dimension labels */}
        {sorted.map(({ plane, index: pi }) =>
          plane.vertices.map((v, ei) => {
            const v2 = plane.vertices[(ei+1)%plane.vertices.length];
            const len = edgeLen(v, v2);
            if (len < 3) return null;
            const p0 = project(v[0],v[1],v[2]);
            const p1 = project(v2[0],v2[1],v2[2]);
            const mx = (p0.x+p1.x)/2, my = (p0.y+p1.y)/2;
            let angle = Math.atan2(p1.y-p0.y, p1.x-p0.x)*180/Math.PI;
            if (angle > 90) angle -= 180;
            if (angle < -90) angle += 180;
            const et = classifyEdge(ei, plane.vertices.length);
            const ft = Math.floor(len), inches = Math.round((len-ft)*12);
            return (
              <g key={`l-${pi}-${ei}`} transform={`translate(${mx},${my}) rotate(${angle})`}>
                <rect x={-22} y={-7} width={44} height={14} rx={4} fill="white" fillOpacity={0.9} stroke={EDGE_COLORS[et]||"#ddd"} strokeWidth={0.6} />
                <text textAnchor="middle" y={4} fontSize={7.5} fontWeight="700" fill={EDGE_COLORS[et]||"#666"}>{ft}&apos;{inches}&quot;</text>
              </g>
            );
          })
        )}

        {/* Plane badges */}
        {sorted.map(({ plane, index: i }) => {
          const ax = plane.vertices.reduce((s,v) => s+v[0],0)/plane.vertices.length;
          const ay = plane.vertices.reduce((s,v) => s+v[1],0)/plane.vertices.length;
          const az = plane.vertices.reduce((s,v) => s+v[2],0)/plane.vertices.length;
          const pos = project(ax, ay, az);
          return (
            <g key={`b-${i}`}>
              <rect x={pos.x-18} y={pos.y-10} width={36} height={20} rx={5}
                fill="white" fillOpacity={0.95} stroke={PLANE_FILLS[i%PLANE_FILLS.length]} strokeWidth={1.5} />
              <text x={pos.x} y={pos.y+4} textAnchor="middle" fontSize={9} fontWeight="800" fill="#1e293b">{plane.id}</text>
            </g>
          );
        })}

        {/* Compass */}
        <g transform={`translate(${svgW-35}, 35)`}>
          <circle r="18" fill="white" fillOpacity={0.9} stroke="#e2e8f0" strokeWidth={1} />
          {["N","E","S","W"].map((dir, di) => {
            const a = di*Math.PI/2;
            const p = project(cx3d+Math.sin(a)*span*0.3, cy3d, cz3d+Math.cos(a)*span*0.3);
            const c = project(cx3d, cy3d, cz3d);
            const dx = p.x-c.x, dy = p.y-c.y;
            const l = Math.sqrt(dx*dx+dy*dy)||1;
            return <text key={dir} x={dx/l*12} y={dy/l*12+3} textAnchor="middle" fontSize={6} fontWeight="bold"
              fill={dir==="N"?"#dc2626":"#94a3b8"}>{dir}</text>;
          })}
        </g>

        {/* Legend */}
        <g transform={`translate(16, ${svgH-22})`}>
          {[["Ridge","#2563eb"],["Eave","#16a34a"],["Rake","#eab308"]].map(([name, color], i) => (
            <g key={name} transform={`translate(${i*100}, 0)`}>
              <line x1={0} y1={0} x2={22} y2={0} stroke={color} strokeWidth={4} strokeLinecap="round" />
              <text x={28} y={4} fontSize={13} fill="#334155" fontWeight="700">{name}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
