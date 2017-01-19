(function(angular){

    var index = angular.module("myBlog.controllers.index",["ngRoute"]);
    index.config(["$routeProvider",function($routeProvider){
        $routeProvider.when("/detail/:articleid",{
            templateUrl:"./controllers/articleDetail/view.html",
            controller:"ArticleDetail"
        })
    }]);
    index.controller("ArticleDetail",[
        "$scope","$route","$routeParams","$http","$location","localStorageService","commentService",
        function($scope,$route,$routeParams,$http,$location,localStorageService,commentService){
            console.log(localStorageService);
            $scope.commentFormData = {
                nick:localStorageService.get("nick") || "",
                email:localStorageService.get("email") || ""
            };
            $scope.dirname = $location.$$absUrl;
            var aid = $routeParams.articleid;
            $scope.addComment = function(){
                var tmpNick = localStorageService.get("nick"),
                    tmpEmail= localStorageService.get("email");
                if(true){
                    commentService.saveUser($scope.commentFormData);
                }

                /*$http
                    .get("/admin/user/")*/
            }
            $http
                .get("/admin/article/getArticle/:"+aid,{})
                .then(function(res){
                   // console.log(res);debugger;
                    $scope.article = res.data;
                    /*
                    * 这里还由于技术水平有限，只能在这里简单的操作一下DOM，日后有能力改之
                    * @time  2017-1-11 19:43
                    * @author Helios
                     */
                    $("#marked").html(marked(res.data.content));
                    $('pre code').each(function(i, block) {
                        hljs.highlightBlock(block);
                    });
                    $http.get("data/category.json",{id:res.data.data.category})
                        .then(function(result){
                            $scope.category = result.data.data[0].name;
                            $http
                                .get("data/article.json",{})
                                .then(function(res2){
                                    $scope.articleList = res2.data.data;
                                },
                                function(){
                                    console.log("通过文章类型，获取文章失败");
                                });
                        },
                        function(){
                            console.log("获取文章类型失败");
                        })

                    //下面是进行评论的模块
                    $http
                        .get("data/comment.json",{})
                        .then(function(result){
                            $scope.commentList = result.data.data.comments;
                                $http
                                    .get("data/reply.json",{})
                                    .then(function(res2){
                                            $scope.replyList = res2.data.data.comments;
                                        },
                                        function(){
                                            console.log("获取评论回复失败");
                                        });
                        },
                        function(){
                            console.log("获取评论失败");
                        });
                },
                function(){
                    console.log("读取文章详细错误");
                });
        }
    ]);

})(angular);
