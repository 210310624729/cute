const mongoose = require('mongoose')

const TripSchema = new mongoose.Schema({
    pickup : {
        lat : {type : Number , required : true},
        long : {type : Number , required : true},
    },
    drop : {
        lat : {type : Number , required : true},
        long : {type : Number , required : true},
    },
    customerId : {type : mongoose.Schema.Types.ObjectId , required : true},
    driverId : mongoose.Schema.Types.ObjectId,
    customerSocket : String,
    driverSocket : String,
    status : {type : String , required : true},
    price : {type : Number , required : true},
    serviceAreaId : {type : mongoose.Schema.Types.ObjectId , required : true},
    vehicleId : {type : mongoose.Schema.Types.ObjectId , required : true},
    otp : String,
    subTrips : [
        {
            start : {
                lat : {type : Number , required : true},
                long : {type : Number , required : true},
            },
            end : {
                lat : {type : Number , required : true},
                long : {type : Number , required : true},
            },
            status : String,

        }
    ],
    createdAt : {type : Date , default : Date.now()}
})

module.exports = mongoose.model('trips' , TripSchema)