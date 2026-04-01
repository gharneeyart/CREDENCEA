import { cn } from "@/lib/utils";

export function Gate({ icon: Icon, title, desc, warn = false }: { icon: React.ElementType; title: string; desc: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 text-center px-4 gap-4">
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", warn ? "bg-amber-50" : "bg-sky-50")}>
        <Icon className={cn("w-8 h-8", warn ? "text-amber-500" : "text-sky-500")} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">{title}</h2>
        <p className="text-slate-500 max-w-sm text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}