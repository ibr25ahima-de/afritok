import { db } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function promote() {
  const phone = "+225 05 64 19 41 33";
  console.log(`🚀 Tentative de promotion pour : ${phone}`);
  
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (user.length === 0) {
      console.log("❌ Utilisateur non trouvé. Vérifiez le numéro de téléphone.");
      return;
    }

    await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.phone, phone));

    console.log(`✅ Succès ! ${user[0].name} est maintenant admin.`);
  } catch (error) {
    console.error("❌ Erreur lors de la promotion :", error);
  } finally {
    process.exit(0);
  }
}

promote();
