import User from "../Schema/userSchema.js";
import image from "../assets/default_pic.jpeg";

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
}

export default Signup;