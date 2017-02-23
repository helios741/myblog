;(function(angular){
    var categoryDetail = angular.module("myBlog.services.categoryDetail",[]);
    categoryDetail.service("categoryDetailService",["$http","$q",function($http,$q){
        this.getAllArticle = function(cid){
            var deferred = $q.defer(),
                promise = deferred.promise;
            $http({  
                method:"get",
                url:"/admin/article/getAll?cid="+cid
            }).then(function success(articles){
                deferred.resolve(articles.data);
            },function error(err){
                console.error(err);
            });
            return promise;
        }

    }]);
})(angular);
