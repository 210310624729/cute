const express = require('express')
const jwt = require('jsonwebtoken')
const Admin = require('../Models/Roles/Admin')
const Users = require('../Models/Users')
const ServiceAreas = require('../Models/ServiceAreas')
const { authenticateAdmin } = require('../Utils/Middleware/auth')
const router = express.Router()

router.get('/admins' , authenticateAdmin , async (req , res, next)=>{
    try{
        const admins = await Users.find({
            roleType : "ADMIN"
        }).populate('roleId').exec()

        return res.status(200).json({admins : admins})
    }catch(err){
        next(err)
    }
})

router.patch('/:admin_id/verify' , authenticateAdmin , async (req , res , next)=>{
    try{
        const adminInfo = await Admin.findById(req.params.admin_id);
        if(!adminInfo) return res.status(404).json({err : "Admin not found"})
        if(adminInfo.serviceAreas.length > 0){
            let serviceArea = await ServiceAreas.findById(adminInfo.serviceAreas[0])
            serviceArea.isActive = true;
            await serviceArea.save()
        }
        adminInfo.isVerified = true;
        await adminInfo.save()
        return res.status(200).json({msg : "Admin has been verified"})
    }catch(err){
        next(err)
    }
})

router.patch('/:admin_id/unverify' , authenticateAdmin , async (req , res , next)=>{
    try{
        const adminInfo = await Admin.findById(req.params.admin_id);
        if(!adminInfo) return res.status(404).json({err : "Admin not found"})
        adminInfo.isVerified = false;
        const area_id = adminInfo.serviceAreas[0]
        const serviceArea = await ServiceAreas.findById(area_id)
        serviceArea.isActive = false;
        await serviceArea.save();
        await adminInfo.save();
        return res.status(200).json({msg : "Admin has been unverified"})
    }catch(err){
        next(err)
    }
})


router.get('/login-web',async(req,res)=>{
    return res.render('superAdminLogin')
})

router.post('/login' , async (req , res, next)=>{
    try{ 
        console.log("hi");
        const userName='superadmintest@magicstep.com' // to do add username in env file 
        const password='11111111' // to do add password in env file 

        const user=req.body.userName
        const pass = req.body.password

        if(user != userName || pass != password){
            res.send('invalid input')
        }

      const token = jwt.sign({ username: user }, 'secret_key');

      // Return the token as a response
    //   res.json({ 
    //     msg:'logged in success',
    //     token: token
    //  });

    return res.redirect('/mainadmin/dashboard')
        
    }catch(err){
        next(err)
    }
})


router.get('/dashboard',async(req,res)=>{

    const admin = await Admin.find({isVerified: false})
    // const user = await Users.find({roleType:"ADMIN"})

    // console.log(admin);
    // console.log(user);

    return res.render('dashboard',{
        admin,
    })
    // res.send(user)
})

router.get('/status/:status/:adminId',async(req,res)=>{
    const {adminId, status}=req.params
    // console.log(adminId);
    // console.log(status);
    const admin = await Admin.findOne({userID:adminId})
    
    if(status === 'accept'){
        
        console.log(admin);
        admin.isVerified = true; // Set isVerified to true if status is 'accept'
        await admin.save(); // Save the updated admin document
        return res.redirect('back')
    }else if (status === 'reject') {
        console.log(status);
        await Admin.deleteOne({ userID: adminId });
        return res.redirect('back');
    }
    // console.log(admin);
})


router.get('/activepage',async(req,res)=>{
    const admin = await Admin.find({isVerified: true})
  return res.render('active',{
    admin
  })  
})


module.exports = router