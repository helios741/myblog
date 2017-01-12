var mongoose = require("mongoose");
var db = require("../models/db");
var md5=require("../models/md5");
var adminSchema = new mongoose.Schema({
    "name" : String,
    "pwd"  : String
});
/*
* 这个schema不对外进行暴露，因为当前博客允许自己编写
 */
var adminModel =mongoose.model("admin",adminSchema);
/*var adminEntry = new adminModel({
    name:"syl",
    pwd:md5(md5("123")+"yilong")
});
adminEntry.save(function(err,obj){
    if(err){
        console.log("数据保存失败");
        return ;
    }
    console.log("数据保存成功");
});*/
module.exports  =  adminModel;
