import { homedir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

interface ServerStatus {
  isActive: boolean;
  isFinalizing: boolean;
}

const execAsync = promisify(exec);

const logFilePath = join(homedir(), "config.log");

// Refactored to be promise-based and always return serverStatus
async function checkLogsForFinalization(): Promise<ServerStatus> {
  let serverStatus = {
    isActive: false, // This will be updated by checkServiceStatus
    isFinalizing: false,
  };

  try {
    const { stdout, stderr } = await execAsync(
      `tail -n 5 ${logFilePath} | grep "finalized"`
    );
    if (stderr) {
      console.error(`Error checking logs: ${stderr}`);
      serverStatus.isFinalizing = false;
    } else if (stdout) {
      console.log("Logs show finalization. Node appears healthy.");
      serverStatus.isFinalizing = true;
    } else {
      console.log("No recent finalization in logs. Node may not be healthy.");
      serverStatus.isFinalizing = false;
    }
  } catch (error) {
    console.log("No recent finalization in logs. Node may not be healthy.");
    serverStatus.isFinalizing = false;
  }

  return serverStatus;
}

// Refactored to update isActive directly and wait for log finalization check
async function checkServiceStatus(): Promise<ServerStatus> {
  let serverStatus = await checkLogsForFinalization(); // Get initial status from log check

  try {
    const { stdout, stderr } = await execAsync(
      "sudo systemctl is-active wield.service"
    );
    if (stderr) {
      console.error(`Error checking service status: ${stderr}`);
      serverStatus.isActive = false;
    } else if (stdout.trim() === "active") {
      console.log("Service is active.");
      serverStatus.isActive = true;
    } else {
      console.error("Service is not active.");
      serverStatus.isActive = false;
    }
  } catch (error) {
    console.error(`Error checking service status: ${error}`);
    serverStatus.isActive = false;
  }

  return serverStatus;
}

const checkHealth = async (): Promise<ServerStatus> => {
  const serverStatus = await checkServiceStatus();
  return serverStatus;
};

export default checkHealth;
