var mongoose  = require("mongoose");
var Category = require("./category");
var ArticleSchema = require("../schemas/article").ArticleSchema;
var Article = mongoose.model("Article",ArticleSchema);
var fs = require("fs");

Article.createOneArticle = function(data,cb){
    new Article(data).save(cb);
};
Article.saveNewCategory =function(_id,category,cb){
    Article.where({_id:_id}).update({$set:{category:category}},cb);
};
Article.updateArticle = function(fields,aid){
    return new Promise(function(resolve,reject){
        var newCateGoryArr =  fields.newCategory.split(","),
            categoryArr = [],
            newCategoryLen = newCateGoryArr.length,
            existCategory = fields.category.split(","),
            existCategoryLen = existCategory.length,
            unCategoryStr = fields.unCategoryStr;
        (function iterator(i){
            if(i>=newCategoryLen){
                Article.update({_id:fields._id},{
                    title: fields.title,
                    content: fields.content,
                    category: categoryArr,
                    keyword: fields.keyword.split(","),
                    hidden: fields.hidden,
                    desc: fields.desc
                },function(err){
                    if(err){
                        console.log(err);
                        reject("-1");
                    }
                    //TODO 把文件放入指定的文件夹内
                    fs.writeFile("./data/"+fields.title+".md",fields.content,function(err){
                        if(err){
                            throw err;
                        }
                        console.log("保存文件成功");
                    });
                    resolve("1");
                });
                return ;
            }
            Category.createNewCategory(newCateGoryArr[i],aid,function(err,result){
                if(err) throw err;
                categoryArr.push(result.id);
                iterator(i+1);
            });
        })(0);
    });
};
Article.createArticle = function(fields,aid,res){
    return new Promise(function(resolve,reject){
        var newCateGoryArr =  fields.newCategory.split(","),
            categoryArr = [],
            newCategoryLen = newCateGoryArr.length,
            existCategory = fields.category.split(","),
            existCategoryLen = existCategory.length,
            unCategoryStr = fields.unCategoryStr;
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
            },function(err,article){
                if(err){
                    console.log(err);
                    reject("-1");
                    return ;
                }
                //TODO 把文件放入指定的文件夹内
                fs.writeFile("./data/"+fields.title+".md",fields.content,function(err){
                    if(err) throw err;
                    console.log("保存文件成功");
                });
                res.redirect("/admin/category/save?aid="+article._id
                    +"&category="+categoryArr.join(",")
                    +"&unCategoryStr="+unCategoryStr)
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
    });
};
Article.delArticle = function(result,_id){
    return new Promise(function(resolve,reject){
        var category = result.category,
            categoryTot  =  category.length,
            aid = result.articleId;
        (function iterator(i){
            if(i>=categoryTot) {
                Article.removeBy_Id(_id,function(err,delMsg){
                    if(err) throw err;
                    if( (1==delMsg.ok && delMsg.n==0) || !delMsg.ok ) {
                        reject("0");
                        return ''
                    }
                    resolve("1");
                });
                return ;
            }
            Category.findById(category[i],function(err,delCategory){
                if(err) throw err;
                if(!delCategory || delCategory.list.indexOf(aid)==-1 ){
                    iterator(i+1);
                    return ;
                }
                var list = delCategory.list;
                list.splice(delCategory.list.indexOf(aid),1);
                Category.where({id:category[i]}).update({list:list},function (err) {
                    if(err){
                        csonole.log(err);
                        return ;
                    }
                    iterator(i+1);
                });
            })
        })(0);
    });

};
Article.getList = function(result){
    return new Promise(function(resolve,reject){
        var listTot = result.list.length,
            articleArr = [];
        (function iterator(i){
            if(i>=listTot){
                resolve(articleArr);
                return ;
            }
            Article.findById(result.list[i])
                .then(((article)=>{
                    if(article)  articleArr.push(article);
                    iterator(i+1);
                }))
                .catch((err)=>console.error(err));
        })(0);
    });

};
Article.getArticlesByCategory = function(fields){
    return new Promise(function(resolve,reject){
        var list = fields.list,
            len = list.length,
            articles = [];
        (function iterator(i){
            if(i>=len){
                resolve(articles);
                return ;
            }
            Article.findById(list[i],function(err,article){
                if(err) throw err;
                articles.push(article);
                iterator(i+1);
            });
        })(0);
    });

};
module.exports = Article;
