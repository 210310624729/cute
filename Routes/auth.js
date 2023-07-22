const express = require('express')
const jwt = require('jsonwebtoken')
const otpGen = require('otp-generator')
const User = require('../Models/Users')
const validator = require('../Utils/Validators/auth')
const {authenticateRequest} = require('../Utils/Middleware/auth')
const bcrypt = require('bcryptjs')
const CustomerInfo = require('../Models/Roles/CustomerInfo')
const AdminInfo = require('../Models/Roles/Admin')
const DriverInfo = require('../Models/Roles/DriverInfo')
const { sendEmail } = require('../Utils/Helpers/communication')
const RefreshToken = require('../Models/RefreshToken')
const {getServiceArea} = require('../Utils/Helpers/serviceAreas')
const ServiceAreas = require('../Models/ServiceAreas')
const Admin = require('../Models/Roles/Admin')
const Users = require('../Models/Users')
const router= express.Router()

//Under 401 unauthorized
// -OTP incorrect error code = 11
// -OTP expired error code = 12
// Accesstoken not provided (not logged in) error code = 1
// AccessToken expired error code = 2
const otpExpiryTime = 300000 // 5 minutes in ms
const accessTokenExpiryTime = 60 * 20 // 20 minutes in seconds

router.post('/auth/signup' , validator.validateSignup ,async (req , res,next)=>{
    try{

        console.log(req.body.roleType);
         //Validated : Email does not exist, all required fields are passed

        //generate OTP
        // const otp = otpGen.generate(6, { upperCaseAlphabets: false, specialChars: false });
        // req.body.otp = {}
        // req.body.otp.val = otp
        // req.body.otp.expiresAt = Date.now() + otpExpiryTime // 5 minutes

        //hashing the password
        const salt = bcrypt.genSaltSync(10);
        req.body.password = bcrypt.hashSync(req.body.password, salt);
        const newUser = await User.create(req.body)

        //sending mail
        // email_msg = {
        //     to: newUser.email,
        //     from: process.env.EMAIL_SENDER, // Use the email address or domain you verified above
        //     subject: 'OTP to verify email',
        //     text: 'and easy to do anywhere, even with Node.js',
        //     html: `<strong>Your OTP to verify email is ${otp}</strong>`,
        // }
        // await sendEmail(email_msg)
        return res.status(200).json({user_id : newUser._id , msg : "Signup completed"})

    }catch(err){
        console.log(err);
        next(err)
    }
})


router.post('/signup/verify' , async (req , res , next)=>{
    try{
        const {user_id} = req.body
        const user = await Users.findById(user_id)
        const name = user.username
        const chekVerify = await Admin.findOne({userID:user_id})
        if(chekVerify){
            return res.send('Already Verify')
        }
        if(!user_id) return res.status(400).json({err : "Required fields missing"})
        const foundUser = await User.findById(user_id)
        if(!foundUser) return res.status(404).json({err : "User with user id not found"})
        // Verify OTP

        // if(otp !== foundUser.otp.val) return res.status(401).json({err : "OTP is incorrect" , errCode : 11})
        // if(Date.now() > Date.parse(foundUser.otp.expiresAt)) return res.status(401).json({err : "OTP has expired" , errCode : 12})

        //OTP verified
        
        // Create roles
        switch (foundUser.roleType) {
            case "CUSTOMER":
                const customerInfo = await CustomerInfo.create({data : "dummy data"})
                foundUser.roleId = customerInfo._id
                await foundUser.save()
                break;
            case "DRIVER":
                const {lat , long} = req.query
                const {licenseNum} = req.body;
                if(!licenseNum) return res.status(400).json({err : "Provide license number"})
                if(!lat || !long) return res.status(400).json({err : "Provide current location"})
                const serviceAreaId = await getServiceArea({lat , long})
                if(!serviceAreaId) return res.status(404).json({err : "Your area is not supported."})
                const driverInfo = await DriverInfo.create({serviceAreaId : serviceAreaId , licenseNum : licenseNum})
                const serviceArea = await ServiceAreas.findById(serviceAreaId)
                console.log(serviceArea)
                serviceArea.drivers.push(driverInfo._id)
                foundUser.roleId = driverInfo._id
                await serviceArea.save()
                await foundUser.save()
                break;
            case "ADMIN":
                const adminInfo = await AdminInfo.create({
                    userID:user_id,
                    userName:name
                })
                foundUser.roleId = adminInfo._id
                await foundUser.save()
                break
            default:
                break;
        }

        // foundUser.otp.val = null;
        // foundUser.otp.expiresAt = null;
        foundUser.isVerified = true;
        await foundUser.save()


        res.status(200).json({msg : "User verified, please login"})
    }catch(err){
        next(err)
    }
})

// router.post('/signup/resendotp' , async (req , res , next)=>{
//     try{
//         const {user_id}  = req.body;
//         if(!user_id) return res.status(400).json({err : "Credentials missing"})
//         const otp = otpGen.generate(6, { upperCaseAlphabets: false, specialChars: false });

//         const user = await User.findById(user_id)
//         if(!user) return res.status(404).json({err : "User not found"})
//         user.otp.val = otp;
//         user.otp.expiresAt = Date.now() + otpExpiryTime;
//         await user.save()
//         email_msg = {
//             to: user.email,
//             from: process.env.EMAIL_SENDER, // Use the email address or domain you verified using sendgrid
//             subject: 'OTP to verify email',
//             text: 'and easy to do anywhere, even with Node.js',
//             html: `<strong>Your OTP to verify email is ${otp}</strong>`,
//         }
//         await sendEmail(email_msg)
//         res.status(200).json({msg : "OTP sent"})
//     }catch(err){
//         next(err)
//     }
// })

router.post('/login/admin' , async(req , res , next)=>{
    try{
        const {phoneNum , password} = req.body
        if(!phoneNum || !password) return res.status(400).json({err : "Phone number/password missing"})
        if(phoneNum != process.env.MAIN_ADMIN_NUM || password!== process.env.MAIN_ADMIN_PASS) return res.status(403).json({err : "Phone number or password is incorrect"})
        const accessToken = jwt.sign({phoneNum : phoneNum} , process.env.ACCESS_TOKEN_SECRET , {expiresIn :accessTokenExpiryTime})
        const refreshToken = jwt.sign({phoneNum : phoneNum}, process.env.REFRESH_TOKEN_SECRET)

        //setting refresh token in db
        await RefreshToken.create({token : refreshToken})
       /* res.status(200).json({
            tokens : {
                access : accessToken,
                refresh : refreshToken
            },
            msg : "Logged in successfully"
        })*/
        res.render("subadminwelcome");
    }catch(err){
        next(err)
    }
})

router.get('/loginpage',async(req,res)=>{
    return res.render('login')
})

router.get('/signuppage',async(req,res)=>{
    return res.render('signup')
})

router.post('/login' , async (req , res , next)=>{
    try{
        const {phoneNum , password} = req.body;
        if(!phoneNum || !password) return res.status(400).json({err : "Credentials missing"});
        const user = await User.findOne({phoneNum : phoneNum});
        if(!user) return res.status(404).json({err : "User not found"});
        if(!bcrypt.compareSync(password , user.password)) return res.status(403).json({err : "passwords dont match"})
        const accessToken = jwt.sign({user_id : user._id} , process.env.ACCESS_TOKEN_SECRET , {expiresIn :accessTokenExpiryTime})
        const refreshToken = jwt.sign({user_id : user._id }, process.env.REFRESH_TOKEN_SECRET)

        //setting refresh token in db
        await RefreshToken.create({token : refreshToken})     
        user.password=undefined;
        res.status(200).json({
            tokens : {
                access : accessToken,
                refresh : refreshToken
            },
            user : user,
            msg : "Logged in successfully"
        })
    }catch(err){
        next(err)
    }
})

router.post('/auth/login-web' , async (req , res , next)=>{
    try{
        const {phoneNum , password} = req.body;

        if(!phoneNum || !password) return res.status(400).json({err : "Credentials missing"});
        const user = await User.findOne({phoneNum : phoneNum});
        if(!user) return res.status(404).json({err : "User not found"});
        if(!bcrypt.compareSync(password , user.password)) return res.status(403).json({err : "passwords dont match"})
        const accessToken = jwt.sign({user_id : user._id} , process.env.ACCESS_TOKEN_SECRET , {expiresIn :accessTokenExpiryTime})
        const refreshToken = jwt.sign({user_id : user._id }, process.env.REFRESH_TOKEN_SECRET)

        //setting refresh token in db
        await RefreshToken.create({token : refreshToken})     
        user.password=undefined;

        res.render('dashboard', {
      tokens: {
        access: accessToken,
        refresh: refreshToken
      },
      user: user,
      msg: "Logged in successfully"
    });
    }catch(err){
        next(err)
    }
})


router.post('/delete', async (req, res, next) => {
    try {
      const email = req.body.username;
      const password = req.body.password;
  
      if (!email || !password) {
        return res.status(400).json({ err: "Credentials missing" });
      }
  
      const user = await User.findOne({ username: email });
      if (!user) {
        return res.status(404).json({ err: "User not found" });
      }
  
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(403).json({ err: "Passwords don't match" });
      }
  
      // If all checks pass, delete the user
      await User.deleteOne({ username: email });
  
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
      next(err);
    }
  });
  

router.get('/newToken' , async (req ,res , next)=>{
    try{
        if(!req.headers.authorization) return res.status(400).json("Provide refresh token in authorization header")
        const authHeader = req.headers.authorization
        const token = authHeader.substring(7, authHeader.length);
        const dbToken = await RefreshToken.findOne({token : token})
        if(!dbToken) return res.status(401).json({err : "You are logged out. Please login"})
        //decode token to get user_id
        const tokenData = jwt.verify(token , process.env.REFRESH_TOKEN_SECRET)
        const user_id = tokenData.user_id;
        const phoneNum = tokenData.phoneNum;

        //generating new access token
        let accessToken = {}
        if(user_id){
            accessToken = jwt.sign(
                {
                    user_id : user_id
                },
                process.env.ACCESS_TOKEN_SECRET,
                {
                    expiresIn : accessTokenExpiryTime
                }
            )
        }else if(phoneNum){
            accessToken = jwt.sign({phoneNum : phoneNum} , process.env.ACCESS_TOKEN_SECRET , {expiresIn :accessTokenExpiryTime})
        }
        return res.status(200).json({token : accessToken})
    }catch(err){
        next(err)
    }
})

router.get('/logout' , async (req , res , next)=>{
    try{
        if(!req.headers.authorization) return res.status(400).json("Provide refresh token in authorization header")
        const authHeader = req.headers.authorization
        const token = authHeader.substring(7, authHeader.length);
        const dbToken = await RefreshToken.findOne({token : token})
        if(!dbToken) return res.status(400).json({err : "You are already logged out"})
        await RefreshToken.deleteOne({token : token})
        res.status(200).json({msg : "Logged out successfully. Clear stored tokens"})
    }catch(err){
        next(err)
    }
})

//return the logged in user details along with info db details
router.get('/' , authenticateRequest , async (req , res , next)=>{
    try{
        req.user.password = undefined
        const roleType = req.user.roleType
        switch(roleType){
            case 'CUSTOMER':
                const customer = await CustomerInfo.findById(req.user.roleId)
                return res.status(200).json({user : req.user , user_info : customer});
                break;
            case 'DRIVER':
                const driver = await DriverInfo.findById(req.user.roleId)
                return res.status(200).json({user : req.user , user_info : driver});
                break;
            case 'ADMIN':
                const admin = await AdminInfo.findById(req.user.roleId)
                return res.status(200).json({user : req.user , user_info : admin});
                break;
        }
    }catch(err){
        next(err)
    }
})

//Update User Info
router.put('/update' , authenticateRequest , async (req , res , next)=>{
    try{
        
        if(req.body.roleType || req.body.roleId || req.body.phoneNum || req.body.password)
        {
            return  res.status(500).json({msg:"These Fields cannot be updated"});
        }
        await User.findByIdAndUpdate( req.user._id, req.body); 
        return res.status(200).json({msg:"User Information Updated Successfully"});
        
    }
    catch(err){
        next(err)
    }
})

//Deactivating User
router.patch("/deactivate", authenticateRequest, async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      user.isActive = false;
      await user.save();
      return res.status(200).json({ msg: "User Deactivated Successfully" });
    } catch (err) {
      next(err);
    }
  });


  
// Reactivate User(only Customer and Driver)
router.patch('/reactivate' , async (req , res , next)=>{
    try{
        const {phoneNum , password} = req.body;
        if(!phoneNum || !password) return res.status(400).json({err : "Credentials missing"});
        const user = await User.findOne({phoneNum : phoneNum});
        if(!user) return res.status(404).json({err : "User not found"});
        
        if(!bcrypt.compareSync(password , user.password)) return res.status(403).json({err : "passwords dont match"})
        const accessToken = jwt.sign({user_id : user._id} , process.env.ACCESS_TOKEN_SECRET , {expiresIn :accessTokenExpiryTime})
        const refreshToken = jwt.sign({user_id : user._id }, process.env.REFRESH_TOKEN_SECRET)

        //setting refresh token in db
        await RefreshToken.create({token : refreshToken})
        
            user.isActive=true;
         

        
        await user.save();
        
        res.status(200).json({
            tokens : {
                access : accessToken,
                refresh : refreshToken
            },
            msg : "Account Reactivated successfully"
        })
    }catch(err){
        next(err)
    }
})



module.exports = router
