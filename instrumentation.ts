import cron from "node-cron";
import { runRSSImport } from "@/lib/douban-import";

export async function register() {
  const userId = process.env.DOUBAN_USER_ID;
  const interval = process.env.AUTO_IMPORT_INTERVAL || "0 */6 * * *"; // 默认每6小时

  if (!userId) {
    console.log("[Cron] DOUBAN_USER_ID not set, auto import disabled");
    return;
  }

  if (!cron.validate(interval)) {
    console.error("[Cron] Invalid AUTO_IMPORT_INTERVAL:", interval);
    return;
  }

  console.log("[Cron] Auto RSS import scheduled:", interval, "for user:", userId);

  cron.schedule(interval, async () => {
    console.log("[Cron] Running auto RSS import...");
    const result = await runRSSImport(userId);
    if (result.success) {
      console.log(`[Cron] Import success: ${result.created} created, ${result.skipped} skipped`);
    } else {
      console.error("[Cron] Import failed:", result.error);
    }
  });
}
