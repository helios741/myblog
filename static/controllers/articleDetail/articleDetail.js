(function(angular){

    var index = angular.module("myBlog.controllers.index",["ngRoute"]);
    index.config(["$routeProvider",function($routeProvider){
        $routeProvider.when("/detail/:articleid",{
            templateUrl:"./controllers/articleDetail/view.html",
            controller:"ArticleDetail"
        })
    }]);
    index.controller("ArticleDetail",[
        "$scope","$route","$routeParams","$http",
        function($scope,$route,$routeParams,$http){
            console.log("aaa");
            $http
                .get("data/article.json",{})
                .then(function(res){
                    $scope.article = res.data[0].data;
                    console.log(marked(res.data[0].data.content));
                    $scope.article.content  = marked(res.data[0].data.content);
                    $('pre code').each(function(i, block) {
                        hljs.highlightBlock(block);
                    });
                },
                function(){
                    console.log("读取文章详细错误");
                });
        }
    ]);

})(angular);
