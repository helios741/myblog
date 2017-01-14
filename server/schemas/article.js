var mongoose = require("mongoose");
var DB = require("../models/db");
var Schema  = mongoose.Schema;
var ArticleSchema = new Schema({
    articleId:Number,
    title:String,
    contentUrl:String,
    content:String,
    category:[Number],
    desc:String,
    keyword:[String],
    hidden:Boolean,
    isdel:Boolean,
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
            .sort({ "meta.updateAt" : 1 })
            .exec(cb)
    },
    findById:function(id,cb){
        return this
            .findOne({articleId:id})
            .exec(cb)
    },
    findBy_Id:function(id,cb){
        return this
            .findOne({_id:id})
            .exec(cb)
    },
    removeById:function(id,cb){
        return this
            .remove({_id:id})
            .exec(cb)
    },
    //用户分页
    findByData:function(data,cb){
        return this
            .find({"hidden":false})
            .skip(data.start)
            .limit(data.count)
            .sort({ "meta.updateAt" : -1 })
            .exec(cb)
    },
    countAllData:function(cb){
        return this
            .find({"hidden":false})
            .exec(cb)
    }
};

//exports.exports  =  ArticleSchema;
exports.ArticleSchema = ArticleSchema;


