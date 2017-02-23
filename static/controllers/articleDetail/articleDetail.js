(function(angular){
    var index = angular.module("myBlog.controllers.index",["ngRoute"]);
    index.config(["$routeProvider",function($routeProvider){
        $routeProvider.when("/detail/:articleid",{
            templateUrl:"./controllers/articleDetail/view.html",
            controller:"ArticleDetail"
        })
    }]);
    index.controller("ArticleDetail",[
        "$scope","$route","$routeParams","$http","$location",
        "localStorageService","commentService","articleDetailCategory","markd",
        function($scope,$route,$routeParams,$http,$location,localStorageService,
                 commentService,articleDetailCategory,markd){
            $scope.commentFormData = {
                nick:localStorageService.get("nick") || "",
                email:localStorageService.get("email") || ""
            };
            $scope.dirname = $location.$$absUrl;
            //$scope.dirname = "/#!"+$location.$$path;
            var aid = $routeParams.articleid;  //文章的ID
                //tid = "",                           //评论回复给的那个人的ID
                //cid = "";                           //该条评论ID

            $scope.replayComment = function($event){
                cid = $($event.target).data("cid");
                tid = $($event.target).data("tid");
                localStorageService.set("cid",cid);
                localStorageService.set("tid",tid);

            };

            $scope.addComment = function(){
                var tmpNick = localStorageService.get("nick"),
                    tmpEmail= localStorageService.get("email"),
                    cid = localStorageService.get("cid") || "",
                    tid = localStorageService.get("tid") ||"";
                localStorageService.remove("cid");
                localStorageService.remove("tid");
                // TODO 天亮从这里开始，评论回复模块
                if(!tmpNick || $scope.commentFormData.email != tmpEmail  ){
                    commentService.saveUser($scope.commentFormData)
                        .then(function(newUser){
                            //TODO 准备开始评论模块
                            $scope.commentFormData.from = newUser.data._id;
                            $scope.commentFormData.article = $scope.article._id;
                            $scope.commentFormData.cid = cid;
                            $scope.commentFormData.tid = tid;
                            commentService.saveComment($scope.commentFormData,function(){
                                location = "/#!"+$location.$$path;
                            });
                        });
                } else if($scope.commentFormData.email == tmpEmail && $scope.commentFormData.nick!=tmpNick){
                    alert("请不要更换用户名："+tmpNick);
                    return ;
                } else if($scope.commentFormData.email==tmpEmail && tmpNick==$scope.commentFormData.nick){
                    commentService.findExistUser($scope.commentFormData.nick)
                        .then(function(existUser){
                            $scope.commentFormData.from = existUser.data._id;
                            $scope.commentFormData.article = $scope.article._id;
                            $scope.commentFormData.cid = cid;
                            $scope.commentFormData.tid = tid;
                            commentService.saveComment($scope.commentFormData,function(comments){
                                //console.log(comments);
                                location = "/#!"+$location.$$path;
                            });

                        });
                }else {
                    return ;
                }
            };
            articleDetailCategory.getCategory(aid)
                .then(function(cid){
                    return articleDetailCategory.getCategoryOtherArticle(cid)
                })
                .then(function(category){
                    if(!category.data) return [];   
                    var aList = category.data.list.splice(0,5);
                    $scope.catgoryName = category.data.name;
                    return articleDetailCategory.getArticleList(aList);
                })
                .then(function(list){
                    $scope.articleList = list;
                });
            markd.renderMD(aid,function(article){
                $scope.article = article;
                /*
                 * 这里还由于技术水平有限，只能在这里简单的操作一下DOM，日后有能力改之
                 * @time  2017-1-11 19:43
                 * @author Helios
                 */
                $("#marked").html(marked(article.content));
                $('pre code').each(function(i, block) {
                    hljs.highlightBlock(block);
                });
                markd.renderComment($scope.article._id,function(comments){
                    $scope.comments = comments;

                })
            });
        }
    ]);

})(angular);
