var mongoose  = require("mongoose");
var CategorySchema = require("../schemas/category");
var Category = mongoose.model("Category",CategorySchema);

Category.createNewCategory=function(newCategory,aid,cb){
    new Category({
        id:(Math.random()*110000+99999)>>0,
        name:newCategory,
        list:[aid]
    }).save(cb);
};
//TODO 这里写残了，明天继续开始
//还有前台的同类别的文章展示
Category.saveCategory = function(req,Article){
    var categoryArr = req.query.category.split(","),
        categoryTot = categoryArr.length,
        aid = req.query.aid,
        unCategoryStrArr = req.query.unCategoryStr.split(","),
        unCategoryStrTot = unCategoryStrArr.length;
    let category,
        TCategory;
    console.log(categoryArr);
    console.log(unCategoryStrArr);
    (function iterator(i){
        if(i>=categoryTot ||(categoryTot==1&&categoryArr[0]=="") ) return ;
        Category.findById(categoryArr[i])
            .then(((_category)=>{
               category = _category;
                return Article.findBy_Id(aid);
            }))
            .then(((article)=>{
                if( !category || -1!=category.list.indexOf(article.articleId))  {
                    iterator(i+1);
                    return ;
                }
                var list = category.list;
                list.push(article.articleId);
                Category.where({id:categoryArr[i]}).update({list:list},function(err){
                    if(err) throw err;
                    iterator(i+1);
                });
            }));

    })(0);


    (function iterator1(i){
        if(i>=unCategoryStrTot ||(unCategoryStrTot==1&&unCategoryStrArr[0]=="undefined")) return;
        console.log(unCategoryStrArr);
        Category.findById(unCategoryStrArr[i])
            .then(((_category)=>{
                console.log(_category);
                TCategory = _category;
                return Article.findBy_Id(aid);
            }))
            .then(((article)=>{
                var Index  = TCategory.list.indexOf(article.articleId);
                if(-1!=Index)  {
                    iterator1(i+1);
                    return ;
                }
                var list = TCategory.list;
                list.splice(Index,1);
                Category.where({id:unCategoryStrArr[i]}).update({list:list},function(err){
                    if(err) throw err;
                    iterator1(i+1);
                });
            }));

    })(0);
};

Category.getArticleList = function(categorys,Article){
    return new Promise(function(resolve,reject){
        var listTot = categorys.list.length,
            articleArr = [];
        console.log(categorys.list);
        (function iterator(i){
            if(i>=listTot){
                resolve(articleArr);
                return ;
            }
            Article.findById(categorys.list[i])
                .then(((article)=>{
                    if(article)  articleArr.push(article);
                    iterator(i+1);
                }));
        })(0);
    });

};
Category.del = function(categorys,Article,id){
    var list =  categorys.list,
        listTot  = list.length;
    (function iterator(i) {
        if(i>=listTot)  return ;
        Article.findById(list[i])
            .then(((article)=>{
                var categoryList = article ? article.category : null;
                if(!categoryList || -1==categoryList.indexOf(id)){
                    iterator(i+1)
                }
                categoryList = categoryList.splice(categoryList.indexOf(id),1);
                Article.where({articleId:list[i]}).update({category:categoryList},function(err){
                    if(err) throw err;
                    iterator(i+1);
                })
            }))

    })(0);
};
module.exports = Category;

