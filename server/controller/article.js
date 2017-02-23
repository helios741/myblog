var Article = require("../models/article"),
    DB = require("../models/db"),
    formidable  = require("formidable"),
    mongoose = require("mongoose"),
    Category = require("../models/category"),
    fs = require("fs");
mongoose.Promise = require('bluebird');
//展示管理员界面
exports.ArticleList = function(req,res){
    let data ={isdel:false};
    let  categoryList;
    if(req.query.hidden){
        data.hidden = req.query.hidden;
    }
    Category.fetch()
        .then( ((categorys)=>{
            categoryList = categorys;
            return Article.findData(data);
        }))
        .then( (list)=>
            res.render("index",{
                type:"articleList",
                title:"文章列表",
                articleList:list,
                categoryList:categoryList
            })
        );
};
exports.newArticle  = function(req,res){
    Category.fetch()
        .then((result)=>
            res.render("index",{
                type:"newArticle",
                title:"新建文章",
                categoryList:result,
                saveBtn:"发表",
                article:""
            })
        );

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
    let _id = req.query._id;
    Article.findBy_Id(_id)
        .then((article)=>Article.delArticle(article,_id))
        .then((status)=>res.send(status))
        .catch((err)=>console.error("error:"+err));
};
exports.getArticleDetail = function(req,res){
    var articleId = parseInt(req.params.id.slice(1));
    Article.update({articleId:articleId}, {$inc: {pv: 1}}, (err)=>err?console.error(err):null);
    Article.findById(articleId)
        .then((article)=>res.send(article))
        .catch((err)=>console.error(err));
};
exports.getArticleList = function(req,res){
    console.log(req.query);
    Article.findByData(req.query)
        .then((article)=>res.send(article))
        .catch((err)=>console.error(err));
};
exports.getAllArticle =  function(req,res){
    Article.countAllData()
        .then((count)=>res.send(count))
        .catch((err)=>console.error(err));
};
exports.editArticle  =function(req,res){
    let _id = req.params._id,
    _article;
    Article.findBy_Id(_id)
        .then( ( (article)=>{
            _article = article;
            return Category.fetch()
        } ))
        .then((categorys)=>
            res.render("index",{
                type:"newArticle",
                title:"编辑文章",
                categoryList:categorys,
                article:_article,
                saveBtn:"保存"
            })
        )
        .catch((err)=>console.error(err));
};
exports.articlePreview = function(req,res){
    var _id = req.params._id,
        _article;
    Article.findBy_Id(_id)
        .then(((article)=>{
            _article = article;
            return Category.fetch();
        }))
        .then((categorys)=>
            res.render("index",{
                type:"preview",
                title:"文章预览",
                categoryList:categorys,
                article:_article,
                saveBtn:"保存"
            })
        )
        .catch((err)=>console.error(err));
};
exports.showDelArticle  = function(req,res){
    Article.findData({isdel:true})
        .then((list)=>
            res.render("index",{
                type:"delArticle",
                list:list
            })
        )
        .catch((err)=>console.error(err));
};
exports.getAll = function(req,res){
    Category.findById(req.query.cid)
        .then(((category)=>{
            if(!category) return ;
            return Article.getList(category);
        }))
        .then((list)=>res.send(list))
        .catch((err)=>console.error(err));

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
