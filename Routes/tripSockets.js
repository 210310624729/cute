const jwt = require('jsonwebtoken')
const Users = require('../Models/Users')
const Trip = require('../Models/Trip')
const {io} = require('../Config/websockets')

io.on('connection' , async (socket)=>{
    try{
        //Reconnection
        if(socket.handshake.query.isReconnect){
            if(!socket.handshake.query.previousId || !socket.handshake.query.role) socket.emit('error' , {msg : "Specify previous Socket id and role" , errCode : 1})
            else{
                if(socket.handshake.query.role == 'DRIVER'){
                    const trip = await Trip.findOne({driverSocket : socket.handshake.query.previousId})
                    if(!trip) socket.emit("error" , "No trip found to reconnect to")
                    else{
                        trip.driverSocket = socket.id;
                        await trip.save()
                        socket.emit('success' , "You are reconnected")
                    }
                }else if(socket.handshake.query.role == 'CUSTOMER'){
                    const trip = await Trip.findOne({customerSocket : socket.handshake.query.previousId})
                    if(!trip) socket.emit("error" , "No trip found to reconnect to")
                    else{
                        trip.customerSocket = socket.id;
                        await trip.save()
                        socket.emit('success' , "You are reconnected")
                    }
                }else{
                    socket.emit("error" , {msg : "Role not supported" , errCode : 1})
                }
            }
            //First time connection
        }else{
            try{
                const accessToken = socket.handshake.query.accessToken;
                const tokenData = jwt.verify(accessToken , process.env.ACCESS_TOKEN_SECRET)
                try{
                    const user = await Users.findById(tokenData.user_id)
                    let customerId = undefined;
                    let driverId = undefined;
                    if(user.roleType == 'CUSTOMER'){
                        customerId = user.roleId
                    }else if(user.roleType == 'DRIVER'){
                        driverId = user.roleId
                    }else{
                        socket.emit('error' , {msg : "You are not authorized to connect" , errCode : 1})
                    }

                    if(customerId){
                        const trip = await Trip.findOne({customerId : customerId , status : "WAITING FOR DRIVER"})
                        if(!trip) socket.emit({msg : "You have no trips to connect to" , errCode : 1})
                        else {
                            trip.customerSocket = socket.id
                            await trip.save()
                            socket.emit('success' , "You are connected to the server")
                        }
                    }else if(driverId){
                        const trip = await Trip.findOne({driverId : driverId , status : "CONFIRMED"})
                        if(!trip) socket.emit("error" ,{msg : "You have no trips to connect to" , errCode : 1})
                        trip.driverSocket = socket.id
                        
                        await trip.save()
                        socket.emit('success' , "You are connected to the server")
                    }
                }catch(err){
                    console.log(err)
                    socket.emit("error" , "Internal error")
                }
            }catch(err){
                console.log(err)
                socket.emit('error', {msg : "Access token has expired" , errCode : 1}) // err code 1 means the client has to disconnect and reconnect
            }
        }

        //Live location
        socket.on('driverLocation' , async (data)=>{
            const trip = await Trip.findOne({driverSocket : socket.id})
            io.to(trip.customerSocket).emit('driverLocation' , data)
        })


    }catch(err){
        console.log(err)
        return socket.emit("error" , "Internal error")
    }
    
})


