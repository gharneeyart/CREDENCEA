import { GraduationCap } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-slate-100 bg-slate-50 py-8">
        <div className="w-11/12 lg:w-10/12 mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-sky-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-slate-500">Credencea</span>
          </div>
        </div>
      </footer>
    )
}