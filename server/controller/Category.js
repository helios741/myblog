var Category = require("../models/category"),
    Article  =require("../models/article");

exports.save = function(req,res){
    console.log(req.query);
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
    Category.fetch()
        .then((categorys)=>
            res.render("index",{
                type:"categoryShow",
                categoryList:categorys
            })
        )
        .catch((err)=>console.error(err));
};
exports.showCategoryDetail = function(req,res){
    let id  = parseInt(req.params.id),
        _categorys;
    if(!id) {
        res.send("-1");
        return ;
    }
    Category.findById(id)
        .then(((categorys)=>{
            if(!categorys) return ;
            _categorys = categorys;
            return Category.getArticleList(categorys,Article);
        }))
        .then((articleArr)=>
            res.render("index",{
                type:"categoryDetail",
                title:_categorys.name,
                articleDetailList : articleArr
            })
        )
        .catch((err)=>console.error(err));
};
exports.del = function(req,res,next){
    let id = req.params.id;
    Category.findById(id)
        .then(((categorys)=>{
            Category.del(categorys,Article,id);
            return Category.removeById(id);

        }))
        .then((err)=>err?res.send("1"):res.send("-1"))
        .catch((err)=>console.error(err));
};
exports.indexGet = function(req,res){
    Category.indexGet(req.query)
        .then((category)=>res.send(category))
        .catch((err)=>console.log(err));
};
exports.getInfo = function(req,res){
    var aid = req.params.aid;
    Article.findById(aid)
        .then((article)=>res.send(article))
        .catch((err)=>console.error(err));
};
exports.getCategoryInfo = function(req,res){
    var cid = req.params.cid;
    Category.findById(cid)
        .then((category)=>res.send(category))
        .catch((err)=>console.error(err));
};
