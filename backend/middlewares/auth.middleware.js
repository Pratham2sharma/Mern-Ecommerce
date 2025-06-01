import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
export const protectRoute = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            return res.status(401).json({ message: "Unauthorized - no access Token Provided" });
        }
        try {
            const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decoded.userId).select("-password");

            if (!user) {
                return res.status(401).json({ message: "User Not Found" });
            }

            req.user = user;
            next();
        }
        catch (error) {
            if (error.name === "tokenExpiredError") {
                return res.status(401).json({ message: "unauthorized - access Token expired" });
            }
            throw error;
        }
    }
    catch (error) {
        console.log("Error in protectRoute middleware", error.message);
        res.status(500).json({ message: "Unauthorized - Invalid access Token", error: error.message });
    }
    
}

export const adminRoute = async(req,res,next) => {
    if(req.user && req.user.role === "admin"){
        next();
    }
    else{
        return res.status(403).json({message: "Access Denied - Admin Only"});
    }
}