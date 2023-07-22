const jwt = require('jsonwebtoken')
const Admin = require('../../Models/Roles/Admin')
const DriverInfo = require('../../Models/Roles/DriverInfo')
const User = require('../../Models/Users')

// ErrCode 21 under 401 means driver is not verified
module.exports.authenticateRequest = async (req, res ,next)=>{
     // Get the access token
     if(!req.headers.authorization) return res.status(401).json({err:"Access token not provided" , errCode:1})
     const authHeader = req.headers.authorization
     const token = authHeader.substring(7, authHeader.length);
        try{
            const tokenData = await jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
            try{
             const user = await User.findById(tokenData.user_id);
             if(!user) return res.status(404).json({err : "User not found"});
             req.user = user
             console.log(user)
             next()
            }catch(error){
             next(error)
            }  
        }catch(err){
            console.log("In token error")
            return res.status(401).json({err : "Token has expired" , errCode : 2})
        }
}

module.exports.authenticateAdmin = async (req , res , next)=>{
    if(!req.headers.authorization) return res.status(401).json({err:"Access token not provided" , errCode:1})
     const authHeader = req.headers.authorization
     const token = authHeader.substring(7, authHeader.length);
        try{
            const tokenData = await jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
            try{
             const user = tokenData.phoneNum
             console.log(tokenData)
             if(user != process.env.MAIN_ADMIN_NUM) return res.status(403).json({err : "You are not authorized"})
             req.user = user
             console.log(user)
             next()
            }catch(error){
             next(error)
            }  
        }catch(err){
            console.log("In token error")
            return res.status(401).json({err : "Token has expired" , errCode : 2})
        }
}
module.exports.isAdmin = async (req, res , next)=>{
    if(req.user.roleType == 'ADMIN' && req.user.isActive){
        const adminInfo = await Admin.findById(req.user.roleId)
        if(!adminInfo.isVerified) return res.status(403).json({err : "You have not yet been verified"})
        next()
    }else{
        res.status(403).json({err : "You must be an admin to perform this operation"})
    }
}

module.exports.isDriver = async (req , res , next)=>{
    try{
        if(req.user.roleType == 'DRIVER' && req.user.isActive){
            // check if driver is verified
            const driverInfo = await DriverInfo.findById(req.user.roleId)
            if(!driverInfo.isVerified) return res.status(401).json({err : "You need to be verified by admin to perform this operation." , errCode : 21})
            next()
        }else{
            res.status(403).json({err : "You must be a driver to perform this operation"})
        }
    }catch(err){
        next(err)
    }
}

module.exports.isCustomer = async (req, res , next)=>{
    if(req.user.roleType == 'CUSTOMER' && req.user.isActive){
        next()
    }else{
        res.status(403).json({err : "You must be a customer to perform this operation"})
    }
}