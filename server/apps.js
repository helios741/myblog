var express = require("express");
var app  =express();
var router = require("./controller/router");
var session = require('express-session');

//使用session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static("./static"));
app.set("view engine","ejs");
app.get("/login",router.showLogin);
app.post("/checkLogin",router.checkLogin);
app.get("/admin",router.showAdmin);
app.listen(3000);

