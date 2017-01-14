var mongoose  = require("mongoose");
var DB = require("../models/db");
var Schema = mongoose.Schema;

var CategorySchema = new Schema({
    id:Number,
    name:String,
    list:[Number],
    meta:{
        createAt:{
            type:Date,
            default:Date.now()
        },
        updateAt:{
            type:Date,
            default : Date.now()
        }
    }
});
//定义个静态的方法，这个方法可以通过model直接去调用
CategorySchema.statics = {
    //得到所有文章
    fetch:function(cb){
        return this
            .find({})
            .sort("meta.updateAt")
            .exec(cb)
    },
    findById:function(id,cb){
        return this
            .findOne({id:id})
            .exec(cb)
    },
    removeById:function(id,cb){
        return this
            .remove({_id:id})
            .exec(cb)
    }
    
};

module.exports = CategorySchema;
