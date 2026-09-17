// src/routes/collections.js

import { Router } from "express";

import {
  approveCollection,
  createCollection,
  getCollectionById,
  getCollections,
  rejectCollection,
  reverseCollection,
} from "../services/collectionRepository.js";
import { requireRole } from "../middleware/requireAuth.js";

export const collectionsRouter = Router();

collectionsRouter.get("/", (req, res) => {
  const { status } = req.query;
  const collections = getCollections();

  res.json(status ? collections.filter((item) => item.status === status) : collections);
});

collectionsRouter.get("/:collectionId", (req, res) => {
  const collection = getCollectionById(req.params.collectionId);

  if (!collection) {
    return res.status(404).json({ error: "Collection not found." });
  }

  res.json(collection);
});

// Staff submit collections; admins can too.
collectionsRouter.post("/", requireRole("admin", "staff"), (req, res, next) => {
  try {
    res.status(201).json(createCollection(req.body || {}, req.user));
  } catch (error) {
    next(error);
  }
});

collectionsRouter.post("/:collectionId/approve", requireRole("admin"), (req, res, next) => {
  try {
    res.json(approveCollection(req.params.collectionId, req.user));
  } catch (error) {
    next(error);
  }
});

collectionsRouter.post("/:collectionId/reject", requireRole("admin"), (req, res, next) => {
  try {
    res.json(
      rejectCollection(req.params.collectionId, {
        remarks: req.body?.remarks || "",
        rejectedBy: req.user,
      })
    );
  } catch (error) {
    next(error);
  }
});

collectionsRouter.post("/:collectionId/reverse", requireRole("admin"), (req, res, next) => {
  try {
    res.json(
      reverseCollection(req.params.collectionId, {
        reason: req.body?.reason || "",
        reversedBy: req.user,
      })
    );
  } catch (error) {
    next(error);
  }
});
