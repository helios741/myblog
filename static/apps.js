
"use strict";
var app = angular.module("myBlog", [
    "ngRoute",
    "LocalStorageModule",
    "myBlog.controllers.index",
    "myBlog.controllers.articleDetail",
    "myBlog.directives.marked",
    "myBlog.directives.comment",
    "myBlog.services.articleDetailModule"
]);

app.constant("AppConfig",{
    pageSize:3
});

app.config(["$routeProvider",function($routeProvider){
    $routeProvider.otherwise({
        redirectTo:'/index/1'
    })
}]);
