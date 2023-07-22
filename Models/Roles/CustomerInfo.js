const mongoose = require('mongoose')

const CustomerInfoSchema = new mongoose.Schema({
    tripsBooked : [{type : mongoose.Schema.Types.ObjectId , ref : "trips"}],
    cancellationPenalty : {
        installment1 : {type : Number , default : 0},
        installment2 : {type : Number , default : 0},
        installment3 : {type : Number , default : 0},
    }
})

module.exports = mongoose.model('customer_info' , CustomerInfoSchema)