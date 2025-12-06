import User from "../Schema/userSchema.js";


const getAllUsers=async(req,res)=>{
    try {
        // Get all users except the current admin user
        // This shows all users (both admin and non-admin) for management
        const currentUserId = req.user?._id;
        const query = currentUserId ? { _id: { $ne: currentUserId } } : {};
        
        const users=await User.find(query).select("profilePicture username email fullName isAdmin");
        console.log(`Found ${users.length} users (excluding current admin)`);
        res.status(200).json({success:true,users});
    }
    catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({success:false,message:error.message || "Internal server error"});
    }
}


const deleteUser=async(req,res)=>{
    try {
        const {username}=req.params;
        const user=await User.findOne({username});
        if(!user){
            return res.status(400).json({success:false,message:"User not found"});
        }
        await User.deleteOne({username});
        res.status(200).json({success:true,message:"User deleted successfully"});
    }
    catch (error) {
        res.status(500).json({success:false,message:error.message || "Internal server error"});
    }
};

const makeAdmin=async(req,res)=>{
    try {
        const {username}=req.params;
        const user=await User.findOne({username});
        if(!user){
            return res.status(400).json({success:false,message:"User not found"});
        }
        user.isAdmin=true;
        await user.save();
        res.status(200).json({success:true,message:"User made admin successfully"});
    }
    catch (error) {
        res.status(500).json({success:false,message:error.message || "Internal server error"});
    }
};

export { getAllUsers, deleteUser, makeAdmin };

