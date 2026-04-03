import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { buildBulkResultsCsv, parseBulkIssueCsv } from "@/lib/csv";
import { useIssueBatchCertificates } from "@/hooks/useContract";
import type { BulkIssueProgress, BulkIssueResult, BulkIssueRow } from "@/types";
import { cn } from "@/lib/utils";

function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function InstitutionBulkIssuePage() {
  const issueBatchCertificatesFn = useIssueBatchCertificates();

  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<BulkIssueRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<BulkIssueProgress>({
    total: 0,
    prepared: 0,
    finalized: 0,
    currentBatch: 0,
    totalBatches: 0,
    phase: "idle",
    message: "Upload a CSV to begin.",
  });
  const [results, setResults] = useState<BulkIssueResult[]>([]);
  const [running, setRunning] = useState(false);

  const progressPercent = useMemo(() => {
    if (!progress.total) return 0;
    return Math.round(((progress.prepared + progress.finalized) / (progress.total * 2)) * 100);
  }, [progress]);

  const successCount = results.filter((result) => result.status === "success").length;
  const failureCount = results.length - successCount;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseBulkIssueCsv(text);

    setFilename(file.name);
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
    setResults([]);
    setProgress({
      total: parsed.rows.length,
      prepared: 0,
      finalized: 0,
      currentBatch: 0,
      totalBatches: parsed.rows.length ? Math.ceil(parsed.rows.length / 50) : 0,
      phase: "idle",
      message: parsed.errors.length > 0
        ? "Fix the CSV issues below before issuing."
        : `${parsed.rows.length} row(s) ready for batch issuance.`,
    });

    if (parsed.errors.length > 0) {
      toast.error("The CSV has validation issues.");
    } else {
      toast.success(`Loaded ${parsed.rows.length} row(s) from ${file.name}`);
    }
  };

  const handleStart = async () => {
    if (rows.length === 0) return toast.error("Upload a valid CSV first.");
    if (parseErrors.length > 0) return toast.error("Resolve the CSV validation issues first.");

    setRunning(true);
    setResults([]);

    try {
      const batchResults = await issueBatchCertificatesFn(rows, setProgress);
      setResults(batchResults);

      const successful = batchResults.filter((result) => result.status === "success").length;
      const failed = batchResults.length - successful;
      toast.success(
        failed > 0
          ? `Bulk issuance finished with ${successful} success(es) and ${failed} failure(s).`
          : `Successfully issued ${successful} certificate(s).`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk issuance failed.");
    } finally {
      setRunning(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;
    const csv = buildBulkResultsCsv(results);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCsv(`certchain-bulk-results-${stamp}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV Batch Issuance
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Upload and mint in batches of 50</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Use a CSV with these headers: <span className="font-mono text-xs text-slate-700">wallet address, student name, degree, major, grade, year</span>.
              Optional: <span className="font-mono text-xs text-slate-700">description</span>.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={results.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export results CSV
          </button>
        </div>

        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-emerald-300 bg-emerald-50/70 px-6 py-10 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50">
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          <UploadCloud className="h-8 w-8 text-emerald-600" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Choose a CSV file</p>
          <p className="mt-1 text-sm text-slate-500">{filename || "No file selected yet."}</p>
        </label>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rows Ready</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{rows.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Batches</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{rows.length ? Math.ceil(rows.length / 50) : 0}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Validation Issues</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{parseErrors.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Issuance progress</h2>
            <p className="mt-1 text-sm text-slate-500">{progress.message}</p>
          </div>
          <button
            onClick={handleStart}
            disabled={running || rows.length === 0 || parseErrors.length > 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {running ? "Issuing..." : "Start bulk issuance"}
          </button>
        </div>

        <div className="mt-5">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                progress.phase === "error" ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Prepared: {progress.prepared}/{progress.total}</span>
            <span>Finalized: {progress.finalized}/{progress.total}</span>
            <span>Batch: {progress.currentBatch}/{progress.totalBatches || 0}</span>
            <span>Completion: {progressPercent}%</span>
          </div>
        </div>
      </div>

      {parseErrors.length > 0 ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-800">CSV issues to fix</h2>
          <ul className="mt-4 space-y-2 text-sm text-red-700">
            {parseErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">CSV preview</h2>
            <p className="mt-1 text-sm text-slate-500">Review the first rows before starting the batch run.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="px-6 py-3 font-medium">Row</th>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Wallet</th>
                  <th className="px-6 py-3 font-medium">Degree</th>
                  <th className="px-6 py-3 font-medium">Major</th>
                  <th className="px-6 py-3 font-medium">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 8).map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-6 py-4 text-slate-500">{row.rowNumber}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{row.studentName}</td>
                    <td className="px-6 py-4 max-w-[220px] break-all font-mono text-xs text-slate-600">{row.recipientAddress}</td>
                    <td className="px-6 py-4 text-slate-700">{row.degree}</td>
                    <td className="px-6 py-4 text-slate-700">{row.major}</td>
                    <td className="px-6 py-4 text-slate-700">{row.graduationYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 8 ? (
            <div className="px-6 py-4 text-sm text-slate-500">Showing 8 of {rows.length} row(s).</div>
          ) : null}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Issuance results</h2>
              <p className="mt-1 text-sm text-slate-500">Use the export button to download a CSV mapping student names to token IDs.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Success: <span className="font-semibold text-emerald-700">{successCount}</span> · Failure: <span className="font-semibold text-red-600">{failureCount}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="px-6 py-3 font-medium">Row</th>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Wallet</th>
                  <th className="px-6 py-3 font-medium">Token ID</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((result) => (
                  <tr key={result.rowNumber}>
                    <td className="px-6 py-4 text-slate-500">{result.rowNumber}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{result.studentName}</td>
                    <td className="px-6 py-4 max-w-[220px] break-all font-mono text-xs text-slate-600">{result.recipientAddress}</td>
                    <td className="px-6 py-4 text-slate-700">{result.tokenId?.toString() || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        result.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", result.status === "success" ? "bg-emerald-500" : "bg-red-500")} />
                        {result.status === "success" ? "Issued" : "Failed"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{result.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
