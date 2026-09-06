import express from "express";
import { createCategoryController, getCategoriesController, seedCategoriesController } from "../controllers/categoryController.js";
import adminAuth from "../middleware/adminAuth.js";
import auth from "../middleware/auth.js";

const categoryRouter = express.Router();

categoryRouter.get("/get", getCategoriesController);
categoryRouter.post("/create", auth, adminAuth, createCategoryController);
categoryRouter.post("/seed", auth, adminAuth, seedCategoriesController);

export default categoryRouter;
