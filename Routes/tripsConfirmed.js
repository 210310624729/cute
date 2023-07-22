// Contains routes that handle after the trip is confirmed by customer

const express = require('express');
const Trip = require('../Models/Trip');
const { authenticateRequest, isCustomer , isDriver} = require('../Utils/Middleware/auth');
const { validateCreateTrip } = require('../Utils/Validators/ConfirmedTrip');
const CustomerInfo = require('../Models/Roles/CustomerInfo');
const DriverInfo = require('../Models/Roles/DriverInfo')
const { getServiceArea } = require('../Utils/Helpers/serviceAreas');
const {io} = require('../Config/websockets')
const otpGen = require('otp-generator')
const haversine = require('haversine-distance');
const ServiceAreas = require('../Models/ServiceAreas');

const permittedDistance = 100 // 100m radius error permitted between drop and current driver location.

const router = express.Router()

router.post('/newtrip' , authenticateRequest , validateCreateTrip , isCustomer ,async (req , res , next)=>{
    try{
        // validated required parameters are present and service area is present
        const customer = await CustomerInfo.findById(req.user.roleId)
        if(customer.cancellationPenalty.installment1 !== 0){
            req.body.price += customer.cancellationPenalty.installment1
            customer.cancellationPenalty.installment1 = customer.cancellationPenalty.installment2
            customer.cancellationPenalty.installment2 = customer.cancellationPenalty.installment3
            customer.cancellationPenalty.installment3 = 0
        }
        // Validate that there is no trip under the customer that has not been completed.
        const pendingTrip = await Trip.findOne({
            customerId : req.user.roleId,
            $and : [
                {status : {$ne : 'COMPLETED'}},
                {status : {$ne : 'CANCELLED'}}
            ]
            
        })
        const serviceArea = await ServiceAreas.findById(req.body.serviceAreaId)
        if(!serviceArea.isActive) return res.status(403).json({err : "Your area is currently not serviceable"})
        if(pendingTrip) return res.status(409).json({err : "You already have one ongoing trip"})
        req.body.customerId = customer._id
        req.body.status = "WAITING FOR DRIVER"
        const newTrip = await Trip.create(req.body)
        customer.tripsBooked.push(newTrip._id)
        await customer.save()
        res.status(200).json({msg : "Trip has been created. Start websocket" , trip : newTrip})
    }catch(err){
        next(err)
    }
})

router.patch('/:trip_id/cancel' , authenticateRequest , isCustomer , async (req , res , next)=>{
    try{
        const trip = await Trip.findById(req.params.trip_id)
        if(!trip) return res.status(404).json({err : "The trip is not found"})
        console.log(trip.status)
        if((trip.status == 'WAITING FOR DRIVER' || trip.status == 'CONFIRMED') && trip.customerId.equals(req.user.roleId)){
            trip.status = 'CANCELLED'
            await trip.save();
            const customer = await CustomerInfo.findById(req.user.roleId);
            const existingPenalty = customer.cancellationPenalty.installment1 + customer.cancellationPenalty.installment2 + customer.cancellationPenalty.installment3
            const totalPenalty = existingPenalty + trip.price
            customer.cancellationPenalty.installment1 = totalPenalty/3
            customer.cancellationPenalty.installment2 = totalPenalty/3
            customer.cancellationPenalty.installment3 = totalPenalty/3
            
            await customer.save()
            // Inform driver trip cancelled
            return res.status(200).json({msg : "Your trip has been cancelled"})
        }else{
            return res.status(403).json({err : "You cant cancel the trip"})
        }
    }catch(err){
        console.log(err)
        next(err)
    }
})
//Get all trips in a driver's service area
router.get('/' ,authenticateRequest , isDriver ,  async (req , res , next)=>{
    try{
        // get the service area the driver is currently in
        const lat = req.query.lat
        const long  = req.query.long

        if(!lat || !long) return res.status(400).json({err : "Required params are missing"})

        location = {
            lat : lat,
            long : long
        }

        const serviceAreaId = await getServiceArea(location)

        if(!serviceAreaId) return res.status(200).json({msg : "No service area matches your location."})
        // Look for "WAITING FOR DRIVER" trips in that service area
        const trips = await Trip.find({status : 'WAITING FOR DRIVER' , serviceAreaId : serviceAreaId})
        return res.status(200).json({trips : trips , serviceAreaId : serviceAreaId})
    }catch(err){
        next(err)
    }
})

router.patch('/acceptTrip/:trip_id' , authenticateRequest ,isDriver , async (req , res , next)=>{
    try{
        const lat = req.query.lat
        const long = req.query.long
        if(!lat || !long) return res.status(400).json({err : "Please provide current location lat and long"})
        const tripId = req.params.trip_id;
        const trip = await Trip.findById(tripId);
        if(!trip) return res.status(404).json({err : "Trip not found"})
        if(trip.driverId || trip.status == 'CONFIRMED') return res.status(409).json({"err" : "The trip has already been accepted"})

        //Validate driver is not on another pendiing trip
        const pendingTrip = await Trip.findOne({
            customerId : req.user.roleId,
            $and : [
                {status : {$ne : 'COMPLETED'}},
                {status : {$ne : 'CANCELLED'}}
            ]
            
        })
        if(pendingTrip) return res.status(409).json({err : "You already have one ongoing trip"})

        //Validate driver belongs to that service area
        const driverInfo = await DriverInfo.findById(req.user.roleId);
        const serviceAreaId = await getServiceArea({lat , long})
        if(!driverInfo.serviceAreaId == serviceAreaId) return res.status(403).json({err : "You are not authorized to operate in this service area"})

        //All validations completed
        const otp = otpGen.generate(6, { upperCaseAlphabets: false, specialChars: false });
        trip.otp = otp
        trip.driverId = req.user.roleId;
        trip.status = 'CONFIRMED'
        await trip.save()

        
        
        driverInfo.tripsTaken.push(trip._id);
        await driverInfo.save();

        
        //generating subtrips
        subtrips = [
            {
                start : {
                    lat : lat,
                    long : long
                },

                end : {
                    lat : trip.pickup.lat,
                    long : trip.pickup.long
                },
                status : 'STARTED'
            },
            {
                start : {
                    lat : trip.pickup.lat,
                    long : trip.pickup.long
                },

                end : {
                    lat : trip.drop.lat,
                    long : trip.drop.long
                },
                status : 'PENDING'
            }
        ]

        //inform customer that trip has been confirmed.
        const dispatchData = {
            driver : req.user,
            msg : "Your trip has been confirmed",
            tripOTP : otp
        }
        io.to(trip.customerSocket).emit('tripStatus' , dispatchData)
        io.to(trip.customerSocket).emit('driverLocation' , {lat , long})

        subtrips.forEach(eachTrip=>{
            trip.subTrips.push(eachTrip)
        })
        await trip.save()

        return res.status(200).json({msg : "The trip has been assigned. Start web socket connection" , trip : trip})
    }catch(err){
        console.log(err)
        next(err)
    }
})

// called by driver when he reaches the pickup location
router.patch('/:trip_id/driveratpickup' , authenticateRequest , isDriver , async (req , res , next)=>{
    try{
        const trip = await Trip.findById(req.params.trip_id)
        io.to(trip.customerSocket).emit('driverAtPickup' , "Your driver has reached the pickup location.")
        return res.status(200).json({msg : "The customer has been informed"})
    }catch(err){
        next(err)
    }
})

//called by driver after taking otp from the customer
router.patch('/:trip_id/start' , authenticateRequest , isDriver , async (req , res , next)=>{
    try{
        const {otp} = req.body
        if(!otp) return res.status(400).json({err : "Enter OTP to start ride"})
        const trip = await Trip.findById(req.params.trip_id);
        if(!trip) return res.status(404).json({err : "Trip not found"})
        if(trip.otp !== otp) return res.status(401).json({err : "Trip OTP is incorrect" , errCode : 21})
        trip.status = "STARTED";
        trip.subTrips[0].status = "COMPLETED"
        trip.subTrips[1].status = "STARTED"
        await trip.save()
        io.to(trip.customerSocket).emit("tripStarted" , "Your trip has started")
        return res.status(200).json({msg : "Your trip has started"})
    }catch(err){
        next(err)
    }
})

/*
    Trip Completed

    Logic : If the driver's location is within 100 m radius from drop location, Trip is completed.
    If due to some error, driver's location is not accurate, then customer has to send a request to complete the trip
*/

//Driver calls
router.patch('/:trip_id/complete/driver' , authenticateRequest , isDriver , async (req , res , next)=>{
    try{
        const {lat , long} = req.query
        if(!lat || !long) return res.status(400).json({err : "Provide current latitude and longitude"})
        const trip = await Trip.findById(req.params.trip_id);
        if(!trip) return res.status(404).json({err : "Trip not found"})

        // Check if location is within 100m from drop.
        const distance = haversine(
            {latitude : lat , longitude : long},
            {latitude : trip.drop.lat , longitude : trip.drop.long}
        )

        if(distance > permittedDistance){
            io.to(trip.customerSocket).emit('confirmTripClose' , "Confirm that your trip has ended")
            return res.status(405).json({err : "You are too far from the drop location. If you are at the drop location ask the customer to end the trip"})
        }

        trip.status = "COMPLETED"
        trip.subTrips[1].status = "COMPLETED"
        await trip.save()
        io.to(trip.customerSocket).emit("tripCompleted" , "Your trip has completed. Pay the driver now")
        return res.status(200).json({msg : "Trip has completed. You can collect the money now"})

    }catch(err){
        next(err)
    }
})

//Close trip by customer if failed by driver
router.patch('/:trip_id/complete/customer' , authenticateRequest , isCustomer , async (req , res, next)=>{
    try{
        const trip = await Trip.findById(req.params.trip_id);
        if(!trip) return res.status(404).json({err : "Trip not found"})
        trip.status = "COMPLETED"
        trip.subTrips[1].status = "COMPLETED"
        await trip.save()
        io.to(trip.driverSocket).emit("tripCompleted" , "Your trip has completed. Collect the money now")
        return res.status(200).json({msg : "Trip has completed. Please pay the driver"})
    }catch(err){
        next(err)
    }

})





module.exports = router


