import express from "express";
import isLogin from "../middleware/isLogin.js";
import {Signup, Login,Logout} from "../routeController/authController.js";
const router=express.Router();

router.post("/signup",Signup);
router.post("/login",Login);
router.post("/logout",isLogin,Logout);

export default router;