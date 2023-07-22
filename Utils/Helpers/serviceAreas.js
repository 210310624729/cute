const haversine = require('haversine-distance')
const ServiceAreas = require('../../Models/ServiceAreas')
const axios = require('axios')

module.exports.getServiceArea = async (location)=>{
    // logic used is if current location and center of every service area's distance is lesser
    // than the radius of the service area, it is present in that particular service 
    // While creating a service area, We ensured no 2 service areas overlap.
    // Thus a location can belong to only one service area
    
    return new Promise(async (resolve , reject)=>{
        try{
            const serviceAreas = await ServiceAreas.find({isActive : true})
            serviceAreas.forEach(area=>{
                distance =  haversine(
                    {latitude : location.lat , longitude : location.long},
                    {latitude : area.center.lat , longitude : area.center.long}
                )
                if(distance/1000 < area.radius){
                    resolve(area._id)
                }
            })
            // No service areas found
            resolve(undefined)
        }catch(err){
            reject(err)
        }
    })
}

https://www.mapquestapi.com/directions/v2/route?key=KEY&from=12.916926175985669%2C77.62986680547915&to=12.933830924827266%2C77.69155525992399&outFormat=json&ambiguities=ignore&routeType=fastest&doReverseGeocode=false&enhancedNarrative=false&avoidTimedConditions=false
module.exports.getTravelDistance = async (to , from)=>{
    return new Promise(async (resolve , reject)=>{
        try{
            const key = process.env.MAPQUEST_API
            url = `https://www.mapquestapi.com/directions/v2/route?key=${key}&from=${from.lat}%2C${from.long}&to=${to.lat}%2C${to.long}&outFormat=json&ambiguities=ignore&routeType=fastest&doReverseGeocode=false&enhancedNarrative=false&avoidTimedConditions=false`
            const res = await axios.get(url)
            resolve(res.data.route.distance * 1.609) // miles to km
        }catch(err){
            reject(err)
        }
    })
}

