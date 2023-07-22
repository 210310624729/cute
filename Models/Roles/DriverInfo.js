const mongoose = require('mongoose')

const DriverInfoSchema = new mongoose.Schema({
    tripsTaken : [{type : mongoose.Schema.Types.ObjectId , ref : 'trips'}],
    serviceAreaId : {type : mongoose.Schema.Types.ObjectId , required : true},
    isVerified : {type : Boolean , default : false},
    isRejected : {type : Boolean , default : false},
    isBanned : {type : Boolean , default : false},
    licenseNum : {type : String , required : true}
})

module.exports = mongoose.model('driver_info' , DriverInfoSchema)