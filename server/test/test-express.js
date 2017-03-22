var express = require('express');
var app = express();

app.set('port', 3000);

app.use(function (req, res, next) {
    console.log(1);
    //next();
});

app.use(function (req, res, next) {
    console.log( app.get("port") );
    res.send("hello");
});

app.listen(app.get('port'), function () {
    console.log('server listening...');
});
