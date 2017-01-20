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
            $scope.commentFormData = {
                nick:localStorageService.get("nick") || "",
                email:localStorageService.get("email") || ""
            };
            $scope.dirname = $location.$$absUrl;
            //debugger;
            var aid = $routeParams.articleid,  //文章的ID
                tid = "",                           //评论回复给的那个人的ID
                cid = "";                           //该条评论ID
            $scope.addComment = function(){
                var tmpNick = localStorageService.get("nick"),
                    tmpEmail= localStorageService.get("email");

                console.log("cid:"+cid);
                if(cid){
                    // TODO 天亮从这里开始，评论回复模块
                    return ;
                }
                if(!tmpNick || $scope.commentFormData.email != tmpEmail  ){
                    commentService.saveUser($scope.commentFormData,function(newUser){
                        //TODO 准备开始评论模块
                        $scope.commentFormData.from = newUser.data._id;
                        $scope.commentFormData.article = $scope.article._id;
                        commentService.saveComment($scope.commentFormData);
                    });
                } else if($scope.commentFormData.email == tmpEmail && $scope.commentFormData.nick!=tmpNick){
                    alert("请不要更换用户名："+tmpNick);
                    return ;
                } else if($scope.commentFormData.email==tmpEmail && tmpNick==$scope.commentFormData.nick){
                    commentService.findExistUser($scope.commentFormData.nick,function(existUser){
                        $scope.commentFormData.from = existUser.data._id;
                        $scope.commentFormData.article = $scope.article._id;
                        commentService.saveComment($scope.commentFormData);
                    });
                }else {
                    return ;
                }
                /*$http
                    .get("/admin/user/")*/
            };

            $scope.replayComment = function($event){
                console.log("Sssss");
                cid = $($event.target).data("cid");
                tid = $($event.target).data("tid");
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
                    //下面是进行评论的模块
                    $http
                        .get("admin/comment/getAll?id="+$scope.article._id,{})
                        .then(function(comments){
                                $scope.comments = comments.data;
                            },
                            function(){
                                console.log("获取评论失败");
                            });




                    //分类模块
                    /*$http.get("data/category.json",{id:res.data.data.category})
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
                        })*/

                },
                function(){
                    console.log("读取文章详细错误");
                });
        }
    ]);

})(angular);
