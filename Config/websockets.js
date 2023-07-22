const {createServer} = require('http')
const {Server} = require('socket.io')
const express = require('express')

const app = express()
const socketServer = createServer(app)
const io = new Server(socketServer , {
    path : '/'
})

module.exports.io = io

module.exports.startWebsocketServer = (socketPort)=>{
    socketServer.listen(socketPort , ()=>{
        console.log("Started web socket server")
    })    
}