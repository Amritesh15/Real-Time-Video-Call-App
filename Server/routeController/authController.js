import User from "../Schema/userSchema.js";
import jwtToken from "../utils/jwtToken.js";
import bcrypt from "bcryptjs";
const image ="../public/default_pic.jpeg";

const Signup=async(req,res)=>{
    try {
        const {fullName,username,password,profilePicture,email,gender}=req.body;
        
        // Validate required fields
        if(!fullName || !username || !password || !email || !gender){
            return res.status(400).json({success:false,message:"All fields are required"});
        }
        
        const user=await User.findOne({username});
        const emailUser=await User.findOne({email});
        if(user){
            return res.status(400).json({success:false,message:"User already exists"});
        }
        if(emailUser){
            return res.status(400).json({success:false,message:"Email already exists"});
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const finalProfilePicture = profilePicture || image;
    
        const newUser=await User.create({fullName,username,password:hashedPassword,profilePicture:finalProfilePicture,email,gender});
        res.status(201).json({success:true,message:"User created successfully",user:newUser});
    
}
catch (error) {
    console.error("Signup error:", error);
    // Handle Mongoose validation errors
    if(error.name === 'ValidationError'){
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({success:false,message:errors.join(', ')});
    }
    // Handle duplicate key errors
    if(error.code === 11000){
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({success:false,message:`${field} already exists`});
    }
    res.status(500).json({success:false,message:error.message || "Internal server error"});
}
};


const Login=async(req,res)=>{
    try {
        const {username,password}=req.body;
        if(!username || !password){
            return res.status(400).json({success:false,message:"Username/Email and password are required"});
        }
        // Try to find user by username or email
        const user=await User.findOne({
            $or: [{username: username}, {email: username}]
        });
        if(!user){
            return res.status(400).json({success:false,message:"User not found"});
        }
        const isPasswordCorrect=await bcrypt.compare(password,user.password);
        if(!isPasswordCorrect){
            return res.status(400).json({success:false,message:"Invalid credentials"});
        }
        const token=jwtToken(user._id,res);
        res.status(200).json({
            success:true,
            _id:user._id,
            fullName:user.fullName,
            username:user.username,
            profilePicture:user.profilePicture,
            email:user.email,
            gender:user.gender,
            message:"Login successful",
            token:token 
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({success:false,message:error.message || "Internal server error"});
    }


};


const Logout=async(req,res)=>{
    try {
        res.clearCookie("jwt",{
            path:"/",
            httpOnly:true,
            secure:process.env.NODE_ENV === 'production',
            sameSite:'lax'
        });
        res.status(200).json({success:true,message:"Logged out successfully"});
    }
    catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({success:false,message:error.message || "Internal server error"});
    }
}

export { Signup, Login ,Logout};