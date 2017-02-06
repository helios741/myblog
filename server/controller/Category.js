var Category = require("../models/category"),
    Article  =require("../models/article");

exports.save = function(req,res){
    Category.saveCategory(req,Article);
    Article.saveNewCategory(req.query.aid,req.query.category.split(","),function(err){
        if(err){
            console.log(err);
            res.send("-1");
            return ;
        }
        res.send("1");
    })
};
exports.Show = function(req,res){
    Category.fetch(function(err,result){
        if(err) throw err;
        res.render("index",{
            type:"categoryShow",
            categoryList:result
        });
    });
};
exports.showCategoryDetail = function(req,res){
    id  = parseInt(req.params.id);
    if(!id) {
        res.send("-1");
        return ;
    }
    Category.findById(id,function(err,categorys){
        if(err){
            next();
            return ;
        }
        if(!categorys) return ;
        Category.getArticleList(categorys,Article)
            .then(function(articleArr){
                res.render("index",{
                    type:"categoryDetail",
                    title:categorys.name,
                    articleDetailList : articleArr
                });
            });
    });
};
exports.del = function(req,res,next){
    var id = req.params.id;
    Category.findById(id,function (err,categorys) {
        if(err){
            console.log(err);
            next();return ;
        }
        Category.del(categorys,Article,id);
        Category.removeById(id,function(err){
            if(err){
                console.log(err);
                res.send("-1");
            }
            res.send("1");
        });
    })
};
exports.indexGet = function(req,res){
    Category.indexGet(req.query,function(err,category){
        if(err) throw err;
        res.send(category);
    });
};
exports.getInfo = function(req,res){
    var aid = req.params.aid;
    Article.findById(aid,function(err,article){
        if(err) throw err;
        res.send(article);
    });
};
exports.getCategoryInfo = function(req,res){
    var cid = req.params.cid;
    Category.findById(cid,function(err,category){
        if(err) throw err;
        res.send(category);
    })
}
