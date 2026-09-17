// src/routes/vehicles.js

import { Router } from "express";

import {
  cancelVehicleSale,
  completeVehicleSale,
  getVehicleById,
  getVehicleEvents,
  getVehicleStatusCounts,
  getVehicles,
  getVehiclesByStatus,
  moveVehicleToPendingSale,
  releaseVehicle,
  seizeVehicle,
} from "../services/vehicleRepository.js";
import { requireRole } from "../middleware/requireAuth.js";

export const vehiclesRouter = Router();

vehiclesRouter.get("/", (req, res) => {
  const { status } = req.query;

  res.json(status ? getVehiclesByStatus(String(status).toUpperCase()) : getVehicles());
});

vehiclesRouter.get("/counts", (req, res) => {
  res.json(getVehicleStatusCounts());
});

vehiclesRouter.get("/:vehicleId", (req, res) => {
  const vehicle = getVehicleById(req.params.vehicleId);

  if (!vehicle) {
    return res.status(404).json({ error: "Vehicle not found." });
  }

  res.json(vehicle);
});

vehiclesRouter.get("/:vehicleId/events", (req, res) => {
  res.json(getVehicleEvents(req.params.vehicleId));
});

const action = (handler) => (req, res, next) => {
  try {
    res.json(handler(req));
  } catch (error) {
    next(error);
  }
};

vehiclesRouter.post(
  "/:vehicleId/seize",
  requireRole("admin"),
  action((req) => seizeVehicle(req.params.vehicleId, req.body || {}, req.user.username))
);

vehiclesRouter.post(
  "/:vehicleId/release",
  requireRole("admin"),
  action((req) => releaseVehicle(req.params.vehicleId, req.body || {}, req.user.username))
);

vehiclesRouter.post(
  "/:vehicleId/pending-sale",
  requireRole("admin"),
  action((req) => moveVehicleToPendingSale(req.params.vehicleId, req.body || {}, req.user.username))
);

vehiclesRouter.post(
  "/:vehicleId/complete-sale",
  requireRole("admin"),
  action((req) => completeVehicleSale(req.params.vehicleId, req.body || {}, req.user.username))
);

vehiclesRouter.post(
  "/:vehicleId/cancel-sale",
  requireRole("admin"),
  action((req) => cancelVehicleSale(req.params.vehicleId, req.body?.reason || "", req.user.username))
);
