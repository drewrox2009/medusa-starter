import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function checkServerStatus({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("=== SERVER STATUS CHECK ===");

  // Check if server can start properly
  try {
    const http = require("http");

    // Check if the server is responding on the configured port
    const port = process.env.PORT || 9000;

    logger.info(`Checking if server is running on port ${port}...`);

    const options = {
      hostname: "localhost",
      port: port,
      path: "/health",
      method: "GET",
      timeout: 5000,
    };

    const req = http.request(options, (res: any) => {
      logger.info(`Server responded with status: ${res.statusCode}`);

      if (res.statusCode === 200) {
        logger.info("✅ Server is responding correctly");
      } else {
        logger.warn(
          `⚠️  Server responded with unexpected status: ${res.statusCode}`
        );
      }

      // Check admin routes
      const adminOptions = {
        hostname: "localhost",
        port: port,
        path: "/app",
        method: "GET",
        timeout: 5000,
      };

      const adminReq = http.request(adminOptions, (adminRes: any) => {
        logger.info(
          `Admin route responded with status: ${adminRes.statusCode}`
        );

        if (adminRes.statusCode === 200 || adminRes.statusCode === 302) {
          logger.info("✅ Admin route is accessible");
        } else {
          logger.warn(
            `⚠️  Admin route responded with status: ${adminRes.statusCode}`
          );
        }

        logger.info("=== SERVER STATUS CHECK END ===");
        process.exit(0);
      });

      adminReq.on("error", (err: any) => {
        logger.error(`❌ Error checking admin route: ${err.message}`);
        logger.info("=== SERVER STATUS CHECK END ===");
        process.exit(1);
      });

      adminReq.end();
    });

    req.on("error", (err: any) => {
      logger.error(`❌ Server is not responding: ${err.message}`);
      logger.error("   This could indicate:");
      logger.error("   - Server failed to start");
      logger.error("   - Server is listening on a different port");
      logger.error("   - Server crashed during startup");
      logger.info("=== SERVER STATUS CHECK END ===");
      process.exit(1);
    });

    req.on("timeout", () => {
      logger.error("❌ Server request timed out");
      req.destroy();
      logger.info("=== SERVER STATUS CHECK END ===");
      process.exit(1);
    });

    req.end();
  } catch (error) {
    logger.error("❌ Error checking server status:", error);
    logger.info("=== SERVER STATUS CHECK END ===");
    process.exit(1);
  }
}
