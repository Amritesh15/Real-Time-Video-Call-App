import express from "express";
import { getAllUsers, deleteUser, makeAdmin } from "../routeController/AdimData.js";
import isLogin from "../middleware/isLogin.js";

const router=express.Router();

router.get("/getAllUsers", isLogin, getAllUsers);
router.delete("/deleteUser/:username", isLogin, deleteUser);
router.patch("/makeAdmin/:username", isLogin, makeAdmin);

export default router;
