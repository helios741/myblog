var mongoose  = require("mongoose");
//mongoose.Promise = require('bluebird');
var CategorySchema = require("../schemas/category");
var Category = mongoose.model("Category",CategorySchema);
/*
 var a = new Category({
     id:4,
     name:"数据结构",
     list:[565],
 })
 a.save();*/

Category.createNewCategory=function(newCategory,aid,cb){
    new Category({
        id:(Math.random()*110000+99999)>>0,
        name:newCategory,
        list:[aid]
    }).save(cb);
};


module.exports = Category;

