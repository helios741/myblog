var fs = require("fs");
//var fd = fs.createWriteStream("3.md");
//console.log(fd);
fs.writeFile('1.txt', 'Hello费大幅度发.js', function(err) {
    if (err) throw err;
    console.log('It\'s saved!');
});
/*fs.open("2.md","a+",function(err,fd){
    if(err) {
        throw err;
    }
    fs.write(fd,"sygl",0,function (err,msg) {
        if(err){
            throw err;
        }
        console.log(msg);
    })
});*/
