import { cn } from "@/lib/utils";

export function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-row md:flex-col items-center md:items-start gap-3">
      <Icon className={cn("w-5 h-5 mb-2", color)} />
      <div className="">
        <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-slate-400 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  );
}