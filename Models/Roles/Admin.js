const mongoose = require('mongoose')

const AdminRoleSchema = new mongoose.Schema({
    serviceAreas : [{type: mongoose.Schema.Types.ObjectId, ref: 'service_area'}],
    isVerified : {
        type : Boolean,
        required : true,
        default : false
    },
    userID:{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user',
    },
    userName:{
        type:String,
        // required:true
    }
    
})

module.exports = mongoose.model('admin_info' , AdminRoleSchema)