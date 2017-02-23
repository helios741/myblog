(function (angular) {
    var marked = angular.module("myBlog.services.marked",[]);
    marked.service("markd",["$http",function($http){
        this.renderMD = function(aid,cb){
            $http
                .get("/admin/article/getArticle/:"+aid)
                .then(function(res){
                    cb(res.data);
                }, 
                function(){
                    console.log("读取文章详细错误");
                });
        };

        this.renderComment = function(_id,cb){
            //下面是进行评论的模块
            $http
                .get("admin/comment/getAll?id="+_id)
                .then(function(comments){
                        cb(comments.data);
                    }, 
                    function(){
                        console.log("获取评论失败");
                    }
                );
        }

    }]);
})(angular);
