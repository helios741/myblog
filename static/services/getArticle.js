(function(angular){
    var getArticle = angular.module("myBlog.services.getArticle",[]);
    getArticle.service("getArticleService",["$http",function($http){
        this.getArticle = function(currentPage,start,count,cb){
            $http({
                    method:"GET",
                    url:"/admin/article/getArticleList/"+currentPage+"?start="+start+"&count="+count
                })
                .then(function(res){
                    cb(res.data);
                },
                function(){
                    console.log("读取文章列表失败");
                });
            this.getArticleCount =function(cb){
                $http
                    .get("/admin/article/getAllArticle")
                    .then(function(count){
                        cb(count.data.length);
                    })
            }
        }
    }]);
})(angular)
