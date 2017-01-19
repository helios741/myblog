var mongoose = require("mongoose");
var DB = require("../models/db");
var UserSchema = mongoose.Schema({
    nick:String,
    email:String,
    meta:{
        createAt:{
            type:Date,
            default:Date.now()
        },
        updateAt:{
            type:Date,
            default:Date.now()
        }
    }
});
UserSchema.pre("save",function(next){
    if(this.isNew){
        this.meta.createAt = this.meta.updateAt  = Date.now();
    }else{
        this.meta.createAt   = Date.now();
    }
    next();
});
UserSchema.statics = {
    fetch:function(cb){
        return this
            .find()
            .sort({ "meta.updateAt" : 1 })
            .exec(cb)
    },
    findByEmail:function(email,cb){
        return this
            .find({email:email})
            .sort("meta.updateAt")
            .exec(cb)
    }
}
module.exports = UserSchema;
