import express from "express";
import multer from "multer";
import isLogin from "../middleware/isLogin.js";
import {Signup, Login,Logout} from "../routeController/authController.js";
import upload from "../middleware/upload.js";
const router=express.Router();

// Signup route with file upload middleware
router.post("/signup", (req, res, next) => {
    upload.single('profilePicture')(req, res, (err) => {
        if (err) {
            // Handle multer errors
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({success: false, message: 'File size too large. Maximum size is 5MB.'});
                }
                return res.status(400).json({success: false, message: err.message});
            }
            // Handle other errors (like file filter errors)
            return res.status(400).json({success: false, message: err.message});
        }
        next();
    });
}, Signup);
router.post("/login",Login);
router.post("/logout",isLogin,Logout);

export default router;