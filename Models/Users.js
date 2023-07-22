const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    
    username : {type : String , required : true},
    password : {type : String , required : true},
    roleType : {type : String , required : true},
    roleId : {type : mongoose.Types.ObjectId , ref : 'admin_info'},
    phoneNum : { type: Number},
    address : { type: String},
    isVerified : {type : Boolean , default : true},
    otp : {
        val : String,
        expiresAt : Date
    },
    isActive: {type:Boolean , default:true}
})

module.exports = mongoose.model('user' , UserSchema)