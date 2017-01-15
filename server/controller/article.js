var Article = require("../models/article");
var DB = require("../models/db");
var formidable  = require("formidable");
var mongoose = require("mongoose");
var Category = require("../models/category");
mongoose.Promise = require('bluebird');
//展示管理员界面
exports.ArticleList = function(req,res){
    //没有登录不能进入这个页面
    /*if(!req.session.name){
     res.redirect("/login");
     }*/
    var data ={isdel:false};
    if(req.query.hidden){
        data.hidden = req.query.hidden;
    }
    Category.fetch(function(err,result){
        if(err){
            console.log(err);
            return ;
        }
        Article.findData(data,function(err,result2){
            if(err){
                console.log(err);
                return ;
            }
            res.render("index",{
                type:"articleList",
                title:"文章列表",
                articleList:result2,
                categoryList:result
            });
        })
    })

}
exports.newArticle  = function(req,res){

    Category.fetch(function(err,result){
        if(err){
            console.log(err);
            return ;
        }
        res.render("index",{
            type:"newArticle",
            title:"新建文章",
            categoryList:result,
            saveBtn:"发表",
            article:""
        });
    })
}
exports.doNewArticle = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields){
        if(err){
            console.log(err);
            res.send("-1");
            return ;
        }

        //文章的ID
        var aid = (Math.random()*10000+89999)>>0;
        //创建新的分类
        var newCateGoryArr =  fields.newCategory.split(","),
            categoryArr = [],
            newCategoryLen = newCateGoryArr.length,
            existCategory = fields.category.split(","),
            existCategoryLen = existCategory.length,
            unCategoryStr = fields.unCategoryStr;
        for(var i=0;i<existCategoryLen;i++) {
            if(existCategory[i]=="") continue;
            categoryArr.push(parseInt(existCategory[i]));
        }
        if(fields._id){

            (function iterator(i){
                if(i>=newCategoryLen){
                    Article.update({_id:fields._id},{
                        title: fields.title,
                        content: fields.content,
                        category: categoryArr,
                        keyword: fields.keyword.split(","),
                        hidden: fields.hidden,
                        desc: fields.desc
                    },function(err,result){
                        if(err){
                            console.log(err);
                            res.send("-1");
                        }
                        res.send("1");
                    });
                    return ;
                }
                Category.createNewCategory(newCateGoryArr[i],aid,function(err,result){
                    if(err){
                        console.log(err);
                        return ;
                    }
                    categoryArr.push(result.id);
                    iterator(i+1);
                });
            })(0);
            return ;
        }
        (function iterator(i){
            if(i>=newCategoryLen || (newCategoryLen==1 && newCateGoryArr[0]=="") ){
                Article.createOneArticle({
                    articleId: aid,
                    title: fields.title,
                    content: fields.content,
                    category: categoryArr,
                    keyword: fields.keyword.split(","),
                    hidden: fields.hidden,
                    desc: fields.desc,
                    isdel:false
                },function(err,result){
                    if(err){
                        console.log(err);
                        res.send("-1");
                        return ;
                    }
                    res.redirect("/admin/category/save?aid="+result._id+"&category="+fields.category+"&unCategoryStr="+unCategoryStr)
                    // res.send("1");
                });
                return ;
            }
            Category.createNewCategory(newCateGoryArr[i],aid,function(err,result){
                if(err){
                    console.log(err);
                    return ;
                }
                categoryArr.push(result.id);
                iterator(i+1);
            });
        })(0);

    })
}
exports.delArticle = function(req,res){
    var _id = req.query._id;
    Article.findBy_Id(_id,function(err,result){
        if(err){
            csonole.log(err);
            return ;
        }
        var category = result.category,
            categoryTot  =  category.length,
            aid = result.articleId;
        (function iterator(i){
            if(i>=categoryTot) {
                Article.removeBy_Id(_id,function(err,res3){
                    if(err){
                        csonole.log(err);
                        return ;
                    }
                    if( (1==res3.ok && res3.n==0) || !res3.ok ) {
                        res.send("0");
                        return ''
                    }
                    res.send("1");
                });
                return ;
            }
            Category.findById(category[i],function(err,res2){
                if(err){
                    csonole.log(err);
                    return ;
                }
                var list =[];
                if(!res2 || res2.list.indexOf(aid)==-1 ){
                    iterator(i+1);
                    return ;
                }
                list = res2.list;
                list.splice(res2.list.indexOf(aid),1);
                Category.where({id:category[i]}).update({list:list},function (err,r) {
                    if(err){
                        csonole.log(err);
                        return ;
                    }
                    console.log("R:"+r);
                    iterator(i+1);
                });
            })
        })(0);
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
exports.getArticleList = function(req,res){
    Article.findByData(req.query,function(err,result){
        if(err){
            console.log(err);
            return ;
        }
        res.send(result);
    });
}
exports.getAllArticle =  function(req,res){
    Article.countAllData(function(err,result){
        if(err){
            console.log(err);
            return ;
        }
        res.send(result);
    })
}
exports.editArticle  =function(req,res){
    var _id = req.params._id;
    Article.findBy_Id(_id,function(err,result){
        if(err){
            console.log(err);
            return ;
        }
        Category.fetch(function(err,result2){
            if(err){
                console.log(err);
                return ;
            }
            res.render("index",{
                type:"newArticle",
                title:"新建文章",
                categoryList:result2,
                article:result,
                saveBtn:"保存"
            });
        })
    });
}
exports.articlePreview = function(req,res){
    var _id = req.params._id;
    Article.findBy_Id(_id,function(err,result){
        if(err){
            console.log(err);
            return ;
        }
        Category.fetch(function(err,result2){
            if(err){
                console.log(err);
                return ;
            }
            res.render("index",{
                type:"preview",
                title:"文章预览",
                categoryList:result2,
                article:result,
                saveBtn:"保存"
            });
        })
    });
}
