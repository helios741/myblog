var mongoose = require("mongoose");
var Schema = mongoose.Schema,
    ObjectId  = Schema.Types.ObjectId;


var CommentSchema = new Schema({
    article:{type:ObjectId,ref:"Article"},
    from:{type:ObjectId,ref:"User"},
    reply: [{
        from: {type: ObjectId, ref: 'User'},
        to: {type: ObjectId, ref: 'User'},
        content: String
    }],
    content:String,
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
CommentSchema.pre("save",function(next){
    if(this.isNew){
        this.meta.createAt = this.meta.updateAt  = Date.now();
    }else{
        this.meta.createAt   = Date.now();
    }
    next();
});
module.exports = CommentSchema;
