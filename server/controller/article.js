var Article = require("../models/article");
var DB = require("../models/db");
var formidable  = require("formidable");
var mongoose = require("mongoose");

mongoose.Promise = require('bluebird');
//展示管理员界面
exports.ArticleList = function(req,res){
    //没有登录不能进入这个页面
    /*if(!req.session.name){
     res.redirect("/login");
     }*/

    Article.fetch(function(err,result){
        if(err){
            console.log(err);
            return ;
        }
        res.render("index",{
            type:"articleList",
            title:"文章列表",
            articleList:result
        });
    })
}
exports.newArticle  = function(req,res){
    res.render("index",{
        type:"newArticle",
        title:"新建文章"
    });
}
exports.doNewArticle = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields){
        if(err){
            console.log(err);
            res.send("-1");
            return ;
        }
        var newArticle = new Article({
            articleId:(Math.random()*10000+89999)>>0,
            title:fields.title,
            content:fields.content,
            category:[1,2,6],
            keyword:fields.keyword,
            hidden:fields.hidden,
            desc:fields.desc
        });
        newArticle.save(function(err,result){
            if(err){
                console.log(err);
                res.send("-1");
            }
            res.send("1");
        });
    })
}
exports.delArticle = function(req,res){
    Article.removeById(req.query._id,function(err,result){
        if(err){
            csonole.log(err);
            res.send("-1");
            return ;
        }
        if(1==result.ok && result.n==0) result("0");
        if(1==result.ok) res.send("1");
        res.send("1");
    });
}
exports.getArticleList = function(req,res){
    Article.fetch(function(err,result){
        if(err){
            console.log(err);
            return ;
        }
        res.send(result);
    });
}
exports.getArticleDetail = function(req,res){
    var articleId = parseInt(req.params.id.slice(1));
    Article.findById(articleId,function(err,result){
        if(err){
            console.log(err);
            res.send("-1");
            return ;
        }
        res.send(result);
    })
}
