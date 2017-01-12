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
*/
module.exports = Article;
