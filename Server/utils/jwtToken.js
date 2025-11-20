import jwt from "jsonwebtoken";

const jwtToken=(userId,res)=>{
    const token=jwt.sign({userId},process.env.JWT_SECRET,{expiresIn:"1d"});


    res.cookie("jwt",token,{httpOnly:true,secure:true,maxAge:30*24*60*60*1000,path:'/'})
return token;
};

export default jwtToken;