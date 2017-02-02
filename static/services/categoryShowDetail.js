(function(angular){
    var categoryDetail = angular.module("myBlog.services.categoryDetail",[]);
    categoryDetail.service("categoryDetailService",["$http",function($http){
        this.getAllArticle = function(cid,cb){
            $http({
                method:"get",
                url:"/admin/article/getAll?cid="+cid
            }).then(function success(articles){
                //console.log(articles);
                cb(articles.data);
            },function error(err){
                console.error(err);
            });
        }
        
    }]);
})(angular);
