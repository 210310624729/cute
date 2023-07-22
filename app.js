require('dotenv').config()
require('./Config/db').connectDB()

const { urlencoded } = require('express')
const express = require('express')
const cors = require('cors')

require('./Routes/tripSockets')
const app = express()


app.use(cors())
app.use(express.json())
app.use(urlencoded({extended : false}))
app.use(express.static('assets'));
app.set('view engine', 'ejs');
app.set('views', './views');

app.get('/privacy',async(req,res)=>{
    return res.render('privacy-cute')
})

app.get('/delete',async(req,res)=>{
    return res.render('deleteacccount')
})

app.get('/privacy-partner',async(req,res)=>{
    return res.render('privacy-partner')
})
const authRoutes = require('./Routes/auth')
app.use('/auth' , authRoutes)

const serviceAreaRoutes = require('./Routes/serviceAreas')
app.use('/serviceareas' , serviceAreaRoutes)

const tripInfoRoutes = require('./Routes/tripInfo')
app.use('/trips/info' , tripInfoRoutes)
const tripConfirmedRoutes = require('./Routes/tripsConfirmed')
app.use('/trips/confirmed' , tripConfirmedRoutes)

const adminRoutes = require('./Routes/admin')
app.use('/admin' , adminRoutes)

const mainAdminRoutes = require('./Routes/mainAdmin')
app.use('/mainadmin' , mainAdminRoutes)

const superAdmin = require('./Routes/superAdmin')
app.use('/super-admin',superAdmin)

const httpPort = 8004 || process.env.HTTP_PORT
const socketPort = 8005 || process.env.SOCKET_PORT

app.use((err , req , res , next)=>{
    console.log(err)
    res.status(500).json({err : "Something went wrong. Internal error"})
})

app.all('*' , (req , res)=>{
    res.status(404).json({err : "Resource not found"})
});
app.get("/", (req,res) => {
    res.render("loginpage");
});




//Http server listen
app.listen(httpPort , ()=>{
    console.log(`App is listening on port ${httpPort}`)
})

//Socket server listen
require('./Config/websockets').startWebsocketServer(socketPort)
