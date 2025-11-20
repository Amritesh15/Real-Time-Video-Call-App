import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import dbConnect from "./db/dbConnect.js";
import authRoutes from "./Route/auth.js";
import userRoutes from "./Route/user.js";

dotenv.config();
const app=express();

const allowedOrigins=[""];

const PORT=process.env.PORT || 5000;

app.use(cors({
    origin: function(origin,callback){
        if(!origin || allowedOrigins.indexOf(origin) !== -1){
            callback(null,true);
        }else{
            callback(new Error("Not allowed by CORS"));
        }

    },
    credentials:true,
    methods:["GET","POST","PUT","DELETE"],
}));

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use("/public", express.static("public"));
app.use("/api/auth",authRoutes);
app.use("/api/user",userRoutes);
app.get("/",(req,res)=>{
    res.send("Hello World");
});

(async ()=>{
    try {
        await dbConnect();
        app.listen(PORT,()=>{console.log(`Server is running on port ${PORT}`)});
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
})();

