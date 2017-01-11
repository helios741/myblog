
"use strict";
var app = angular.module("myBlog", [
    "ngRoute",
    "myBlog.controllers.index",
    "myBlog.controllers.articleDetail"
]);

app.constant("AppConfig",{
    pageSize:3
});

app.config(["$routeProvider",function($routeProvider){
    $routeProvider.otherwise({
        redirectTo:'/index/1'
    })
}]);
