var formidable = require("formidable"),
    User = require("../models/user"),
    mongoose = require("mongoose"),
    DB = require("../models/db");

exports.save = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields){
        new User({
            nick:fields.nick,
            email:fields.email
        }).save(function(err,msg){
            if(err){
                console.log("保存用户失败");
                return ;
            }
            console.log(msg);
            res.send("1");
        });
    })
};
