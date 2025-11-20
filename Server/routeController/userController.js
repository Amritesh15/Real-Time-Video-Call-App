

const getAllUsers = async(req,res)=>{

    const currentUserID = res.user?._conditions?._id;
    if (!currentUserID){
        return res.status(401).json({success:false,message:"Unauthorized"});
    }
    try {
        const users=await User.find({_id:{$ne:currentUserID}},"profilepicture username email");
        res.status(200).json({success:true,users});
    }
    catch (error) {
        res.status(500).json({success:false,message:error});
    }
}

export default getAllUsers; 

