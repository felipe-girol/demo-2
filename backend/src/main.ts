import express from "express";
import cors from "cors";
import { router } from "./routes/index.js";
import { requestLogger } from "./middleware/request-logger.js";
import { logInfo } from "./utils/logger.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use("/api", router);

app.listen(PORT, () => {
  logInfo("Server", `Running on http://localhost:${PORT}`);
});
