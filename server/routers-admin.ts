import { router } from "./_core/trpc";
import { dashboardRouter } from "./routers/admin/dashboard";
import { usersRouter } from "./routers/admin/users";
import { reportsRouter } from "./routers/admin/reports";
import { warningsRouter } from "./routers/admin/warnings";
import { withdrawalsRouter } from "./routers/admin/withdrawals";
import { musicRouter } from "./routers/admin/music";
import { financeRouter } from "./routers/admin/finance";
import { logsRouter } from "./routers/admin/logs";

/**
 * ============================================
 * ADMIN SYSTEM (Main Entry)
 * ============================================
 */

export const adminRouter = router({
  ...dashboardRouter._def.procedures,
  ...usersRouter._def.procedures,
  ...reportsRouter._def.procedures,
  ...warningsRouter._def.procedures,
  ...withdrawalsRouter._def.procedures,
  ...musicRouter._def.procedures,
  ...financeRouter._def.procedures,
  ...logsRouter._def.procedures,
});
