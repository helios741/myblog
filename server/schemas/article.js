var mongoose = require("mongoose");
var DB = require("../models/db");
var Schema  = mongoose.Schema;
var ArticleSchema = new Schema({
    articleId:Number,
    title:String,
    contentUrl:String,
    content:String,
    category:[Number],
    hidden:Boolean,
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

//在每次保存之前执行这个方法,是基于Schema的
ArticleSchema.pre("save",function(next){
    if(this.isNew){
        this.meta.createAt = this.meta.updateAt  = Date.now();
    }else{
        this.meta.createAt   = Date.now();
    }
    next();
});
//定义个静态的方法，这个方法可以通过model直接去调用
ArticleSchema.statics = {
    //得到所有文章
    fetch:function(cb){
        return this
            .find({})
            .sort("meta.updateAt")
            .exec(cb)
    },
    findById:function(id,cb){
        return this
            .findOne({_id:id})
            .exec(cb)
    },
    removeById:function(id,cb){
        return this
            .remove({_id:id})
            .exec(cb)
    }
};

//exports.exports  =  ArticleSchema;
exports.ArticleSchema = ArticleSchema;


