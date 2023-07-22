const haversine= require('haversine-distance')
const ServiceAreas= require('../../Models/ServiceAreas')

function areasOverlap(area1 , area2){
    // Logic used: If the the distance between centers of 2 service areas is greater than the sum of both radi,
    // then the circles dont overlap
    rad1 = area1.radius
    rad2 = area2.radius
    radSum = rad1 + rad2
    centerDifference = haversine(
        {latitude : area1.center.lat , longitude : area1.center.long},
        {latitude : area2.center.lat , longitude : area2.center.long}
        )
    if(centerDifference/1000 > radSum){
        return false
    }else{
        return true
    }
}
module.exports.validateCreateServiceArea = async (req , res , next)=>{
    try{
        // Validate that required params are present.
        const {center , radius} = req.body
        if(!center || !center.lat || !center.long || !radius) return res.status(400).json({err : "Required params missing"})

        //validate service area does not overlap
        newArea = {
            center,
            radius
        }
        const existingAreas = await ServiceAreas.find({})
        existingAreas.forEach(area=>{
            if(areasOverlap(area , newArea)){
                return res.status(409).json({err : `Area is overlapping with area_id(${area._id})`})
            }
        })
        next()
    }catch(err){
        console.log(err)
        next(err)
    }
}