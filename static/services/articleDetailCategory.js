(function(angular){
    var articleDetailCategory = angular.module("myBlog.services.getArticleDetailCategory",[]);
    articleDetailCategory.service("articleDetailCategory",["$http","$q",function($http,$q){
        this.getCategory = function(aid){
            var deferred = $q.defer(),
                promise = deferred.promise;
            //分类模块
            $http.get("/admin/category/getInfo/"+aid)
                .then(function(article){
                        category = article.data.category;
                        deferred.resolve( (category.length>=1&&category[0])?category[0]:"-1");
                    },
                    function(){
                        console.error("获取文章类型失败");
                    }
                );
            return promise;
        };
        this.getCategoryOtherArticle = function(cid){
            var deferred = $q.defer(),
                promise = deferred.promise;
            $http.get("/admin/category/getCategoryInfo/"+cid)
                .then(function(category){
                    console.log(6666);
                        console.log(category);
                        deferred.resolve(category);
                    },
                    function(){
                        console.error("获取其他文章出现错误");
                    }
                );
            return promise;
        };

        this.getArticleList = function(List){
            var deferred = $q.defer(),
                promise = deferred.promise;
            //$http.get("/admin/category/getArticleDetailCategoryList")
            $http({
                method:"post",
                url:"/admin/article/getArticleDetailCategoryList",
                data:{
                    list:List
                }
            }).then(function successCallback(list){
                deferred.resolve(list.data);
            },function errorCallback(){
                console.error("error");
            });
            return promise;
        };
    }]);
})(angular);
