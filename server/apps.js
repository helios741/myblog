var express = require("express");
var app  =express();
var session = require('express-session');
var PORT = process.env.PORT || 80;
//使用session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
/**
 * 设置中间件
 */
//pp.use(express.compress());
app.use(express.static("./public"));
app.use(express.static("../node_modules"));
app.use(express.static("../static"));
app.use(express.static("./uploads"));
require('./config/router')(app);
app.listen(PORT);
