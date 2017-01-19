var mongoose  =require("mongoose"),
    UserSchema = require("../schemas/user");
var User  =mongoose.model("User",UserSchema);

module.exports = User;
