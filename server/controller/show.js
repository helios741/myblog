var fs = require("fs");
exports.showIndex  = function(req,res){
    console.log("666"+req.params);
    res.send("sss");
}
