import "dotenv/config";
import app from "./src/app.js";
import connectDatabase from "./src/config/database.js";

const port = Number(process.env.PORT || 5000);

try {
  await connectDatabase();
  app.listen(port, () => {
    console.log(`Inventory API listening on port ${port}`);
  });
} catch (error) {
  console.error("Unable to start the Inventory API:", error);
  process.exitCode = 1;
}
