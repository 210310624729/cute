const mongoose = require('mongoose')

const VehicleSchema = new mongoose.Schema({
    name : {type : String , required : true},
    serviceArea : {type : mongoose.Schema.Types.ObjectId, required : true},
    price : {type : Number , required : true}, // price is per kilometer
    isActive : {type : String , default : true}
})

module.exports = mongoose.model('vehicle' , VehicleSchema)