const express=require('express');
const app=express();
const methodOverride=require('method-override');
const path=require('path');
const flash=require('connect-flash');
const session = require('express-session');
const cookieParser= require('cookie-parser');
require('dotenv').config()

const url=process.env.url
const mongoose=require('mongoose');
const portalRoutes=require("./routes/portalRoutes");
mongoose.connect(`${url}`)
    .then(() => console.log('DB Connected'))
    .catch((err) => console.log(err));

const sessionConfig = {
        secret: 'weneedsomebettersecret',
        resave: false,
        saveUninitialized: true,
    }


app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

app.use(express.static(path.join(__dirname,'/public')));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(cookieParser('weneedsomebettersecret'))
app.use(session(sessionConfig));
app.use(flash());

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

app.use(portalRoutes);




app.listen( process.env.PORT || 2323,()=>{
    console.log("Server Running at port 2323");
})