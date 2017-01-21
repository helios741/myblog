var express = require("express");
var app  =express();
var Login = require("./controller/login");
var Show = require("./controller/show");
var Article  = require("./controller/article");
var Category  = require("./controller/Category");
var Comment  = require("./controller/comment");
var User = require("./controller/user");
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
app.set("view engine","ejs");
app.get("/login",Login.showLogin);
app.post("/checkLogin",Login.checkLogin);
app.get("/admin",Login.showAdminData);
app.get("/admin/article/show",Article.ArticleList);
app.get("/admin/article/del",Article.delArticle);
app.get("/admin/article/new",Article.newArticle);
app.get("/admin/article/deled",Article.showDelArticle);
app.get("/admin/article/new/:_id",Article.editArticle);
app.get("/admin/article/getArticleList/:page",Article.getArticleList);
app.get("/admin/article/getArticle/:id",Article.getArticleDetail);
app.get("/admin/article/detail/:_id",Article.articlePreview);
app.get("/admin/article/getAllArticle",Article.getAllArticle);
//app.get("/admin/article/getAllComment",Article.getAllComment);
app.get("/admin/category/show",Category.Show);
app.get("/admin/category/save",Category.save);
app.get("/admin/category/del/:id",Category.del);
app.get("/admin/category/detail/:id",Category.showCategoryDetail);
app.post("/doNewArticle",Article.doNewArticle);

app.post("/admin/user/save",User.save);
app.get("/admin/user/getNick",User.getNick);

app.post("/admin/comment/save",Comment.save);
app.get("/admin/comment/getAll",Comment.getAll);
//app.post("/admin/comment/reply",Comment.reply);
app.listen(PORT);
