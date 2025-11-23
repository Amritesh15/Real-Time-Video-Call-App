import User from "../Schema/userSchema.js";

const getAllUsers = async(req,res)=>{
    try {
        const currentUserID = req.user?._id;
        if (!currentUserID){
            return res.status(401).json({success:false,message:"Unauthorized"});
        }
        const users = await User.find({_id:{$ne:currentUserID}}).select("profilePicture username email fullName");
        res.status(200).json({success:true,users});
    }
    catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({success:false,message:error.message || "Internal server error"});
    }
}

export default getAllUsers; 

