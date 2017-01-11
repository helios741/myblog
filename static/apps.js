
"use strict";
var app = angular.module("myBlog", [
    "ngRoute",
    "myBlog.controllers.index"
]);

app.config(["$routeProvider",function($routeProvider){
    $routeProvider.otherwise({
        redirectTo:'/index'
    })
}]);
