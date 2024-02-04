import fetch from "node-fetch";
import { createWriteStream, existsSync, unlinkSync, renameSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

const wieldBinaryUrl =
  "https://shdw-drive.genesysgo.net/4xdLyZZJzL883AbiZvgyWKf2q55gcZiMgMkDNQMnyFJC/wield-latest";
const localBinaryPath = "/home/dagger/wield";
const tempDownloadPath = join(tmpdir(), "wield-latest-temp");

async function downloadBinary(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const fileStream = createWriteStream(outputPath);
  if (!response.body) {
    throw new Error("Response body is empty");
  }
  response.body.pipe(fileStream);

  return new Promise((resolve, reject) => {
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
}

async function replaceBinaryAndRestartService(): Promise<void> {
  try {
    await execAsync("sudo systemctl stop wield.service");

    if (existsSync(localBinaryPath)) {
      unlinkSync(localBinaryPath);
    }
    renameSync(tempDownloadPath, localBinaryPath);

    await execAsync("sudo systemctl start wield.service");
    console.log("Wield service has been updated and restarted.");
  } catch (error) {
    console.error(`An error occurred: ${error}`);
  }
}

async function updateWieldBinary(): Promise<void> {
  console.log("Starting update process...");
  try {
    await downloadBinary(wieldBinaryUrl, tempDownloadPath);
    await replaceBinaryAndRestartService();
  } catch (error) {
    console.error(`Update process failed: ${error}`);
  } finally {
    if (existsSync(tempDownloadPath)) {
      unlinkSync(tempDownloadPath);
    }
  }
}

updateWieldBinary();
