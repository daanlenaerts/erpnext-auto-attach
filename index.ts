import { Command } from "commander";
import { readdir } from "node:fs/promises";
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
        const files = await readdir(absoluteDir);
        for (const file of files) {
          const filePath = path.join(absoluteDir, file);
          if (uploadedSet.has(filePath)) continue;

          // Clean the filename by taking the first part of the filename before the first space (if present)
          let name = file.split(" ")[0];
          // Get rid of the extension
          name = name.split(".")[0];

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
            registerUpload(filePath, doctype, name);
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
