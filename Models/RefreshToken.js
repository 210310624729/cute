const mongoose = require('mongoose')

//Keep track of all logged in users using their refrwesh tokens
// Refresh token also containes user id in payload
const RefreshTokenSchema = new mongoose.Schema({
    token : String
})

module.exports = mongoose.model('refreshtokens' , RefreshTokenSchema)