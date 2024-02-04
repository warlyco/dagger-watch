import { homedir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Construct the path to config.log using the home directory
const logFilePath = join(homedir(), "config.log");

// Example function to check if the "finalized" string appears in the last 100 lines of the log
async function checkLogsForFinalization() {
  try {
    const { stdout, stderr } = await execAsync(
      `tail -n 100 ${logFilePath} | grep "finalized"`
    );
    if (stderr) {
      console.error(`Error checking logs: ${stderr}`);
      return;
    }
    if (stdout) {
      console.log("Logs show finalization. Node appears healthy.");
    } else {
      console.log("No recent finalization in logs. Node may not be healthy.");
    }
  } catch (error) {
    // This catch block is specifically for catching errors from execAsync, which will
    // include cases where grep finds no matches (leading to a non-zero exit code).
    console.log("No recent finalization in logs. Node may not be healthy.");
  }
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
