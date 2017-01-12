var express = require("express");
var app  =express();
var Login = require("./controller/login");
var Show = require("./controller/show");
var Article  = require("./controller/article");
var session = require('express-session');
var PORT = process.env.PORT || 3000;
//使用session
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static("./node_modules"));
app.use(express.static("./public"));
app.use(express.static("./static"));
app.set("view engine","ejs");
//app.get("/",Show.showIndex);
app.get("/login",Login.showLogin);
app.post("/checkLogin",Login.checkLogin);
app.get("/admin",Login.showAdminData);
app.get("/admin/article/show",Article.ArticleList);
app.get("/admin/article/del",Article.delArticle);
app.get("/admin/article/new",Article.newArticle);
app.get("/admin/article/getArticleList",Article.getArticleList);
app.post("/doNewArticle",Article.doNewArticle);
app.listen(PORT);
