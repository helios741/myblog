var formidable = require("formidable"),
    User = require("../models/user"),
    mongoose = require("mongoose"),
    DB = require("../models/db");

exports.save = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields){
        User.findByNick(fields.nick)
            .then(((userMsg)=>{
                if(userMsg.length>0) {
                    res.send("-1");  //用户昵称已经存在
                }
                new User({
                    nick:fields.nick,
                    email:fields.email
                }).save()
                    .then((msg)=>res.send(msg));
            }))
            .catch((err)=>console.error(err));

    })
};
exports.getNick = function(req,res){
    User.find({nick:req.query.nick},function(err,users){
        if(err){
            console.log(err);
            return ;
        }
        if(users.length<1){
            res.send("-1");
        }
        res.send(users[0]);

    })
};
