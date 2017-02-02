(function(angular){
    var categoryShowDetail = angular.module("myBlog.controllers.categoryShowDetail",["ngRoute"]);
    categoryShowDetail.config(["$routeProvider",function($routeProvider){
        $routeProvider.when("/category/:id/:page",{
            templateUrl:"./controllers/categoryShow/view.html",
            controller:"categoryShowDetailCtrl"
        });
    }]);
    categoryShowDetail.controller("categoryShowDetailCtrl",[
    "$scope","$routeParams","$route","categoryDetailService","getArticleService","AppConfig",
    function($scope,$routeParams,$route,categoryDetailService,getArticleService,AppConfig){
        $scope.currentPage = parseInt($routeParams.page);
        $scope.articleList = [];
        var cid = $routeParams.id;
        $scope.title = $routeParams.title;
        //后台发送的参数
        var count = AppConfig.pageSize,
            start = ($scope.currentPage-1)*count;
        //正在加载资源
        categoryDetailService.getAllArticle(cid,function(list){
            $scope.list = list.slice(start,start+count);
            $scope.totPage = Math.ceil(list.length/count);
        });
        //categoryDetailService.getPageArticles($scope.currentPage,start,count);

        //点击上一页和下一个的执行函数
        $scope.go = function(page){
            if(page<1 || page>$scope.totPage) return ;
            $route.updateParams({page:page});
        }
    }]);
})(angular);
