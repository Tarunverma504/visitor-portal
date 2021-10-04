const express=require('express');
const router= express.Router();
const otpGenerator = require('otp-generator')
const sqMail=require('@sendgrid/mail');
const visitor=require('../model/visitor');
require('dotenv').config()
const API_KEY= process.env.API_KEY
const accountSid = process.env. accountSid
const authToken = process.env.authToken
const client = require('twilio')(accountSid, authToken); 
const port=process.env.PORT;;

sqMail.setApiKey(API_KEY);


router.get('/',(req,res)=>{
    res.render('index.ejs');
})


router.get('/checkin',(req,res)=>{
    let message=req.flash('info');
    res.render('checkin.ejs',{msg:message});
})




router.post('/checkin',async(req,res)=>{
    const data = {
        ...req.body
    }
    let otp=otpGenerator.generate(6, { upperCase: false, specialChars: false });
    let date=await getDate();
    let phone=data.Phone_number;
    phone=phone.slice(-10);
   var d= await visitor.create({
        username:data.username,
        email:data.email,
        phone:phone,
        purpose:data.purpose,
        otp:otp,
        isOtpMatched:false,
        Date:date
    });

    let msg=`Hi ${data.username}\n\nYour OTP is = ${otp} `;
    sendMail(data.email,msg);
    sendSms(`"+91${phone}`,msg);
    res.redirect(`/verify?id=${d._id}`);
})

router.get('/checkout',(req,res)=>{
    let message=req.flash('info');
    res.render('checkout.ejs',{msg:message});
})

router.post('/checkout',async(req,res)=>{
    const data = {
        ...req.body
    }


    await visitor.findById({_id:data.visitor_id})
        .then(async(result)=>{
             let time= await getTime();
            await visitor.findByIdAndUpdate({_id:result.id},{checkOut_Time:time});
            let msg=`Hi ${result.username} \nVisitor Id is:- ${result._id} \n Your CheckIn Time is:- ${result.checkIn_Time} \nYour CheckOut Time is:- ${time} `;
            sendMail(result.email,msg);
            sendSms(`"+91"${result.phone}`,msg);
            res.redirect('/matched');
        })

        .catch(async(err)=>{
            
            await visitor.find({username:data.username,$and:[{checkOut_Time:null}]})
                    .then(async(result)=>{
                        if(result.length==0){throw err;  }
                        else{
                            let time= await getTime();
                            let id=result[0]._id;
                            await visitor.findByIdAndUpdate({_id:id},{checkOut_Time:time});
                            let msg=`Hi ${result[0].username} Visitor Id is:- ${result[0]._id} \n Your CheckIn Time is:- ${result[0].checkIn_Time} \nYour CheckIn Time is:- ${time} `;
                            sendMail(result.email,msg);
                            sendSms(`"+91"${result.phone}`,msg);
                            res.redirect('/matched');
                        }
                        
                            
                    })

                    .catch((err)=>{
                        req.flash('info', "Id and Name Doesn't Matched ");
                        res.redirect('/checkout');
                        
                    })
        })
    
})




router.get('/verify',async(req,res)=>{
    res.render('otpPage.ejs',{id:req.query.id});

})

router.get('/matched',(req,res)=>{
    res.render('matched.ejs');
})
router.post('/verify',async(req,res)=>{
    const getOtp=req.body.otp;
    const id=req.query.id;
    const getvisitor=await visitor.findById({_id:id});
    if(getOtp==getvisitor.otp){
        let time= await getTime();
        let result=await visitor.findByIdAndUpdate({_id:id},{checkIn_Time:time,isOtpMatched:true});
        let msg=`Your Visitor Id is:- ${id} \n Your CheckIn Time is:- ${time} \n\n Note:- Save Visitior Id for later `;
        sendMail(result.email,msg);
        sendSms(`"+91"${result.phone}`,msg);
        res.redirect('/matched');
    }
    else{
        req.flash('info', "OTP doesn't matched try again");
        await visitor.findByIdAndDelete({_id:id});
        res.redirect('/checkin');
    }
})


router.get('/Enqury',async(req,res)=>{
    let date=getDate();
    let response=await visitor.find({Date:date,$and:[{isOtpMatched:true}]})
    res.render('enqury.ejs',{response:response,date:date});

})

router.get('/getData',async(req,res)=>{
    let date=req.query.date;
    let splitDate=date.split("-");
    date=splitDate[2]+"-"+splitDate[1]+"-"+splitDate[0];
    const result=await visitor.find({Date:date,$and:[{isOtpMatched:true}]})
    if(result.length==0){
        res.render('notFound.ejs',{date:date});
    }
    else{
        res.render('enqury.ejs',{response:result,date:date});
    }
    res.send(result);

})


async function sendMail(email,msg){
    const message={
        to:`${email}`,
        from:'vermatarun4305@gmail.com',
        subject: 'Visitor Portal',
        text: `${msg}`,
    };
    await sqMail.send(message)
    .then((response)=>{
        console.log('Email Send..0')
    })
    .catch((err)=>{console.log(err)})
}
async function sendSms(phone,msg){
    client.messages 
      .create({
          from:'+16196485487',
          to:`${phone}`,
          body:`${msg}`
      },(err,msg)=>{
          if(err){
            console.log(err);
            return;
          }
            
        else{
            console.log(msg);
        }
            
      })
}


function getTime(){
    let dt=new Date();
    let hrs=dt.getHours();
    let min=dt.getMinutes();
    let sec=dt.getSeconds();
    let time=hrs+":"+min+":"+sec;
    return time;
}



function getDate(){
    let dt=new Date();
    let date=("0"+dt.getDate()).slice(-2);
    let month=("0"+(dt.getMonth()+1)).slice(-2);
    let year=dt.getFullYear();
    let d=date+"-"+month+"-"+year;
    return d;
}

module.exports= router;
