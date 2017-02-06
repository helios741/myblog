var Article = require("../models/article");
var DB = require("../models/db");
var formidable  = require("formidable");
var mongoose = require("mongoose");
var Category = require("../models/category");
var fs = require("fs");
mongoose.Promise = require('bluebird');
//展示管理员界面
exports.ArticleList = function(req,res){
    var data ={isdel:false};
    if(req.query.hidden){
        data.hidden = req.query.hidden;
    }
    Category.fetch(function(err,categorys){
        if(err) throw err;
        Article.findData(data,function(err,list){
            if(err) throw err;
            res.render("index",{
                type:"articleList",
                title:"文章列表",
                articleList:list,
                categoryList:categorys
            });
        })
    })

};
exports.newArticle  = function(req,res){
    Category.fetch(function(err,result){
        if(err) throw err;
        res.render("index",{
            type:"newArticle",
            title:"新建文章",
            categoryList:result,
            saveBtn:"发表",
            article:""
        });
    })
};
exports.doNewArticle = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields){
        if(err){
            console.log(err);
            res.send("-1");
        }
        //文章的ID
        var aid = (Math.random()*10000+89999)>>0;
        //创建新的分类
        var categoryArr = [],
            existCategory = fields.category.split(","),
            existCategoryLen = existCategory.length;
        for(var i=0;i<existCategoryLen;i++) {
            if(existCategory[i]=="") continue;
            categoryArr.push(parseInt(existCategory[i]));
        }
        if(fields._id){
            Article.updateArticle(fields,aid)
                .then(function(status){
                    res.send(status);
                },function(status){
                    res.send(status);
                });
            return ;
        }
        Article.createArticle(fields,aid,res)
            .then(function(){
                console.log("OK");
            },function(status){
                res.send(status);
            });

    })
};
exports.delArticle = function(req,res){
    var _id = req.query._id;
    Article.findBy_Id(_id,function(err,result){
        if(err) throw err;
        Article.delArticle(result,_id)
            .then(function(status){
                res.send(status)
            },function(status){
                res.send(status);
            });
    });
};
exports.getArticleDetail = function(req,res){
    var articleId = parseInt(req.params.id.slice(1));
    Article.update({articleId:articleId}, {$inc: {pv: 1}}, function(err) {
        if (err) throw err;
    });
    Article.findById(articleId,function(err,result){
        if(err){
            console.log(err);
            res.send("-1");
            return ;
        }
        res.send(result);
    })
}
exports.getArticleList = function(req,res){
    Article.findByData(req.query,function(err,result){
        if(err) throw err;
        res.send(result);
    });
}
exports.getAllArticle =  function(req,res){
    Article.countAllData(function(err,result){
        if(err) throw err;
        res.send(result);
    })
}
exports.editArticle  =function(req,res){
    var _id = req.params._id;
    Article.findBy_Id(_id,function(err,result){
        if(err) throw err;
        Category.fetch(function(err,result2){
            if(err){
                console.log(err);
                return ;
            }
            res.render("index",{
                type:"newArticle",
                title:"编辑文章",
                categoryList:result2,
                article:result,
                saveBtn:"保存"
            });
        })
    });
}
exports.articlePreview = function(req,res){
    var _id = req.params._id;
    Article.findBy_Id(_id,function(err,article){
        if(err) throw err;
        Category.fetch(function(err,categorys){
            if(err) throw err;
            res.render("index",{
                type:"preview",
                title:"文章预览",
                categoryList:categorys,
                article:article,
                saveBtn:"保存"
            });
        })
    });
}
exports.showDelArticle  = function(req,res){
    Article.findData({isdel:true},function (err,result) {
        if(err) throw err;
        res.render("index",{
            type:"delArticle",
            list:result
        })
    })
};
exports.getAll = function(req,res){
    Category.findById(req.query.cid,function(err,result){
        if(err) throw err;
        if(!result) return ;
        Article.getList(result)
            .then(function(list){
                res.send(list);
            });

    });
}
exports.getArticleDetailCategoryList = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields) {
        if(err) throw err;
        Article.getArticlesByCategory(fields)
            .then(function(articles){
                res.send(articles);
            });
    })
};
