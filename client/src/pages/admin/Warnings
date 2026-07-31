import React from "react";
import { trpc } from "@/lib/trpc";

export default function Warnings() {
  const { data: warnings } = trpc.admin.getWarnings.useQuery();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Admin Warnings</h1>
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <div className="space-y-4">
          {warnings?.map((w: any) => (
            <div key={w.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-bold">User #{w.userId}</p>
                  <p className="text-purple-300 text-sm">Reason: {w.reason}</p>
                </div>
                <span className="text-slate-500 text-xs">{new Date(w.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-gray-400 mt-2 text-sm">{w.message}</p>
            </div>
          ))}
          {(!warnings || warnings.length === 0) && (
            <p className="text-purple-400 text-center py-4">No warnings issued yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
