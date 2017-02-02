var express = require("express");
var app  =express();
var session = require('express-session');
var PORT = process.env.PORT || 3000;
//使用session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static("./public"));
app.use(express.static("../node_modules"));
app.use(express.static("../static"));
require('./config/router')(app);
app.listen(PORT);
