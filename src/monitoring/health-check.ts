import { exec } from "child_process";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFilePath = join(__dirname, "config.log");

// Check the last 100 lines of the log file for "finalized"
function checkLogsForFinalization(): void {
  exec(
    `tail -n 100 ${logFilePath} | grep "finalized"`,
    (error, stdout, stderr) => {
      if (error || stderr) {
        console.error(`Error checking logs: ${error || stderr}`);
        return;
      }
      if (stdout.includes("finalized")) {
        console.log("Logs show finalization. Node appears healthy.");
      } else {
        console.error(
          "No recent finalization in logs. Node may not be healthy."
        );
      }
    }
  );
}

// Check service status
function checkServiceStatus(): void {
  exec("sudo systemctl is-active wield.service", (error, stdout, stderr) => {
    if (error || stderr) {
      console.error(`Error checking service status: ${error || stderr}`);
      return;
    }
    if (stdout.trim() === "active") {
      console.log("Service is active. Checking logs...");
      checkLogsForFinalization();
    } else {
      console.error("Service is not active.");
    }
  });
}

checkServiceStatus();
