const ServiceAreas = require("../../Models/ServiceAreas")


module.exports.validateCreateTrip = async (req , res , next)=>{
    try{
        const {pickup , drop , price , serviceAreaId, vehicleId} = req.body

        if(!pickup || !drop || !pickup.lat || !pickup.long || !drop.lat || !drop.long) return res.status(400).json({err : "Pickup Drop not specified"})
        if(! price || ! serviceAreaId ||!vehicleId) return res.status(400).json({err : "Required credentials missing"})
        const serviceArea = await ServiceAreas.findById(serviceAreaId)
        var isInArray = serviceArea.vehicles.some(function (vehicle) {
            return vehicle.equals(vehicleId);
        });
        if(!isInArray) return res.status(404).json({err : "Vehicle not supported"})
        if(!serviceArea) return res.status(404).json({err : "Specified service area not found"})
        //It is expected that the client ensures pickup and drop are within the service area
        next()
    }
    catch(err){
        next(err)
    }
}