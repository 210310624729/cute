// contains all the routes which handle admin operations.

const express = require('express')
const DriverInfo = require('../Models/Roles/DriverInfo')
const ServiceAreas = require('../Models/ServiceAreas')
const { authenticateRequest, isAdmin } = require('../Utils/Middleware/auth')
const router = express.Router()
const Vehicles = require('../Models/Vehicles')

router.get('/:serviceArea_id/getdrivers' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
        const serviceArea = await ServiceAreas.findById(req.params.serviceArea_id).populate('drivers').exec()
        if(!serviceArea) return res.status(404).json({err : "The service area was not found"});
        if (! serviceArea.ownerAdmin == req.user.roleId) return res.status(403).json({err : "You are not authorized to do this operation"})
        return res.status(200).json({drivers : serviceArea.drivers})
    }catch(err){
        next(err)
    }
})

router.patch('/:driver_id/verify' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
        const {action} = req.query;
        if(!action) return res.status(400).json({err : "Missing action"})
        const driver = await DriverInfo.findById(req.params.driver_id);
        if(!driver) return res.status(404).json({err : "Driver not found"})
        switch(action){
            case 'VERIFY':
                driver.isVerified = true;
                break;
            case 'REJECT':
                driver.isRejected = true;
                break;
        }
        await driver.save()
        return res.status(200).json({msg : `Driver has been ${action}.`})
    }catch(err){
        next(err)
    }
})

router.patch('/:driver_id/ban' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
        const driver = await DriverInfo.findById(req.params.driver_id);
        if(!driver) return res.status(404).json({err : "Driver not found"})
        driver.isBanned = true;
        driver.isVerified = false;
        await driver.save()
        return res.status(200).json({msg : `Driver has been banned.`})
    }catch(err){
        next(err)
    }
})

router.patch('/:driver_id/removeban' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
        const driver = await DriverInfo.findById(req.params.driver_id);
        if(!driver) return res.status(404).json({err : "Driver not found"})
        driver.isBanned = false;
        driver.isVerified = false; // must reverify driver after removing ban
        await driver.save()
        return res.status(200).json({msg : `Removed ban on driver`})
    }catch(err){
        next(err)
    }
})

// Creating vehicles
router.post('/:serviceArea_id/vehicle/' ,authenticateRequest , isAdmin , async (req,res , next)=>{
    try{
        const {price , name } = req.body;
        if(!price || !name) return res.status(400).json({err : "Requied credentials missing"})
        const serviceArea = await ServiceAreas.findById(req.params.serviceArea_id);
        if(!serviceArea) return res.status(404).json({err : "Service area is not found"})
        req.body.serviceArea = serviceArea._id
        const newVehicle = await Vehicles.create(req.body)
        serviceArea.vehicles.push(newVehicle._id);
        await serviceArea.save();
        return res.status(200).json({msg : "Vehicle has been added"})
    }catch(err){
        next(err)
    }
})

// Get Vehicle Info

router.get('/vehicle/:vehicle_id' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
        const vehicle = await Vehicles.findById(req.params.vehicle_id)
        if(!vehicle) return res.status(404).json({err : "Vehicle not found"})
        return res.status(200).json({vehicle : vehicle})
    }catch(err){
        next(err)
    }
})

// Updating Vehicle

router.put('/:serviceArea_id/vehicle/:vehicle_id' , authenticateRequest , isAdmin , async (req , res , next)=>{
    try{
       
        const vehicle = await Vehicles.findById(req.params.vehicle_id)
        if(!vehicle) return res.status(404).json({err : "Vehicle not found"});
        const serviceArea = await ServiceAreas.findById(req.params.serviceArea_id);
        if(!serviceArea) return res.status(404).json({err : "Service area is not found"})

        if(req.user.roleId.toString() !== serviceArea.ownerAdmin.toString())
        {
            return res.status(403).json({err : "You are not authorized to do this operation"});
        }

        await Vehicles.findByIdAndUpdate( req.params.vehicle_id, req.body); 
        res.status(200).json({msg : "The Vehicle Info has been updated"})

    }
    catch(err){
        next(err)
    }
})


// Deleting  vehicles

router.delete('/:serviceArea_id/vehicle/:vehicle_id' ,authenticateRequest , isAdmin , async (req,res , next)=>{
    try{
        const vehicle = await Vehicles.findById(req.params.vehicle_id);
        if(!vehicle) return res.status(404).json({err : "Vehicle not found"});
        const serviceArea = await ServiceAreas.findById(req.params.serviceArea_id);
        if(!serviceArea) return res.status(404).json({err : "Service area is not found"})

        if(req.user.roleId.toString() !== serviceArea.ownerAdmin.toString())
        {
            return res.status(403).json({err : "You are not authorized to do this operation"});
        }

        for(let i =0; i < serviceArea.vehicles.length ; i++){
            if(serviceArea.vehicles[i].toString() == req.params.vehicle_id){
                serviceArea.vehicles.splice(i , 1)
            }
        }
          
        await Vehicles.findOneAndDelete(req.params.vehicle_id);
        await serviceArea.save();
        return res.status(200).json({msg : "Vehicle has been deleted"})
    }
    catch(err){
        next(err)
    }
})

module.exports = router