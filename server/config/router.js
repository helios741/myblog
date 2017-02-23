var Login = require("../controller/login"),
    Article  = require("../controller/article"),
    Comment  = require("../controller/comment"),
    Category  = require("../controller/Category"),
    User = require("../controller/user"),
    Upload = require("../controller/upload");
module.exports = function(app){
    /*设置模板引擎*/
    app.set("view engine","ejs");
    /*关于登录方面的路由*/
    app.get("/login",Login.showLogin);  //展示登录页面
    app.post("/checkLogin",Login.checkLogin); //检查是否登录
    app.get("/admin",Login.logined,Login.showAdminData); //跳转到管理页面
    /*登录路由结束*/
    /*关于文章的路由*/
    app.get("/admin/article/show",Login.logined,Article.ArticleList);//展示文章列表
    app.get("/admin/article/del",Login.logined,Article.delArticle);//删除文章操作
    app.get("/admin/article/new",Login.logined,Article.newArticle);//新建文章操作
    app.get("/admin/article/deled",Login.logined,Article.showDelArticle);//展示已经删除的文章
    //前台得到文章的分类列表
    app.post("/admin/article/getArticleDetailCategoryList",Article.getArticleDetailCategoryList);
    app.get("/admin/article/new/:_id",Login.logined,Article.editArticle); //修改文章
    app.get("/admin/article/getArticleList/:page",Article.getArticleList);//前台得到第几页文章
    app.get("/admin/article/getArticle/:id",Article.getArticleDetail);//前台得到文章的详细信息
    app.get("/admin/article/detail/:_id",Article.articlePreview);//后台对文章进行预览
    app.get("/admin/article/getAllArticle",Article.getAllArticle);//得到所有的文章
    app.get("/admin/article/getAll",Article.getAll);//得到某个分类下的所有文章
    app.post("/doNewArticle",Login.logined,Article.doNewArticle);      //新建一篇文章的操作
    /*和文章有关的路由结束*/
    //app.get("/admin/article/getAll",Article.getAllArticle);
    //app.get("/admin/article/getAllComment",Article.getAllComment);
    /*和文章分类有关的路由*/
    app.get("/admin/category/show",Login.logined,Category.Show);//所有分类的展示
    app.get("/admin/category/save",Login.logined,Category.save);//新建一个分类
    app.get("/admin/category/del/:id",Login.logined,Category.del);//删除一个分类
    app.get("/admin/category/indexGet",Category.indexGet);    //前台展示一部分的文章
    app.get("/admin/category/detail/:id",Category.showCategoryDetail);//展示分类下的所有文章
    app.get("/admin/category/getInfo/:aid",Category.getInfo);  //得到某一篇文章的详细信息
    app.get("/admin/category/getCategoryInfo/:cid",Category.getCategoryInfo);//按照cid得到特定的分类
    /*文章分类路由结束*/
    /*评论用户路由*/
    app.post("/admin/user/save",User.save);//保存用户到数据库
    app.get("/admin/user/getNick",User.getNick); //得到这个用户的昵称
    /*评论用户路由结束*/
    /*评论内容路由*/
    app.post("/admin/comment/save",Comment.save);     //保存评论
    app.get("/admin/comment/getAll",Comment.getAll);  //得到所有评论
    //app.post("/admin/comment/reply",Comment.reply);
    /*评论内容路由结束*/
    /*上传文件的路由*/
    app.post("/admin/uploads/articleImg",Upload.articleImg);
    /*上传文件的路由结束*/
};
