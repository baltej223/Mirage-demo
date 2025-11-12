import db from "../src/firebase.ts";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Prompts user for confirmation before proceeding
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

/**
 * Backs up all mirage-locations to mirageQuestions.json.bak
 * and resets the 'teams' field to an empty array for all questions.
 */
async function mirageBackupAndResetQuestions() {
  console.log("Starting mirage questions backup and reset...");

  const collectionRef = db.collection("mirage-locations");

  try {
    // 1. Fetch all questions
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log("No questions found in mirage-locations collection.");
      return;
    }

    console.log(`Found ${snapshot.size} questions to backup.`);

    // 2. Prepare backup data
    const backupData = [];
    snapshot.forEach((doc) => {
      backupData.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // 3. Write backup file
    const backupPath = join(__dirname, "..", "scripts", "mirageQuestions.json.bak");
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");
    console.log(`Backup written to: ${backupPath}`);

    // 4. Reset 'teams' field to empty array for all questions
    console.log("Resetting 'teams' field for all questions...");
    const batch = db.batch();
    let resetCount = 0;

    snapshot.forEach((doc) => {
      batch.update(doc.ref, { teams: [] });
      resetCount++;
    });

    // 5. Commit the batch operation
    await batch.commit();

    console.log(
      `Successfully reset 'teams' field for ${resetCount} questions.`,
    );
    console.log("Backup and reset complete!");
  } catch (error) {
    console.error("Backup and reset failed:", error);
    process.exit(1);
  }
}

// Execute the function with confirmation
(async () => {
  console.log("\n⚠️  WARNING: This script will:");
  console.log("  1. Backup all questions to mirageQuestions.json.bak");
  console.log("  2. RESET the 'teams' field to [] for ALL questions\n");
  
  const confirmed = await askConfirmation(
    "Are you sure you want to continue? (yes/no): "
  );

  if (!confirmed) {
    console.log("\n❌ Operation cancelled.");
    process.exit(0);
  }

  console.log("\n✓ Confirmed. Proceeding...\n");

  await mirageBackupAndResetQuestions();
  console.log("Script completed successfully.");
  process.exit(0);
})().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});