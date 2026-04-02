"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/components/providers/org-provider";
import { useRouter } from "next/navigation";

interface ScheduleEntry {
  id: string;
  project_id: string;
  start_date: string;
  end_date: string | null;
  crew_notes: string | null;
  projects: { id: string; name: string; address: string; city: string; status: string } | null;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const COLORS = ["bg-blue-200 text-blue-800","bg-emerald-200 text-emerald-800","bg-purple-200 text-purple-800","bg-amber-200 text-amber-800","bg-rose-200 text-rose-800","bg-cyan-200 text-cyan-800"];

export default function CalendarTab() {
  const { org } = useOrg();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const startDate = new Date(year, month, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const load = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    const res = await fetch(`/api/schedule?orgId=${org.id}&startDate=${startDate}&endDate=${endDate}`);
    const data = await res.json();
    setSchedule(data.schedule || []);
    setLoading(false);
  }, [org?.id, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Map entries to dates
  const dateMap = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    for (const entry of schedule) {
      const start = entry.start_date;
      const end = entry.end_date || start;
      const d = new Date(start);
      const endD = new Date(end);
      while (d <= endD) {
        const key = d.toISOString().split("T")[0];
        if (!map[key]) map[key] = [];
        map[key].push(entry);
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [schedule]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <h3 className="text-lg font-bold text-neutral-900 w-48 text-center">
            {MONTH_NAMES[month]} {year}
          </h3>
          <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-neutral-500">{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-neutral-100 bg-neutral-50/30" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entries = dateMap[dateStr] || [];
            const isToday = dateStr === today;
            return (
              <div key={dateStr} className={`min-h-[90px] border-b border-r border-neutral-100 p-1 ${isToday ? "bg-orange-50" : ""}`}>
                <div className={`text-xs font-semibold mb-1 ${isToday ? "w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center" : "text-neutral-500 px-1"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {entries.slice(0, 3).map((entry, ei) => (
                    <div
                      key={`${entry.id}-${ei}`}
                      onClick={() => router.push(`/projects/${entry.project_id}`)}
                      className={`text-[9px] px-1.5 py-0.5 rounded truncate cursor-pointer font-medium ${COLORS[ei % COLORS.length]}`}
                    >
                      {entry.projects?.name || "Job"}
                    </div>
                  ))}
                  {entries.length > 3 && (
                    <div className="text-[9px] text-neutral-400 px-1">+{entries.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-neutral-500">
        {loading ? "Loading..." : `${schedule.length} scheduled jobs this month`}
      </div>
    </div>
  );
}
