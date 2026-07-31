import React from "react";
import { trpc } from "@/lib/trpc";
import { ReportTable } from "../../components/admin/ReportTable";

export default function Reports() {
  const { data: reports, refetch: refetchReports } = trpc.admin.getReports.useQuery();
  const resolveReport = trpc.admin.resolveReport.useMutation({ onSuccess: () => refetchReports() });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Content Moderation</h1>
      <ReportTable 
        reports={reports || []}
        onResolve={(reportId) => resolveReport.mutate({ reportId })}
      />
    </div>
  );
}
