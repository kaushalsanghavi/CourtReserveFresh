import type { Express } from "express";
import { z } from "zod";
import {
  fineDateSchema,
  fineMonthSchema,
  recordFinePaymentSchema,
  removeFineSchema,
  reportFineSchema,
} from "@shared/schema";
import {
  FINE_REPORTING_WINDOW_MESSAGE,
  getFineAmount,
  getFineReportingWindow,
} from "@shared/fine-policy";
import { parseDeviceInfo } from "@shared/device-info";
import { FineRepository, isFineDuplicateError } from "./fine-repository";

function requestError(res: any, error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: "Invalid request data", errors: error.errors });
  }
  if (isFineDuplicateError(error)) {
    return res.status(409).json({ message: "This member already has a fine for today." });
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
}

export function registerFineRoutes(app: Express, repository: FineRepository) {
  app.get("/api/fines/reporting-window", (_req, res) => {
    res.json(getFineReportingWindow());
  });

  app.get("/api/fines/history", async (req, res) => {
    try {
      const month = fineMonthSchema.parse(req.query.month);
      res.json(await repository.listEventsByMonth(month));
    } catch (error) {
      requestError(res, error, "Failed to fetch fine history");
    }
  });

  app.get("/api/fines/history/:date", async (req, res) => {
    try {
      const date = fineDateSchema.parse(req.params.date);
      res.json(await repository.listEventsByDate(date));
    } catch (error) {
      requestError(res, error, "Failed to fetch fine history for date");
    }
  });

  app.get("/api/fines", async (req, res) => {
    try {
      const month = fineMonthSchema.parse(req.query.month);
      res.json(await repository.listByMonth(month));
    } catch (error) {
      requestError(res, error, "Failed to fetch fines");
    }
  });

  app.post("/api/fines", async (req, res) => {
    try {
      const window = getFineReportingWindow();
      if (!window.isOpen) {
        return res.status(403).json({ message: FINE_REPORTING_WINDOW_MESSAGE, reportingWindow: window });
      }

      const input = reportFineSchema.parse(req.body);
      const fine = await repository.report({
        ...input,
        incidentDate: window.date,
        amount: getFineAmount(input.reason),
        deviceInfo: parseDeviceInfo(req.headers["user-agent"] || ""),
      });
      if (!fine) {
        return res.status(403).json({ message: "The reporting and fined members must both be active." });
      }
      return res.status(201).json(fine);
    } catch (error) {
      return requestError(res, error, "Failed to report fine");
    }
  });

  app.post("/api/fines/:id/pay", async (req, res) => {
    try {
      const input = recordFinePaymentSchema.parse(req.body);
      const fine = await repository.markPaid({
        fineId: req.params.id,
        actorMemberId: input.actorMemberId,
        deviceInfo: parseDeviceInfo(req.headers["user-agent"] || ""),
      });
      if (!fine) {
        return res.status(409).json({ message: "This fine is unavailable, already paid, or the acting member is inactive." });
      }
      return res.json(fine);
    } catch (error) {
      return requestError(res, error, "Failed to record fine payment");
    }
  });

  app.post("/api/fines/:id/remove", async (req, res) => {
    try {
      const input = removeFineSchema.parse(req.body);
      const fine = await repository.remove({
        fineId: req.params.id,
        actorMemberId: input.actorMemberId,
        reason: input.reason,
        deviceInfo: parseDeviceInfo(req.headers["user-agent"] || ""),
      });
      if (!fine) {
        return res.status(409).json({ message: "This fine is unavailable, already removed, or the acting member is inactive." });
      }
      return res.json(fine);
    } catch (error) {
      return requestError(res, error, "Failed to remove fine");
    }
  });
}
