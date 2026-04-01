import { Outlet} from "react-router-dom";
import { useAppKitAccount } from "@reown/appkit/react";
import { AlertTriangle } from "lucide-react";
import { CONTRACT_CONFIGURED } from "@/lib/contract";
import Nav from "./Nav";
import Footer from "./Footer";

export default function Layout() {
  const { isConnected } = useAppKitAccount();

  return (
    <div className="min-h-dvh flex flex-col bg-white">
     <Nav/>

      {!CONTRACT_CONFIGURED && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-amber-800 text-sm">
            <span className="font-semibold">Contract not configured.</span>{" "}
            Add <code className="bg-amber-100 px-1 rounded text-xs font-mono">VITE_CONTRACT_ADDRESS</code> to your{" "}
            <code className="bg-amber-100 px-1 rounded text-xs font-mono">.env</code> file, then restart the dev server.
          </p>
        </div>
      )}

      {isConnected === false && (
        <div className="bg-sky-50 border-b border-sky-100 text-center py-2.5 px-4">
          <p className="text-sky-700 text-sm font-medium">
            Connect your wallet to interact with Credencea
          </p>
        </div>
      )}

      <main className="flex-1"><Outlet /></main>

      <Footer/>
    </div>
  );
}