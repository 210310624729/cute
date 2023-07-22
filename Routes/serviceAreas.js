const express = require('express')
const {isAdmin , authenticateRequest} = require('../Utils/Middleware/auth')
const {validateCreateServiceArea , } = require('../Utils/Validators/serviceAreas')
const ServiceAreas = require('../Models/ServiceAreas')
const AdminInfo = require('../Models/Roles/Admin')

const router = express.Router()

router.post('/' ,authenticateRequest , isAdmin,validateCreateServiceArea , async(req, res , next)=>{
    try{
        //validated required params present and areas dont overlap
        //get admin role and add to created service areas
        const adminId = req.user.roleId;
        const admin = await AdminInfo.findById(adminId)
        if(admin.serviceAreas.length > 0) return res.status(409).json({err : "You can create a maximum of 1 service area"})
        const newServiceArea = await ServiceAreas.create(req.body)
        newServiceArea.ownerAdmin = admin._id
        admin.serviceAreas.push(newServiceArea._id)
        await admin.save()
        await newServiceArea.save()
        return res.status(200).json({msg : "Created service area" , serviceArea : newServiceArea})
    }catch(err){
        next(err)
    }
})
// Get all service area of particular admin
router.get('/' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
        const adminId = req.user.roleId;
        const admin = await AdminInfo.findById(adminId).populate('serviceAreas')
        return res.status(200).json({serviceAreas : admin.serviceAreas})
    }catch(err){
        next(err)
    }
})

router.get('/:area_id' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
        const serviceArea = await ServiceAreas.findById(req.params.area_id)
        if(!serviceArea) return res.status(404).json({err : "Service area not found"})
        return res.status(200).json({serviceArea : serviceArea})
    }catch(err){
        next(err)
    }
})

router.put('/:area_id' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
        //check if user is authorized (owns the service area)
        const adminId = req.user.roleId;
        const admin = await AdminInfo.findById(adminId)
        const serviceArea = await ServiceAreas.findById(req.params.area_id)
        if (! serviceArea.ownerAdmin == admin._id) return res.status(403).json({err : "You are not authorized to do this operation"})

        //User authorized
        await ServiceAreas.findByIdAndUpdate( req.params.area_id, req.body)
        res.status(200).json({msg : "The service area has been updated"})
    }catch(err){
        next(err)
    }
})

router.delete('/:area_id' , authenticateRequest , isAdmin , async(req , res , next)=>{
    try{
        //check if user is authorized (owns the service area)
        const adminId = req.user.roleId;
        const admin = await AdminInfo.findById(adminId)
        const serviceArea = await ServiceAreas.findById(req.params.area_id)
        if (! serviceArea.ownerAdmin == admin._id) return res.status(403).json({err : "You are not authorized to do this operation"})

        for(let i =0; i < admin.serviceAreas.length ; i++){
            if(admin.serviceAreas[i].toString() == req.params.area_id){
                admin.serviceAreas.splice(i , 1)
            }
        }
        await ServiceAreas.findOneAndDelete(req.params.area_id)
        await admin.save()
        res.status(200).json({msg : "The service area has been deleted"})
    }
    catch(err){
        next(err)
    }
})

module.exports = router