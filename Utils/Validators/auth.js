const User = require('../../Models/Users')
module.exports.validateSignup = async (req , res , next)=>{
    try{
        let {username , password , roleType , phoneNum, address} = req.body
      
        if(!username || !password || !roleType || ! phoneNum || !address) return res.status(400).json({err : "required fields missing"})
        // Check if phone number is taken
        const existingUser = await User.find({phoneNum : phoneNum})
        if(!(existingUser.length == 0)) return res.status(409).json({err : "Phone number is already taken"})
        // Convert role into uppercase
        req.body.roleType = roleType.toUpperCase()
        if(!req.body.roleType == "CUSTOMER" || !req.body.roleType == "DRIVER" || !req.body.roleType == "ADMIN") return res.status(400).json({err : "Role not supported"})
        next()
    }catch(err){
        next(err)
    }
}