const express = require('express')
const CustomerInfo = require('../Models/Roles/CustomerInfo')
const DriverInfo = require('../Models/Roles/DriverInfo')
const ServiceAreas = require('../Models/ServiceAreas')
const { getServiceArea, getTravelDistance } = require('../Utils/Helpers/serviceAreas')
const { authenticateRequest , isCustomer} = require('../Utils/Middleware/auth')
const router = express()

//All trips taken by user
router.get('/' , authenticateRequest , async (req , res, next)=>{
    try{
        if(req.user.roleType == "DRIVER"){
            const driver = await DriverInfo.findById(req.user.roleId).populate('tripsTaken').exec();
            return res.status(200).json({trips : driver.tripsTaken})

        }else if(req.user.roleType == "CUSTOMER"){
            const customer = await CustomerInfo.findById(req.user.roleId).populate('tripsBooked').exec();
            return res.status(200).json({trips : customer.tripsBooked})
        }else{
            return res.status(403).json({err : "You must be either a customer or a driver"})
        }
    }catch(err){
        next(err)
    }
})

router.get('/newtrip' , authenticateRequest , isCustomer , async (req , res , next)=>{
    const {pickupLat , pickupLong , dropLat , dropLong} = req.query
    if(!pickupLat , !pickupLong , !dropLat , !dropLong) return res.status(200).json({err : "Provide pickup and drop locations"})
    const pickServiceAreaId = await getServiceArea({lat : pickupLat , long: pickupLong})
    const dropServiceAreaId = await getServiceArea({lat : dropLat , long : dropLong})
    console.log(dropServiceAreaId , pickServiceAreaId)
    if(!pickServiceAreaId || !dropServiceAreaId || !pickServiceAreaId.equals(dropServiceAreaId)) return res.status(403).json({err : "Trip not serviceable"})
    const distance = await getTravelDistance({lat : pickupLat , long : pickupLong} , {lat : dropLat , long : dropLong})
    //Get service area and all vehicles.
    const serviceArea = await ServiceAreas.findById(dropServiceAreaId).populate('vehicles').exec()
    if(!serviceArea.isActive) return res.status(403).json({err : "Your area is not being serviced currently"})
    //Get customer info
    const customer = await CustomerInfo.findById(req.user.roleId);
    const output = {
        vehicles : [],
        distance
    };
    serviceArea.vehicles.forEach(vehicle=>{
        if(vehicle.isActive){
            output.vehicles.push({price : distance * vehicle.price , name : vehicle.name , id : vehicle._id , pricePerKm : vehicle.price, ServiceAreaId : dropServiceAreaId})
        }
    })

    if(customer.cancellationPenalty > 0){
        output.cancellationPenalty = customer.cancellationPenalty/3;
    }

    return res.status(200).json(output)
})


module.exports = router