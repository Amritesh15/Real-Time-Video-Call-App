import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";

import dbConnect from "./db/dbConnect.js";
import authRoutes from "./Route/auth.js";
import userRoutes from "./Route/user.js";
import { createServer } from "http";
import { Server } from "socket.io";


dotenv.config();
const app=express();

const allowedOrigins=process.env.client_url || "http://localhost:5173";


const PORT=process.env.PORT || 5000;

const server=createServer(app);

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

const io=new Server(server,{
    pingTimeout:60000,
    cors:{
        origin:allowedOrigins[0],
        methods:["GET","POST"],
        credentials:true,
    },
});
console.log('Socket.io connected with cores');
let onlineUsers=[];


io.on("connection",(socket)=>{
    console.log('Socket.io connected with cores');
    
    socket.emit("me",socket.id);
     
    socket.on("join",(user)=>{
        if(!user || !user.id){
            console.log('Invalid user data');
            return;
        }

        socket.join(user.id);
        const existingUser=onlineUsers.find(u=>u.id===user.id);
        if(existingUser){
            existingUser.socketId=socket.id;
        }else{
            onlineUsers.push({id:user.id,name:user.name,socketId:socket.id});
        }
        io.emit("getOnlineUsers",onlineUsers);
    });

    socket.on("disconnect",()=>{
        const disconnectedUser=onlineUsers.find(u=>u.socketId===socket.id);
        onlineUsers=onlineUsers.filter(u=>u.socketId!==socket.id);
        io.emit("getOnlineUsers",onlineUsers);
        if(disconnectedUser){
            socket.broadcast.emit("userDisconnected",disconnectedUser.id);
        }
    });
});

(async ()=>{
    try {
        await dbConnect();
        server.listen(PORT,()=>{console.log(`Server is running on port ${PORT}`)});
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
})();

