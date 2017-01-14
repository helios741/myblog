var mongoose  = require("mongoose");
//mongoose.Promise = require('bluebird');
var ArticleSchema = require("../schemas/article").ArticleSchema;
var Article = mongoose.model("Article",ArticleSchema);
/*
var a = new Article({
    articleId:32323,
    title:"这是    标题",
    contentUrl:"./data/1.md",
    content:"#fdgs",
    category:[4,6],
    hidden:false
})
a.save();
*//*
var newArticle = new Article({
    articleId:aid,
    title:fields.title,
    content:fields.content,
    category:categoryArr,
    keyword:fields.keyword.split(","),
    hidden:fields.hidden,
    desc:fields.desc
});*/
Article.createOneArticle = function(data,cb){
    new Article(data).save(cb);
}
Article.saveNewCategory =function(_id,category,cb){
    Article.where({_id:_id}).update({$set:{category:category}},cb);
}


module.exports = Article;
