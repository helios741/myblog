var Login = require("../controller/login");
var Article  = require("../controller/article");
var Comment  = require("../controller/comment");
var Category  = require("../controller/Category");
var User = require("../controller/user");
module.exports = function(app){
    app.set("view engine","ejs");
    app.get("/login",Login.showLogin);
    app.post("/checkLogin",Login.checkLogin);
    app.get("/admin",Login.showAdminData);
    app.get("/admin/article/show",Login.logined,Article.ArticleList);
    app.get("/admin/article/del",Login.logined,Article.delArticle);
    app.get("/admin/article/new",Login.logined,Article.newArticle);
    app.get("/admin/article/deled",Login.logined,Article.showDelArticle);
    app.post("/admin/article/getArticleDetailCategoryList",Article.getArticleDetailCategoryList);
    app.get("/admin/article/new/:_id",Login.logined,Article.editArticle);
    app.get("/admin/article/getArticleList/:page",Article.getArticleList);
    app.get("/admin/article/getArticle/:id",Article.getArticleDetail);
    app.get("/admin/article/detail/:_id",Article.articlePreview);
    app.get("/admin/article/getAllArticle",Article.getAllArticle);
    app.get("/admin/article/getAll",Article.getAll);
    //app.get("/admin/article/getAll",Article.getAllArticle);
    //app.get("/admin/article/getAllComment",Article.getAllComment);
    app.get("/admin/category/show",Category.Show);
    app.get("/admin/category/save",Login.logined,Category.save);
    app.get("/admin/category/del/:id",Login.logined,Category.del);
    app.get("/admin/category/indexGet",Category.indexGet);
    app.get("/admin/category/detail/:id",Category.showCategoryDetail);
    app.get("/admin/category/getInfo/:aid",Category.getInfo);
    app.get("/admin/category/getCategoryInfo/:cid",Category.getCategoryInfo);
    app.post("/doNewArticle",Login.logined,Article.doNewArticle);

    app.post("/admin/user/save",User.save);
    app.get("/admin/user/getNick",User.getNick);

    app.post("/admin/comment/save",Comment.save);
    app.get("/admin/comment/getAll",Comment.getAll);
    //app.post("/admin/comment/reply",Comment.reply);
}
