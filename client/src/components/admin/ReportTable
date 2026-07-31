import React from "react";
import { ShieldAlert } from "lucide-react";

interface ReportTableProps {
  reports: any[];
  onResolve: (reportId: number) => void;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  reports,
  onResolve,
}) => {
  return (
    <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 md:col-span-2">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <ShieldAlert className="w-6 h-6 text-red-400" />
        Signalements
      </h2>

      {reports?.length === 0 && (
        <p className="text-purple-300">
          Aucun signalement.
        </p>
      )}

      <div className="space-y-3">
        {reports?.map((report: any) => (
          <div
            key={report.id}
            className="bg-slate-800 rounded-lg p-4"
          >
            <p className="text-white">
              Utilisateur : #{report.userId}
            </p>

            <p className="text-purple-300">
              Motif : {report.reason}
            </p>

            <p className="text-gray-400">
              {report.description}
            </p>

            {report.status !== "resolved" && (
              <button
                onClick={() => onResolve(report.id)}
                className="mt-3 bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white transition-colors"
              >
                Marquer comme traité
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
