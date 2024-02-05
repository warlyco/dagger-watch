import fetch from "node-fetch";
import {
  promises as fs,
  createReadStream,
  createWriteStream,
  existsSync,
} from "fs";
import { createHash } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

const scriptUrl =
  "https://shdw-drive.genesysgo.net/4xdLyZZJzL883AbiZvgyWKf2q55gcZiMgMkDNQMnyFJC/wield-installer.sh";
const localBinaryPath = "/home/dagger/wield";
const tempScriptPath = join(tmpdir(), "wield-installer.sh");

async function fetchScriptAndExtractBinaryUrl(): Promise<string> {
  const response = await fetch(scriptUrl);
  if (!response.ok)
    throw new Error(`Failed to download script: ${response.statusText}`);
  const scriptContent = await response.text();
  await fs.writeFile(tempScriptPath, scriptContent);

  const match = scriptContent.match(/WIELD_URL="([^"]+)"/);
  if (!match) throw new Error("Failed to extract binary URL from script.");
  return match[1];
}

async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (error) => reject(error));
  });
}

async function checkForUpdate(): Promise<void> {
  try {
    const binaryUrl = await fetchScriptAndExtractBinaryUrl();
    const currentHash = existsSync(localBinaryPath)
      ? await hashFile(localBinaryPath)
      : "";

    // Download the latest binary to a temporary location for hashing
    const tempBinaryPath = join(tmpdir(), "wield-latest-temp");
    const res = await fetch(binaryUrl);
    if (!res.ok)
      throw new Error(`Failed to download binary: ${res.statusText}`);
    const tempFileStream = createWriteStream(tempBinaryPath);
    if (!res?.body) throw new Error("Response body is empty.");
    res.body.pipe(tempFileStream);

    await new Promise((resolve, reject) => {
      tempFileStream.on("finish", resolve);
      tempFileStream.on("error", reject);
    });

    const newHash = await hashFile(tempBinaryPath);
    if (newHash !== currentHash) {
      console.log("An update is available.");
    } else {
      console.log("No update is available. The current binary is up to date.");
    }
  } catch (error) {
    console.error(`Error during update check: ${error}`);
  }
}

checkForUpdate();
