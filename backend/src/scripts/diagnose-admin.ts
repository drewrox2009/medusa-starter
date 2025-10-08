import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function diagnoseAdmin({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const userModuleService = container.resolve(Modules.USER);

  logger.info("=== ADMIN DIAGNOSTIC START ===");

  // Check environment variables
  logger.info("Environment variables:");
  logger.info(`DISABLE_MEDUSA_ADMIN: ${process.env.DISABLE_MEDUSA_ADMIN}`);
  logger.info(`MEDUSA_BACKEND_URL: ${process.env.MEDUSA_BACKEND_URL}`);
  logger.info(`ADMIN_CORS: ${process.env.ADMIN_CORS}`);
  logger.info(
    `MEDUSA_CREATE_ADMIN_USER: ${process.env.MEDUSA_CREATE_ADMIN_USER}`
  );
  logger.info(`MEDUSA_ADMIN_EMAIL: ${process.env.MEDUSA_ADMIN_EMAIL}`);
  logger.info(`PORT: ${process.env.PORT}`);

  // Check if admin is disabled
  if (process.env.DISABLE_MEDUSA_ADMIN === "true") {
    logger.error("❌ Admin panel is disabled (DISABLE_MEDUSA_ADMIN=true)");
    return;
  } else {
    logger.info("✅ Admin panel is enabled");
  }

  // Check admin users
  try {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "email", "first_name", "last_name", "role"],
    });

    logger.info(`Found ${users.length} users:`);
    users.forEach((user: any) => {
      logger.info(`  - ${user.email} (${user.role})`);
    });

    if (users.length === 0) {
      logger.warn("⚠️  No users found in the database");
    } else {
      const adminUsers = users.filter((user: any) => user.role === "admin");
      if (adminUsers.length === 0) {
        logger.error("❌ No admin users found");
      } else {
        logger.info(`✅ Found ${adminUsers.length} admin user(s)`);
      }
    }
  } catch (error) {
    logger.error("❌ Error querying users:", error);
  }

  // Check store configuration
  try {
    const storeModuleService = container.resolve(Modules.STORE);
    const [store] = await storeModuleService.listStores();
    logger.info(`Store ID: ${store.id}`);
    logger.info(`Store name: ${store.name}`);
  } catch (error) {
    logger.error("❌ Error getting store:", error);
  }

  logger.info("=== ADMIN DIAGNOSTIC END ===");
}
