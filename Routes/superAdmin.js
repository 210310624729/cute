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
const router= express.Router()

router.get('/login-web',async(req,res)=>{
    return res.render('superAdminLogin')
})

router.post('/login' , async (req , res, next)=>{
    try{ 
        const userName='superadmintest@magicstep.com' // to do add username in env file 
        const password='11111111' // to do add password in env file 

        const user=req.body.userName
        const pass = req.body.password

        if(user != userName || pass != password){
            res.send('invalid input')
        }

      const token = jwt.sign({ username: user }, 'secret_key');

      // Return the token as a response
      res.json({ 
        msg:'logged in success',
        token: token
     });
        
    }catch(err){
        next(err)
    }
})



module.exports = router