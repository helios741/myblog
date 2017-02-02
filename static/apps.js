
"use strict";
var app = angular.module("myBlog", [
    "ngRoute",
    "LocalStorageModule",
    "myBlog.directives.marked",
    "myBlog.directives.comment",
    "myBlog.services.marked",
    "myBlog.controllers.index",
    "myBlog.controllers.articleDetail",
    "myBlog.controllers.indexCategoryShow",
    "myBlog.controllers.categoryShowDetail",
    "myBlog.services.indexCategory",
    "myBlog.services.articleDetailModule",
    "myBlog.services.categoryDetail",
    "myBlog.services.getArticle",
    "myBlog.services.getArticleDetailCategory"
]);

app.constant("AppConfig",{
    pageSize:3,
    indexCategorySize : 5
});

app.config(["$routeProvider",function($routeProvider){
    $routeProvider.otherwise({
        redirectTo:'/index/1'
    })
}]);
