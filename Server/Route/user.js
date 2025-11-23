import express from "express";
import getAllUsers from "../routeController/userController.js";
import isLogin from "../middleware/isLogin.js";

const router =express.Router();

router.get("/getAllUsers", isLogin, getAllUsers);


export default router ;