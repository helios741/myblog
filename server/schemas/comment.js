var mongoose = require("mongoose");
var Schema = mongoose.Schema,
    ObjectId  = Schema.Types.ObjectId;


var CommentSchema = new Schema({
    article:{type:ObjectId,ref:"Article"},
    from:{type:ObjectId,ref:"User"},
    to:{type:ObjectId,ref:"User"},
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
