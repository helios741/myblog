(function(angular){
    var articleDetailCategory = angular.module("myBlog.services.getArticleDetailCategory",[]);
    articleDetailCategory.service("articleDetailCategory",["$http",function($http){
        this.getCategory = function(aid,cb){
            //分类模块
            $http.get("/admin/category/getInfo/"+aid)
                .then(function(article){
                        category = article.data.category;
                        cb(category.length>1?category[0]:"-1");
                    },
                    function(){
                        console.error("获取文章类型失败");
                    }
                );
            this.getCategoryOtherArticle = function(cid,cb){
                $http.get("/admin/category/getCategoryInfo/"+cid)
                    .then(function(category){
                        cb(category);
                    },
                        function(){
                            console.error("获取其他文章出现错误");
                        }
                    );
            };

            this.getArticleList = function(List,cb){
                //$http.get("/admin/category/getArticleDetailCategoryList")
                $http({
                    method:"post",
                    url:"/admin/article/getArticleDetailCategoryList",
                    data:{
                        list:List
                    }
                }).then(function successCallback(list){
                    cb(list.data);
                },function errorCallback(){
                    console.error("error");
                });
            };
        };

    }]);
})(angular);
