import fetch from "node-fetch";
import {
  createWriteStream,
  existsSync,
  unlinkSync,
  renameSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

const scriptUrl =
  "https://shdw-drive.genesysgo.net/4xdLyZZJzL883AbiZvgyWKf2q55gcZiMgMkDNQMnyFJC/wield-installer.sh";
const localBinaryPath = "/home/dagger/wield";
const tempDownloadPath = join(tmpdir(), "wield-latest-temp");
const tempScriptPath = join(tmpdir(), "wield-installer.sh");

async function fetchAndUpdateScript(): Promise<string> {
  console.log("Fetching update script...");
  const response = await fetch(scriptUrl);
  if (!response.ok) {
    throw new Error(`Failed to download update script: ${response.statusText}`);
  }
  const scriptContent = await response.text();
  writeFileSync(tempScriptPath, scriptContent);
  console.log("Update script fetched.");
  return scriptContent;
}

async function extractBinaryUrlFromScript(
  scriptContent: string
): Promise<string> {
  const match = scriptContent.match(/WIELD_URL="([^"]+)"/);
  if (!match)
    throw new Error("Failed to extract binary URL from update script.");
  return match[1];
}

async function downloadBinary(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to download file: ${response.statusText}`);
  if (!response.body) throw new Error("Response body is empty");

  const fileStream = createWriteStream(outputPath);
  response.body.pipe(fileStream);

  return new Promise((resolve, reject) => {
    fileStream.on("finish", () => {
      console.log("Binary downloaded successfully.");
      resolve();
    });
    fileStream.on("error", (error) => {
      console.error("Failed to download binary:", error);
      reject(error);
    });
  });
}

async function replaceBinaryAndRestartService(): Promise<void> {
  console.log("Updating and restarting service...");
  await execAsync("sudo systemctl stop wield.service");
  if (existsSync(localBinaryPath)) {
    unlinkSync(localBinaryPath);
  }
  renameSync(tempDownloadPath, localBinaryPath);
  await execAsync("sudo systemctl start wield.service");
  console.log("Wield service has been updated and restarted.");
}

async function updateWieldBinary(): Promise<void> {
  console.log("Starting update process...");
  try {
    const scriptContent = await fetchAndUpdateScript();
    const binaryUrl = await extractBinaryUrlFromScript(scriptContent);
    await downloadBinary(binaryUrl, tempDownloadPath);
    await replaceBinaryAndRestartService();
  } catch (error) {
    console.error(`Update process failed: ${error}`);
  } finally {
    // Cleanup
    if (existsSync(tempDownloadPath)) {
      unlinkSync(tempDownloadPath);
    }
    if (existsSync(tempScriptPath)) {
      unlinkSync(tempScriptPath);
    }
  }
}

updateWieldBinary();
