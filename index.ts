import { Command } from "commander";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { uploadAttachment } from "./controllers/upload-attachment";
import { getUploadedPathsForDir, registerUpload } from "./controllers/db";

const program = new Command();

program
  .name("erpnext-auto-attach")
  .description("CLI to auto attach documents to ERPNext")
  .option("-u, --url <url>", "ERPNext URL")
  .option("-k, --key <key>", "API key")
  .option("-s, --secret <secret>", "API secret");

program
  .command("watch")
  .description("watch for changes in a directory and attach them to ERPNext")
  .argument("<doctype>", "DocType to upload to")
  .argument("<dir>", "directory to watch")
  .action(async (doctype: string, dir: string) => {
    const absoluteDir = path.resolve(dir);

    // Prefetch uploaded file paths for the watched directory
    let uploadedSet = getUploadedPathsForDir(absoluteDir);
    while (true) {
      try {
        // Recursively get all files in the directory and subdirectories
        const files = await getAllFilesRecursive(absoluteDir);
        for (const filePath of files) {
          if (uploadedSet.has(filePath)) continue;

          // Clean the filename by taking the first part of the filename before the first space (if present)
          const file = path.basename(filePath);
          let name = file.split(" ")[0];
          // Get rid of the extension
          name = name.split(".")[0];

          console.log(`Uploading ${filePath} to ${doctype} ${name}`);

          try {
            await uploadAttachment({
              url: program.opts().url,
              key: program.opts().key,
              secret: program.opts().secret,
              doctype: doctype,
              name,
              file: Bun.file(filePath),
              filename: filePath,
            });
            // Register upload and update the set
            registerUpload(filePath, absoluteDir, doctype, name);
            uploadedSet.add(filePath);
            console.log(`Uploaded ${filePath} to ${doctype}`);
          } catch (e) {
            console.error(`Failed to upload ${filePath} to ${doctype}`);
            console.error(e);
          }
        }
      } catch (e) {
        console.error("Failed to list documents");
        console.error(e);
      }

      // Sleep for 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  });

program.parse();

// Helper function to recursively get all files in a directory
async function getAllFilesRecursive(dir: string): Promise<string[]> {
  let files: string[] = [];
  const entries = await readdir(dir);
  for (const entry of entries) {
    // Skip hidden files and directories
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(dir, entry);
    const entryStat = await stat(fullPath);
    if (entryStat.isDirectory()) {
      files = files.concat(await getAllFilesRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}
