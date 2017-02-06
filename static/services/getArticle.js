(function(angular){
    var getArticle = angular.module("myBlog.services.getArticle",[]);
    getArticle.service("getArticleService",["$http","$q",function($http,$q){
        this.getArticle = function(currentPage,start,count){
            var deferred = $q.defer();
            var promise = deferred.promise;
            $http({
                method:"GET",
                url:"/admin/article/getArticleList/"+currentPage+"?start="+start+"&count="+count
            }).then(function(res){
                    deferred.resolve(res.data);
            },
            function(){
                console.log("读取文章列表失败");
            });
            return promise;
        };
        this.getArticleCount =function(){
            var deferred = $q.defer();
            var promise = deferred.promise;
            $http
                .get("/admin/article/getAllArticle")
                .then(function successBack(count){
                    deferred.resolve(count.data.length);
                });
            return promise;
        }
    }]);
})(angular);
