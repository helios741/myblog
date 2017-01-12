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
        console.log(fields);
        var newArticle = new Article({
            articleId:565,
            title:fields.title,
            contentUrl:"./sfsdg",
            content:fields.content,
            category:[1,2,6],
            hidden:false
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
