export default function RoofInfoTile() {
  return (
    <div className="h-40 rounded-lg bg-white dark:bg-card border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
          <span>Planes</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-200">8</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
          <span>Total SF</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-200">3,240</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
          <span>Pitch</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-200">6/12</span>
        </div>
      </div>
      <div className="flex gap-2">
        <span className="text-[10px] px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-300">
          Standing Seam
        </span>
        <span className="text-[10px] px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-300">
          24ga
        </span>
      </div>
    </div>
  );
}
