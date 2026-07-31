import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { reports } from "../../drizzle/schema";

/* =====================
REPORTS
===================== */

export async function createReport(
  reporterId: number,
  videoId: number | undefined,
  userId: number | undefined,
  reason: string,
  description?: string
) {
  await db.insert(reports).values({
    reporterId,
    videoId,
    userId,
    reason,
    description,
    status: "pending",
  });
}

export async function getReports(status?: string) {
  if (status) {
    return db.select().from(reports).where(eq(reports.status, status));
  }
  return db.select().from(reports).orderBy(desc(reports.createdAt));
}

export async function getReportById(reportId: number) {
  return (
    await db.select().from(reports).where(eq(reports.id, reportId)).limit(1)
  )[0];
}

export async function updateReportStatus(reportId: number, status: string) {
  await db
    .update(reports)
    .set({ status })
    .where(eq(reports.id, reportId));
}

export async function deleteReport(reportId: number) {
  await db.delete(reports).where(eq(reports.id, reportId));
}
