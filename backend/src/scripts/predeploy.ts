import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { MedusaError } from "@medusajs/framework/utils";

export default async function predeploy({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("=== PREDEPLOY SCRIPT START ===");

  // Check if admin is disabled
  if (process.env.DISABLE_MEDUSA_ADMIN === "true") {
    logger.error("❌ Admin panel is disabled (DISABLE_MEDUSA_ADMIN=true)");
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Admin panel is disabled but you're trying to access it"
    );
  }

  // Check if admin users exist
  try {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "email", "first_name", "last_name", "role"],
    });

    if (users.length === 0) {
      logger.warn("⚠️  No users found in the database");

      // Check if we should create an admin user
      if (process.env.MEDUSA_CREATE_ADMIN_USER === "true") {
        logger.info("Creating admin user as MEDUSA_CREATE_ADMIN_USER=true");
        const userModuleService = container.resolve(Modules.USER);

        await userModuleService.createUsers([
          {
            email: process.env.MEDUSA_ADMIN_EMAIL || "admin@medusa-test.com",
            first_name: "Admin",
            last_name: "User",
          },
        ]);

        logger.info("✅ Admin user created successfully");
      } else {
        logger.warn(
          "⚠️  No admin user exists and MEDUSA_CREATE_ADMIN_USER is false"
        );
        logger.warn(
          "   Set MEDUSA_CREATE_ADMIN_USER=true to create an admin user automatically"
        );
      }
    } else {
      const adminUsers = users.filter((user: any) => user.role === "admin");
      if (adminUsers.length === 0) {
        logger.error("❌ No admin users found");
        logger.error(
          "   Set MEDUSA_CREATE_ADMIN_USER=true to create an admin user automatically"
        );
      } else {
        logger.info(`✅ Found ${adminUsers.length} admin user(s)`);
      }
    }
  } catch (error) {
    logger.error("❌ Error checking users:", error);
    throw error;
  }

  // Check store configuration
  try {
    const storeModuleService = container.resolve(Modules.STORE);
    const [store] = await storeModuleService.listStores();
    logger.info(`✅ Store ID: ${store.id}`);
    logger.info(`✅ Store name: ${store.name}`);
  } catch (error) {
    logger.error("❌ Error getting store:", error);
    throw error;
  }

  // Check admin build
  const fs = require("fs");
  const path = require("path");

  const adminBuildPath = path.join(process.cwd(), ".medusa", "admin");
  if (!fs.existsSync(adminBuildPath)) {
    logger.warn("⚠️  Admin build not found at .medusa/admin");
    logger.warn("   The admin panel may not be built properly");
  } else {
    logger.info("✅ Admin build found");
  }

  // Check public admin files
  const publicAdminPath = path.join(process.cwd(), "public", "admin");
  if (!fs.existsSync(publicAdminPath)) {
    logger.warn("⚠️  Public admin files not found at public/admin");
    logger.warn("   The admin panel may not be accessible");
  } else {
    logger.info("✅ Public admin files found");
  }

  logger.info("=== PREDEPLOY SCRIPT END ===");
}
