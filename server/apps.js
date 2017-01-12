var express = require("express");
var app  =express();
var Login = require("./controller/login");
var Article  = require("./controller/article");
var session = require('express-session');
var PORT = process.env.PORT || 3000;
//使用session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static("./public"));
app.set("view engine","ejs");
app.get("/login",Login.showLogin);
app.post("/checkLogin",Login.checkLogin);
app.get("/admin",Login.showAdminData);
app.get("/admin/article/show",Article.ArticleList);
app.get("/admin/article/new",Article.newArticle);
app.post("/doNewArticle",Article.doNewArticle);
app.listen(PORT);

