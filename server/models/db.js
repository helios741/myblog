var mongoose = require("mongoose");
var setting  = require("../setting");
mongoose.connect("mongodb://localhost:27017/"+setting.dbName);

var db = mongoose.connection;
//db.on('error',console.error.bind(console,'连接错误:'));
db.once("open",function(callback){
    console.log("数据库成功打开，当前数据库为:"+setting.dbName);
});
module.exports  =  db;
