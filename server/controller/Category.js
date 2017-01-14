var Category = require("../models/category"),
    Article  =require("../models/article");

exports.save = function(req,res){
    var categoryArr = req.query.category.split(","),
        categoryTot = categoryArr.length,
        aid = req.query.aid;
    
    (function iterator(i){
        if(i>=categoryTot){
            return ;
        }
        Category.findById(categoryArr[i],function(err,result){
            if(-1!=result.list.indexOf(aid))  return ;
            Article.findBy_Id(aid,function(err,res3){
                if(err){
                    console.log(err);
                    return ;
                }
                list = result.list;
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
