import User from "../Schema/userSchema.js";
const isLogin=async(req,res,next)=>{
    try {
        const token=req.cookies.jwt || req.headers.authorization.split(";").find(cookie=>cookie.trim().startsWith("jwt="))?.split("=")[1];
        if(!token){
            return res.status(401).send({success:false,message:"Unauthorized"});
        }
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        if(!decoded){
            return res.status(401).send({success:false,message:"Unauthorized"});
        }
        const user=await User.findById(decoded.userId).select("-password");
        if (!user){
            return res.status(401).send({success:false,message:"user not found"});
        }
        req.user=user;
        next();
    }
    catch (error) {
        res.status(500).send({success:false,message:error});
        console.log("isLogin middleware error : ",error);
    }
}

export default isLogin ;