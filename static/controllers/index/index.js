(function(angular){

    var index = angular.module("myBlog.controllers.articleDetail",["ngRoute"]);
    index.config(["$routeProvider",function($routeProvider){
        $routeProvider.when("/index/:page",{
            templateUrl:"./controllers/index/show_index.html",
            controller:"Index"
        })
    }]);
    index.controller("Index",[
        "$scope","$route","$routeParams","$http","AppConfig","getArticleService",
        function($scope,$route,$routeParams,$http,AppConfig,getArticleService){
        $scope.currentPage = parseInt($routeParams.page);
        $scope.articleList = [];

         //后台发送的参数
         var count = AppConfig.pageSize,
             start = ($scope.currentPage-1)*count;
        //正在加载资源
         $scope.loading = true;
         getArticleService.getArticle($scope.currentPage,start,count,function(list){
             $scope.articleList  =list;
             getArticleService.getArticleCount(function(count){
                 $scope.totPage = Math.ceil(count/AppConfig.pageSize);
                 $scope.loading = false;
             });
         });

        //点击上一页和下一个的执行函数
        $scope.go = function(page){
            if(page<1 || page>$scope.totPage) return ;
            $route.updateParams({page:page});
        }
       

    }]);

})(angular);
