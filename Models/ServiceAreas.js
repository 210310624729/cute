const mongoose = require('mongoose')

const ServiceAreaSchema = new mongoose.Schema({
    center : {
        lat : {type : Number , required : true},
        long : {type : Number , required : true}
    },
    radius : Number, // in kilometerS
    isActive : {type : Boolean , default : true},
    //Add vehicle type ids
    ownerAdmin :  mongoose.Schema.Types.ObjectId,
    drivers : [{type : mongoose.Schema.Types.ObjectId , ref : 'driver_info'}],
    vehicles : [{type : mongoose.Schema.Types.ObjectId , ref : 'vehicle'}]
})

module.exports = mongoose.model('service_area' , ServiceAreaSchema)