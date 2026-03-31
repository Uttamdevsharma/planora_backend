import { envVars } from './app/config/env';
import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { notFound } from "./app/middleware/notFound";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { indexRoutes } from "./app/routes";

const app: Application = express();

app.use(cors({ origin: envVars.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// We need raw body for Stripe webhook, but indexRoutes is nested.
// A common trick is to use a middleware that captures the raw body.
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      if (req.originalUrl.includes("/webhook")) {
        req.rawBody = buf;
      }
    },
  })
);

app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", indexRoutes);

app.get("/", async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Planora API is running",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;