import fs from "fs";

const file = "src/pages/admin/Transactions.tsx";
let lines = fs.readFileSync(file, "utf8").split("\n");

// We want to delete from line 235 (index 234) to line 629 (index 628) inclusive.
// That is the "{activeTab === 'analysis' ? (" all the way to "{activeTab === 'manual' && ("

const startIndex = lines.findIndex(l => l.includes("{activeTab === 'analysis' ? ("));
const endIndex = lines.findIndex(l => l.includes("{activeTab === 'manual' && ("));

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1);
  fs.writeFileSync(file, lines.join("\n"));
  console.log("Lines deleted successfully.");
} else {
  console.log("Could not find start or end index.");
}
