var Category = require("../models/category"),
    Article  =require("../models/article");

exports.save = function(req,res){
    var categoryArr = req.query.category.split(","),
        categoryTot = categoryArr.length,
        aid = req.query.aid,
        unCategoryStrArr = req.query.unCategoryStr.split(","),
        unCategoryStrTot = unCategoryStrArr.length;
    (function iterator(i){

        if(i>=categoryTot ||(categoryTot==1&&categoryArr[0]=="") ){
            return ;
        }
        Category.findById(categoryArr[i],function(err,result){
            Article.findBy_Id(aid,function(err,res3){
                if(err){
                    console.log(err);
                    return ;
                }
                if(-1!=result.list.indexOf(res3.articleId))  {
                    iterator(i+1);
                    return ;
                }
                var list = result.list;
                list.push(res3.articleId);
                Category.where({id:categoryArr[i]}).update({list:list},function(err,res2){
                    if(err){
                        console.log(err);
                        return ;
                    }
                    iterator(i+1);
                });
            })
        })
    })(0);
    (function iterator1(i){
        if(i>=unCategoryStrTot ||(unCategoryStrTot==1&&unCategoryStrArr[0]=="")) return;
        Category.findById(unCategoryStrArr[i],function(err,result){
            if(!result){
                iterator1(i+1);
                return ;
            }
            Article.findBy_Id(aid,function(err,res3){
                if(err){
                    console.log(err);
                    return ;
                }
                var Index  = result.list.indexOf(res3.articleId);
                if(-1!=Index)  {
                    iterator1(i+1);
                    return ;
                }
                var list = result.list;
                list.splice(Index,1);
                Category.where({id:unCategoryStrArr[i]}).update({list:list},function(err,res2){
                    if(err){
                        console.log(err);
                        return ;
                    }
                    iterator1(i+1);
                });
            })
        })
    })(0)
    Article.saveNewCategory(aid,categoryArr,function(err,result){
        if(err){
            console.log(err);
            res.send("-1");
            return ;
        }
        res.send("1");
    })
}
exports.Show = function(req,res){
    Category.fetch(function(err,result){
        if(err){
            console.log(err);
            return ;
        }

        res.render("index",{
            type:"categoryShow",
            categoryList:result
        });
    });
}
exports.showCategoryDetail = function(req,res,next){
    id  = parseInt(req.params.id);
    if(!id) {
        res.send("-1");
        return ;
    }
    Category.findById(id,function(err,result){
        if(err){
            next();
            return ;
        }
        if(!result) return ;
        var
           listTot = result.list.length,
           articleArr = [];
        (function iterator(i){
            if(i>=listTot){
                res.render("index",{
                    type:"categoryDetail",
                    title:result.name,
                    articleDetailList : articleArr
                });
                return ;
            }
            Article.findById(result.list[i],function(err,res2){
                if(err){
                    console.log(err);
                    return ;
                }
                if(res2)  articleArr.push(res2);
                iterator(i+1);
            });
        })(0);
    });
}
exports.del = function(req,res,next){
    var id = req.params.id;
    console.log(id);
    Category.findById(id,function (err,result) {
        if(err){
            console.log(err);
            next();return ;
        }
        var list =  result.list,
            listTot  = list.length;
         (function iterator(i) {
            if(i>=listTot){

                return ;
            }
            Article.findById(list[i],function(err,res2){
                if(err){
                    console.log(err);
                    return ;
                }
                var categoryList = res2.category;
                if(-1==categoryList.indexOf(id)){
                    iterator(i+1)
                }
                categoryList = categoryList.splice(categoryList.indexOf(id),1);
                Article.where({articleId:list[i]}).update({category:categoryList},function(err,res3){
                    if(err){
                        console.log(err);
                        return ;
                    }
                    iterator(i+1);
                })
            });
        })(0)
        Category.removeById(id,function(err,res2){
            if(err){
                console.log(err);
                res.send("-1");
                return ;
            }
            res.send("1");
        });
    })
}
