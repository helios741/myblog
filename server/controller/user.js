var formidable = require("formidable"),
    User = require("../models/user"),
    mongoose = require("mongoose"),
    DB = require("../models/db");

exports.save = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields){
        User.findByNick(fields.nick,function(err,userMsg){
            if(err){
                console.log("保存用户失败");
                return ;
            }
            if(userMsg.length>0) {
                res.send("-1");  //用户昵称已经存在
                return ;
            }
            new User({
                nick:fields.nick,
                email:fields.email
            }).save(function(err,msg){
                if(err){
                    console.log("保存用户失败");
                    return ;
                }
                res.send(msg);
            });
        })

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
}
