import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";

import dbConnect from "./db/dbConnect.js";
import authRoutes from "./Route/auth.js";
import userRoutes from "./Route/user.js";
import adminRoutes from "./Route/admin.js";
import { createServer } from "http";
import { Server } from "socket.io";


dotenv.config();
const app=express();

const allowedOrigins = process.env.client_url 
    ? process.env.client_url.split(',').map(url => url.trim()) 
    : ["http://localhost:5173"];


const PORT=process.env.PORT || 5000;

const server=createServer(app);

// CORS middleware - skip Socket.io paths
app.use((req, res, next) => {
    // Skip CORS for Socket.io - it handles its own CORS
    const url = req.url || '';
    if(url.includes('/socket.io')){
        return next();
    }
    // Apply CORS for all other routes
    cors({
        origin: function(origin, callback){
            if(!origin || allowedOrigins.indexOf(origin) !== -1){
                callback(null, true);
            }else{
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials:true,
        methods:["GET","POST","PUT","DELETE"],
    })(req, res, next);
});

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use("/public", express.static("public"));
app.use("/api/auth",authRoutes);
app.use("/api/user",userRoutes);
app.use("/api/admin",adminRoutes);
app.get("/",(req,res)=>{
    res.send("Hello World");
});

const io=new Server(server,{
    pingTimeout:60000,
    cors:{
        origin: function(origin, callback){
            if(!origin || allowedOrigins.indexOf(origin) !== -1){
                callback(null, true);
            }else{
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods:["GET","POST"],
        credentials:true,
    },
});
let onlineUsers=[];


io.on("connection",(socket)=>{
    socket.emit("me",socket.id);
     
    socket.on("join",(user)=>{
        if(!user || !user.id){
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

    socket.on("callUser",(data)=>{
        const {userToCall,signal,from,name,profilePicture,email}=data;
        
        // Try to find user in onlineUsers array first
        const user=onlineUsers.find(u=>u.id===userToCall);
        if(user){
            socket.to(user.socketId).emit("callUser",{signal,from,name,profilePicture,email});
            return;
        } else {
            // Fallback: try to emit to the room (user.id room)
            socket.to(userToCall).emit("callUser",{signal,from,name,profilePicture,email});
        }
    });

    socket.on("AnswerCall",(data)=>{
        io.to(data.to).emit("callAccepted",{signal:data.signal,from: data.from});
    });

    socket.on("rejectCall",(data)=>{
        const {to, from, name, profilePicture, email}=data;
        const user=onlineUsers.find(u=>u.id===to);
        if(user){
            socket.to(user.socketId).emit("callRejected",{
                from: from,
                name: name,
                profilePicture: profilePicture,
                email: email
            });
        } else {
            // Fallback: try to emit to the room
            socket.to(to).emit("callRejected",{
                from: from,
                name: name,
                profilePicture: profilePicture,
                email: email
            });
        }
    });
    
    socket.on("AnswerCall",(data)=>{
        const {to, signal, from, name, profilePicture, email}=data;
        const user=onlineUsers.find(u=>u.id===to);
        if(user){
            socket.to(user.socketId).emit("callAccepted",{signal, from, name, profilePicture, email});
        } else {
            socket.to(to).emit("callAccepted",{signal, from, name, profilePicture, email});
        }
    });
    
    socket.on("endCall",(data)=>{
        const {to, from, name}=data;
        const user=onlineUsers.find(u=>u.id===to);
        if(user){
            socket.to(user.socketId).emit("endCall",{from, name});
        } else {
            socket.to(to).emit("endCall",{from, name});
        }
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

