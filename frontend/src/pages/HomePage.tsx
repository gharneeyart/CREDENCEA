import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { steps, features, roles } from "@/helpers";


export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          Live on Sepolia · ERC-5192 Soulbound Tokens
        </div> */}
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6">
          Academic credentials<br />
          <span className="text-sky-500">you can trust.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
          Credencea issues degree certificates as blockchain-native soulbound tokens.
          Any employer anywhere in the world can verify in one second — no PDFs, no phone calls, no fraud.
        </p>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Institutions now self-serve the first step: apply, wait for owner approval, then activate issuance from their own wallet.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate("/onboard")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm">
            Apply as an institution <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/verify")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors shadow-sm">
            Verify a credential <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/issue")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-semibold text-sm transition-colors">
            Issue a certificate
          </button>
        </div>
      </section>

      {/* Role cards */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Choose your role</h2>
          <p className="text-slate-500 text-center mb-10 max-w-lg mx-auto">Credencea serves three audiences — pick yours to get started.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {roles.map(({ icon: Icon, title, desc, to, color }) => (
              <button key={to} onClick={() => navigate(to)}
                className="group text-left bg-white rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-md p-6 transition-all">
                <div className={`inline-flex p-3 rounded-xl ${color} mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 text-base">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                <div className="flex items-center gap-1 mt-4 text-sky-500 text-sm font-medium">
                  Get started <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">How it works</h2>
        <p className="text-slate-500 text-center mb-12 max-w-lg mx-auto">Four steps from issuance to verified.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="relative">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold text-sm mb-4">{n}</div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">Built for trust</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1 text-sm">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
          {["Open-source contract", "No central server", "IPFS metadata", "ERC-5192 standard", "Auditable on Etherscan"].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />{t}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
