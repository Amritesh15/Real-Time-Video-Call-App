import User from "../Schema/userSchema.js";

import bcrypt from "bcryptjs";
const image ="../public/default_pic.jpeg";
const Signup=async(req,res)=>{
    try {
        const {fullName,username,password,profilePicture,email,gender}=req.body;
        const user=await User.findOne({username});
        const emailUser=await User.findOne({email});
        if(user){
            return res.status(400).json({message:"User already exists"});
        }
        if(emailUser){
            return res.status(400).json({message:"Email already exists"});
        }
        const hashedPassword=await bcrypt.hash(password,10);
        if(!profilePicture){
            profilePicture=image;
        }
    
        const newUser=await User.create({fullName,username,password:hashedPassword,profilePicture,email,gender});
        res.status(201).json({message:"User created successfully",user:newUser});
    
}
catch (error) {
    res.status(500).json({message:"Internal server error"});
}
};


const Login=async(req,res)=>{
    try {
        const {username,password}=req.body;
        const user=await User.findOne({username});
        if(!user){
            return res.status(400).json({message:"User not found"});
        }
        const isPasswordCorrect=await bcrypt.compare(password,user.password);
        if(!isPasswordCorrect){
            return res.status(400).json({message:"Invalid credentials"});
        }
        res.status(200).json({message:"Login successful",user:user});
    }
    catch (error) {
        res.status(500).json({message:"Internal server error"});
    }


};

export { Signup, Login };