(function(angular){

    var index = angular.module("myBlog.controllers.index",["ngRoute"]);
    index.config(["$routeProvider",function($routeProvider){
        $routeProvider.when("/index",{
            templateUrl:"./controllers/index/show_index.html",
            controller:"Index"
        })
    }]);
    index.controller("Index",["$scope","$http",function($scope,$http){
        $http
            .get("data/index.json",{id:1})
            .then(function(res){
                $scope.articleList = res.data.data;
                
            },
            function(){
                console.log("读取文章列表失败");
            });
    }]);

})(angular);
