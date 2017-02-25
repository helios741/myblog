;(function(angular){
    var indexCategoryShow  = angular.module("myBlog.controllers.indexCategoryShow",[]);
    indexCategoryShow.controller("indexCategoryShow",[
        "$scope","$location","indexCategoryService",
        function($scope,$location,indexCategoryService){
            $scope.dirname = $location.$$absUrl;
            $scope.url = $location.$$host+":"+$location.$$port;
            indexCategoryService.getCategory()
                .then(function(categorys){
                    $scope.categorys = categorys;
                    $scope.clickMsg = "点击查看全部";
                });
            var flag = true;
            $scope.showAllCategory = function(){
                if(flag){
                    indexCategoryService.getAllCategory()
                        .then(function(categorys){
                            $scope.categorys = categorys;
                            $scope.clickMsg = "点击收起";
                        });
                }else{
                    indexCategoryService.getCategory()
                        .then(function(categorys){
                            $scope.categorys = categorys;
                            $scope.clickMsg = "点击查看全部";
                        });
                }
                flag = !flag;
            };
    }]);
})(angular);            




!function(o){var t=o.module("myBlog.controllers.indexCategoryShow",[]);t.controller("indexCategoryShow",["$scope","$location","indexCategoryService",function(o,t,e){o.dirname=t.$$absUrl,o.url=t.$$host+":"+t.$$port,e.getCategory().then(function(t){o.categorys=t,o.clickMsg="点击查看全部"});var n=!0;o.showAllCategory=function(){n?e.getAllCategory().then(function(t){o.categorys=t,o.clickMsg="点击收起"}):e.getCategory().then(function(t){o.categorys=t,o.clickMsg="点击查看全部"}),n=!n}}])}(angular);
!function(o){var t=o.module("myBlog.controllers.indexCategoryShow",[]);t.controller("indexCategoryShow",["$scope","$location","indexCategoryService",function(o,t,e){o.dirname=t.$$absUrl,o.url=t.$$host+":"+t.$$port,e.getCategory().then(function(t){o.categorys=t,o.clickMsg="点击查看全部"});var n=!0;o.showAllCategory=function(){n?e.getAllCategory().then(function(t){o.categorys=t,o.clickMsg="点击收起"}):e.getCategory().then(function(t){o.categorys=t,o.clickMsg="点击查看全部"}),n=!n}}])}(angular);
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
                //cid = "";                               //该条评论ID

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

!function(t){var e=t.module("myBlog.controllers.index",["ngRoute"]);e.config(["$routeProvider",function(t){t.when("/detail/:articleid",{templateUrl:"./controllers/articleDetail/view.html",controller:"ArticleDetail"})}]),e.controller("ArticleDetail",["$scope","$route","$routeParams","$http","$location","localStorageService","commentService","articleDetailCategory","markd",function(t,e,a,o,i,r,m,n,c){t.commentFormData={nick:r.get("nick")||"",email:r.get("email")||""},t.dirname=i.$$absUrl;var l=a.articleid;t.replayComment=function(t){cid=$(t.target).data("cid"),tid=$(t.target).data("tid"),r.set("cid",cid),r.set("tid",tid)},t.addComment=function(){var e=r.get("nick"),a=r.get("email"),o=r.get("cid")||"",n=r.get("tid")||"";if(r.remove("cid"),r.remove("tid"),e&&t.commentFormData.email==a){if(t.commentFormData.email==a&&t.commentFormData.nick!=e)return void alert("请不要更换用户名："+e);if(t.commentFormData.email!=a||e!=t.commentFormData.nick)return;m.findExistUser(t.commentFormData.nick).then(function(e){t.commentFormData.from=e.data._id,t.commentFormData.article=t.article._id,t.commentFormData.cid=o,t.commentFormData.tid=n,m.saveComment(t.commentFormData,function(t){location="/#!"+i.$$path})})}else m.saveUser(t.commentFormData).then(function(e){t.commentFormData.from=e.data._id,t.commentFormData.article=t.article._id,t.commentFormData.cid=o,t.commentFormData.tid=n,m.saveComment(t.commentFormData,function(){location="/#!"+i.$$path})})},n.getCategory(l).then(function(t){return n.getCategoryOtherArticle(t)}).then(function(e){if(!e.data)return[];var a=e.data.list.splice(0,5);return t.catgoryName=e.data.name,n.getArticleList(a)}).then(function(e){t.articleList=e}),c.renderMD(l,function(e){t.article=e,$("#marked").html(marked(e.content)),$("pre code").each(function(t,e){hljs.highlightBlock(e)}),c.renderComment(t.article._id,function(e){t.comments=e})})}])}(angular);
!function(t){var e=t.module("myBlog.controllers.index",["ngRoute"]);e.config(["$routeProvider",function(t){t.when("/detail/:articleid",{templateUrl:"./controllers/articleDetail/view.html",controller:"ArticleDetail"})}]),e.controller("ArticleDetail",["$scope","$route","$routeParams","$http","$location","localStorageService","commentService","articleDetailCategory","markd",function(t,e,a,o,i,r,m,n,c){t.commentFormData={nick:r.get("nick")||"",email:r.get("email")||""},t.dirname=i.$$absUrl;var l=a.articleid;t.replayComment=function(t){cid=$(t.target).data("cid"),tid=$(t.target).data("tid"),r.set("cid",cid),r.set("tid",tid)},t.addComment=function(){var e=r.get("nick"),a=r.get("email"),o=r.get("cid")||"",n=r.get("tid")||"";if(r.remove("cid"),r.remove("tid"),e&&t.commentFormData.email==a){if(t.commentFormData.email==a&&t.commentFormData.nick!=e)return void alert("请不要更换用户名："+e);if(t.commentFormData.email!=a||e!=t.commentFormData.nick)return;m.findExistUser(t.commentFormData.nick).then(function(e){t.commentFormData.from=e.data._id,t.commentFormData.article=t.article._id,t.commentFormData.cid=o,t.commentFormData.tid=n,m.saveComment(t.commentFormData,function(t){location="/#!"+i.$$path})})}else m.saveUser(t.commentFormData).then(function(e){t.commentFormData.from=e.data._id,t.commentFormData.article=t.article._id,t.commentFormData.cid=o,t.commentFormData.tid=n,m.saveComment(t.commentFormData,function(){location="/#!"+i.$$path})})},n.getCategory(l).then(function(t){return n.getCategoryOtherArticle(t)}).then(function(e){if(!e.data)return[];var a=e.data.list.splice(0,5);return t.catgoryName=e.data.name,n.getArticleList(a)}).then(function(e){t.articleList=e}),c.renderMD(l,function(e){t.article=e,$("#marked").html(marked(e.content)),$("pre code").each(function(t,e){hljs.highlightBlock(e)}),c.renderComment(t.article._id,function(e){t.comments=e})})}])}(angular);
(function(angular){

    var index = angular.module("myBlog.controllers.articleDetail",["ngRoute"]);
    index.config(["$routeProvider",function($routeProvider){
        $routeProvider.when("/index/:page",{
            templateUrl:"./controllers/index/show_index.html",
            controller:"Index"
        })
    }]);
    index.controller("Index",[
        "$scope","$route","$routeParams","$http","AppConfig","getArticleService",
        function($scope,$route,$routeParams,$http,AppConfig,getArticleService){
        $scope.currentPage = parseInt($routeParams.page);
        $scope.articleList = [];

         //后台发送的参数
         var count = AppConfig.pageSize,
             start = ($scope.currentPage-1)*count;
        //正在加载资源
         $scope.loading = true;
         getArticleService.getArticle($scope.currentPage,start,count)
             .then(function(list){ 
                 $scope.articleList  =list;
                 return getArticleService.getArticleCount();
             })
             .then(function(count){
                 $scope.totPage = Math.ceil(count/AppConfig.pageSize);
                 $scope.loading = false;
             });

        //点击上一页和下一个的执行函数
        $scope.go = function(page){
            if(page<1 || page>$scope.totPage) return ;
            $route.updateParams({page:page});
        }
    }]);

})(angular);

!function(e){var t=e.module("myBlog.controllers.articleDetail",["ngRoute"]);t.config(["$routeProvider",function(e){e.when("/index/:page",{templateUrl:"./controllers/index/show_index.html",controller:"Index"})}]),t.controller("Index",["$scope","$route","$routeParams","$http","AppConfig","getArticleService",function(e,t,n,r,o,a){e.currentPage=parseInt(n.page),e.articleList=[];var i=o.pageSize,l=(e.currentPage-1)*i;e.loading=!0,a.getArticle(e.currentPage,l,i).then(function(t){return e.articleList=t,a.getArticleCount()}).then(function(t){e.totPage=Math.ceil(t/o.pageSize),e.loading=!1}),e.go=function(n){n<1||n>e.totPage||t.updateParams({page:n})}}])}(angular);
!function(e){var t=e.module("myBlog.controllers.articleDetail",["ngRoute"]);t.config(["$routeProvider",function(e){e.when("/index/:page",{templateUrl:"./controllers/index/show_index.html",controller:"Index"})}]),t.controller("Index",["$scope","$route","$routeParams","$http","AppConfig","getArticleService",function(e,t,n,r,o,a){e.currentPage=parseInt(n.page),e.articleList=[];var i=o.pageSize,l=(e.currentPage-1)*i;e.loading=!0,a.getArticle(e.currentPage,l,i).then(function(t){return e.articleList=t,a.getArticleCount()}).then(function(t){e.totPage=Math.ceil(t/o.pageSize),e.loading=!1}),e.go=function(n){n<1||n>e.totPage||t.updateParams({page:n})}}])}(angular);
;(function(angular){
    var categoryShowDetail = angular.module("myBlog.controllers.categoryShowDetail",["ngRoute"]);
    categoryShowDetail.config(["$routeProvider",function($routeProvider){
        $routeProvider.when("/category/:id/:page",{
            templateUrl:"./controllers/categoryShow/view.html",
            controller:"categoryShowDetailCtrl"
        });
    }]);
    categoryShowDetail.controller("categoryShowDetailCtrl",[
    "$scope","$routeParams","$route","categoryDetailService","getArticleService","AppConfig",
    function($scope,$routeParams,$route,categoryDetailService,getArticleService,AppConfig){
        $scope.currentPage = parseInt($routeParams.page);
        $scope.articleList = [];
        var cid = $routeParams.id;   
        $scope.title = $routeParams.title;
        //后台发送的参数
        var count = AppConfig.pageSize,
            start = ($scope.currentPage-1)*count;
        //正在加载资源
        categoryDetailService.getAllArticle(cid)
            .then(function(list){
                $scope.list = list.slice(start,start+count);
                $scope.totPage = Math.ceil(list.length/count);
            });
        //点击上一页和下一个的执行函数
        $scope.go = function(page){
            if(page<1 || page>$scope.totPage) return ;
            $route.updateParams({page:page});
        }
    }]);
})(angular);

!function(e){var t=e.module("myBlog.controllers.categoryShowDetail",["ngRoute"]);t.config(["$routeProvider",function(e){e.when("/category/:id/:page",{templateUrl:"./controllers/categoryShow/view.html",controller:"categoryShowDetailCtrl"})}]),t.controller("categoryShowDetailCtrl",["$scope","$routeParams","$route","categoryDetailService","getArticleService","AppConfig",function(e,t,r,o,a,l){e.currentPage=parseInt(t.page),e.articleList=[];var i=t.id;e.title=t.title;var c=l.pageSize,n=(e.currentPage-1)*c;o.getAllArticle(i).then(function(t){e.list=t.slice(n,n+c),e.totPage=Math.ceil(t.length/c)}),e.go=function(t){t<1||t>e.totPage||r.updateParams({page:t})}}])}(angular);
!function(e){var t=e.module("myBlog.controllers.categoryShowDetail",["ngRoute"]);t.config(["$routeProvider",function(e){e.when("/category/:id/:page",{templateUrl:"./controllers/categoryShow/view.html",controller:"categoryShowDetailCtrl"})}]),t.controller("categoryShowDetailCtrl",["$scope","$routeParams","$route","categoryDetailService","getArticleService","AppConfig",function(e,t,r,o,a,l){e.currentPage=parseInt(t.page),e.articleList=[];var i=t.id;e.title=t.title;var c=l.pageSize,n=(e.currentPage-1)*c;o.getAllArticle(i).then(function(t){e.list=t.slice(n,n+c),e.totPage=Math.ceil(t.length/c)}),e.go=function(t){t<1||t>e.totPage||r.updateParams({page:t})}}])}(angular);
(function(angular){
    var marked  = angular.module("myBlog.directives.marked",[]);
    marked.directive("markedRender",["$location",function($location){
        return {
            restrict: 'AE',
            replace:true,
            transclude:true,
            template:' <div  id="marked" class="detail-content">{{article.content}}</div>',
        } 
    }]);
})(angular);

!function(e){var t=e.module("myBlog.directives.marked",[]);t.directive("markedRender",["$location",function(e){return{restrict:"AE",replace:!0,transclude:!0,template:' <div  id="marked" class="detail-content">{{article.content}}</div>'}}])}(angular);
!function(e){var t=e.module("myBlog.directives.marked",[]);t.directive("markedRender",["$location",function(e){return{restrict:"AE",replace:!0,transclude:!0,template:' <div  id="marked" class="detail-content">{{article.content}}</div>'}}])}(angular);
(function(angular){
    var comment = angular.module("myBlog.directives.comment",[]);
    comment.directive("commentTitle",[function(){
        return {
            restrict:"AE",
            replace:true,
            transclude: true,
            template:'<section class="submit-comment" id="submitComment"><div ng-transclude></div></section>',
            controller:function($scope){
                this.toggleFrom = function(){
                    this.form = true;
                };
                this.form = false;
            }
        }
    }]);
    comment.directive("submitComment",[function(){
        return {
            restrict:"AE",
            replace:true,
            require:"^commentTitle",
            template:'<a class="submit-comment" style="cursor: pointer">点击发表</a>',
            link : function(scope,element,attrs,ctrl){
                //scope.toggle = function()
                element.bind("click",function(){
                    ctrl.toggleFrom();
                });
            }
        }
    }])
    comment.directive("commentForm",[function(){
        return {
            restrict:"AE",
            replace:true,
            transclude: true,
            scope:{

            },
            require:"^commentTitle",
            template:'<form  id="commentForm" ><div ng-transclude></div></form>',
            link : function(scope,element,attrs,ctrl) {
            }
        }
    }])
})(angular)

!function(t){var e=t.module("myBlog.directives.comment",[]);e.directive("commentTitle",[function(){return{restrict:"AE",replace:!0,transclude:!0,template:'<section class="submit-comment" id="submitComment"><div ng-transclude></div></section>',controller:function(t){this.toggleFrom=function(){this.form=!0},this.form=!1}}}]),e.directive("submitComment",[function(){return{restrict:"AE",replace:!0,require:"^commentTitle",template:'<a class="submit-comment" style="cursor: pointer">点击发表</a>',link:function(t,e,i,n){e.bind("click",function(){n.toggleFrom()})}}}]),e.directive("commentForm",[function(){return{restrict:"AE",replace:!0,transclude:!0,scope:{},require:"^commentTitle",template:'<form  id="commentForm" ><div ng-transclude></div></form>',link:function(t,e,i,n){}}}])}(angular);
!function(t){var e=t.module("myBlog.directives.comment",[]);e.directive("commentTitle",[function(){return{restrict:"AE",replace:!0,transclude:!0,template:'<section class="submit-comment" id="submitComment"><div ng-transclude></div></section>',controller:function(t){this.toggleFrom=function(){this.form=!0},this.form=!1}}}]),e.directive("submitComment",[function(){return{restrict:"AE",replace:!0,require:"^commentTitle",template:'<a class="submit-comment" style="cursor: pointer">点击发表</a>',link:function(t,e,i,n){e.bind("click",function(){n.toggleFrom()})}}}]),e.directive("commentForm",[function(){return{restrict:"AE",replace:!0,transclude:!0,scope:{},require:"^commentTitle",template:'<form  id="commentForm" ><div ng-transclude></div></form>',link:function(t,e,i,n){}}}])}(angular);
(function(angular){
    var articleDetailModule = angular.module("myBlog.services.articleDetailModule",[]);
    articleDetailModule.service("commentService",[
        "$http","$location","$q","localStorageService",
        function($http,$location,$q,localStorageService){
        this.saveUser = function(data){
            var deferred = $q.defer(),
                promise = deferred.promise;
            localStorageService.set("nick",data.nick);
            localStorageService.set("email",data.email);
            $http({
                method:"post",
                url:"/admin/user/save",
                data:{
                    nick:data.nick,
                    email:data.email
                }
            }).then(function successCallback(res){
                if(-1 == res.data){
                    alert("用户名村存在，请换一个嘞");
                    return ;
                }
                deferred.resolve(res);
            },function errorCallback(err){
                console.log(err);
            });
            return promise;
        };
       this.findExistUser = function(nick){
           var deferred = $q.defer(),
               promise = deferred.promise;
           $http({
               method:"get",
               url:"/admin/user/getNick?nick="+nick
           }).then(function successCallback(res){
               if(-1 == res.data){
                   alert("这个用户不存在");
                   return ;
               }
               deferred.resolve(res);
           },function errorCallback(err){
               console.log(err);
           })
           return promise;
       };

        this.saveComment = function(data,cb){
            $http({
                method:"post",
                url:"/admin/comment/save",
                data:data,
                cache:false
            }).then(function successCallback(commentMsg){
                if(-1==commentMsg.data){
                    alert("获取评论信息失败");
                    return ;
                }
                location.reload();
                cb(commentMsg);
            },function errorCallback(err){
                console.log(err);
            });
        };


    }])
})(angular);

!function(e){var t=e.module("myBlog.services.articleDetailModule",[]);t.service("commentService",["$http","$location","$q","localStorageService",function(e,t,n,o){this.saveUser=function(t){var i=n.defer(),a=i.promise;return o.set("nick",t.nick),o.set("email",t.email),e({method:"post",url:"/admin/user/save",data:{nick:t.nick,email:t.email}}).then(function(e){return-1==e.data?void alert("用户名村存在，请换一个嘞"):void i.resolve(e)},function(e){console.log(e)}),a},this.findExistUser=function(t){var o=n.defer(),i=o.promise;return e({method:"get",url:"/admin/user/getNick?nick="+t}).then(function(e){return-1==e.data?void alert("这个用户不存在"):void o.resolve(e)},function(e){console.log(e)}),i},this.saveComment=function(t,n){e({method:"post",url:"/admin/comment/save",data:t,cache:!1}).then(function(e){return-1==e.data?void alert("获取评论信息失败"):(location.reload(),void n(e))},function(e){console.log(e)})}}])}(angular);
!function(e){var t=e.module("myBlog.services.articleDetailModule",[]);t.service("commentService",["$http","$location","$q","localStorageService",function(e,t,n,o){this.saveUser=function(t){var i=n.defer(),a=i.promise;return o.set("nick",t.nick),o.set("email",t.email),e({method:"post",url:"/admin/user/save",data:{nick:t.nick,email:t.email}}).then(function(e){return-1==e.data?void alert("用户名村存在，请换一个嘞"):void i.resolve(e)},function(e){console.log(e)}),a},this.findExistUser=function(t){var o=n.defer(),i=o.promise;return e({method:"get",url:"/admin/user/getNick?nick="+t}).then(function(e){return-1==e.data?void alert("这个用户不存在"):void o.resolve(e)},function(e){console.log(e)}),i},this.saveComment=function(t,n){e({method:"post",url:"/admin/comment/save",data:t,cache:!1}).then(function(e){return-1==e.data?void alert("获取评论信息失败"):(location.reload(),void n(e))},function(e){console.log(e)})}}])}(angular);
!function(e){var t=e.module("myBlog.services.articleDetailModule",[]);t.service("commentService",["$http","$location","$q","localStorageService",function(e,t,n,o){this.saveUser=function(t){var i=n.defer(),a=i.promise;return o.set("nick",t.nick),o.set("email",t.email),e({method:"post",url:"/admin/user/save",data:{nick:t.nick,email:t.email}}).then(function(e){return-1==e.data?void alert("用户名村存在，请换一个嘞"):void i.resolve(e)},function(e){console.log(e)}),a},this.findExistUser=function(t){var o=n.defer(),i=o.promise;return e({method:"get",url:"/admin/user/getNick?nick="+t}).then(function(e){return-1==e.data?void alert("这个用户不存在"):void o.resolve(e)},function(e){console.log(e)}),i},this.saveComment=function(t,n){e({method:"post",url:"/admin/comment/save",data:t,cache:!1}).then(function(e){return-1==e.data?void alert("获取评论信息失败"):(location.reload(),void n(e))},function(e){console.log(e)})}}])}(angular);
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

!function(e){var t=e.module("myBlog.services.getArticleDetailCategory",[]);t.service("articleDetailCategory",["$http","$q",function(e,t){this.getCategory=function(r){var o=t.defer(),n=o.promise;return e.get("/admin/category/getInfo/"+r).then(function(e){category=e.data.category,o.resolve(category.length>=1&&category[0]?category[0]:"-1")},function(){console.error("获取文章类型失败")}),n},this.getCategoryOtherArticle=function(r){var o=t.defer(),n=o.promise;return e.get("/admin/category/getCategoryInfo/"+r).then(function(e){console.log(6666),console.log(e),o.resolve(e)},function(){console.error("获取其他文章出现错误")}),n},this.getArticleList=function(r){var o=t.defer(),n=o.promise;return e({method:"post",url:"/admin/article/getArticleDetailCategoryList",data:{list:r}}).then(function(e){o.resolve(e.data)},function(){console.error("error")}),n}}])}(angular);
!function(e){var t=e.module("myBlog.services.getArticleDetailCategory",[]);t.service("articleDetailCategory",["$http","$q",function(e,t){this.getCategory=function(r){var o=t.defer(),n=o.promise;return e.get("/admin/category/getInfo/"+r).then(function(e){category=e.data.category,o.resolve(category.length>=1&&category[0]?category[0]:"-1")},function(){console.error("获取文章类型失败")}),n},this.getCategoryOtherArticle=function(r){var o=t.defer(),n=o.promise;return e.get("/admin/category/getCategoryInfo/"+r).then(function(e){console.log(6666),console.log(e),o.resolve(e)},function(){console.error("获取其他文章出现错误")}),n},this.getArticleList=function(r){var o=t.defer(),n=o.promise;return e({method:"post",url:"/admin/article/getArticleDetailCategoryList",data:{list:r}}).then(function(e){o.resolve(e.data)},function(){console.error("error")}),n}}])}(angular);
!function(e){var t=e.module("myBlog.services.getArticleDetailCategory",[]);t.service("articleDetailCategory",["$http","$q",function(e,t){this.getCategory=function(r){var o=t.defer(),n=o.promise;return e.get("/admin/category/getInfo/"+r).then(function(e){category=e.data.category,o.resolve(category.length>=1&&category[0]?category[0]:"-1")},function(){console.error("获取文章类型失败")}),n},this.getCategoryOtherArticle=function(r){var o=t.defer(),n=o.promise;return e.get("/admin/category/getCategoryInfo/"+r).then(function(e){console.log(6666),console.log(e),o.resolve(e)},function(){console.error("获取其他文章出现错误")}),n},this.getArticleList=function(r){var o=t.defer(),n=o.promise;return e({method:"post",url:"/admin/article/getArticleDetailCategoryList",data:{list:r}}).then(function(e){o.resolve(e.data)},function(){console.error("error")}),n}}])}(angular);
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

!function(e){var t=e.module("myBlog.services.categoryDetail",[]);t.service("categoryDetailService",["$http","$q",function(e,t){this.getAllArticle=function(r){var i=t.defer(),n=i.promise;return e({method:"get",url:"/admin/article/getAll?cid="+r}).then(function(e){i.resolve(e.data)},function(e){console.error(e)}),n}}])}(angular);
!function(e){var t=e.module("myBlog.services.categoryDetail",[]);t.service("categoryDetailService",["$http","$q",function(e,t){this.getAllArticle=function(r){var i=t.defer(),n=i.promise;return e({method:"get",url:"/admin/article/getAll?cid="+r}).then(function(e){i.resolve(e.data)},function(e){console.error(e)}),n}}])}(angular);
!function(e){var t=e.module("myBlog.services.categoryDetail",[]);t.service("categoryDetailService",["$http","$q",function(e,t){this.getAllArticle=function(r){var i=t.defer(),n=i.promise;return e({method:"get",url:"/admin/article/getAll?cid="+r}).then(function(e){i.resolve(e.data)},function(e){console.error(e)}),n}}])}(angular);
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

!function(e){var t=e.module("myBlog.services.getArticle",[]);t.service("getArticleService",["$http","$q",function(e,t){this.getArticle=function(r,i,n){var c=t.defer(),l=c.promise;return e({method:"GET",url:"/admin/article/getArticleList/"+r+"?start="+i+"&count="+n}).then(function(e){c.resolve(e.data)},function(){console.log("读取文章列表失败")}),l},this.getArticleCount=function(){var r=t.defer(),i=r.promise;return e.get("/admin/article/getAllArticle").then(function(e){r.resolve(e.data.length)}),i}}])}(angular);
!function(e){var t=e.module("myBlog.services.getArticle",[]);t.service("getArticleService",["$http","$q",function(e,t){this.getArticle=function(r,i,n){var c=t.defer(),l=c.promise;return e({method:"GET",url:"/admin/article/getArticleList/"+r+"?start="+i+"&count="+n}).then(function(e){c.resolve(e.data)},function(){console.log("读取文章列表失败")}),l},this.getArticleCount=function(){var r=t.defer(),i=r.promise;return e.get("/admin/article/getAllArticle").then(function(e){r.resolve(e.data.length)}),i}}])}(angular);
!function(e){var t=e.module("myBlog.services.getArticle",[]);t.service("getArticleService",["$http","$q",function(e,t){this.getArticle=function(r,i,n){var c=t.defer(),l=c.promise;return e({method:"GET",url:"/admin/article/getArticleList/"+r+"?start="+i+"&count="+n}).then(function(e){c.resolve(e.data)},function(){console.log("读取文章列表失败")}),l},this.getArticleCount=function(){var r=t.defer(),i=r.promise;return e.get("/admin/article/getAllArticle").then(function(e){r.resolve(e.data.length)}),i}}])}(angular);
;(function(angular){
    var indexCategory = angular.module("myBlog.services.indexCategory",[]);
    indexCategory.service("indexCategoryService",["$http","AppConfig",function($http,AppConfig){

        this.getCategory = function(){
            return new Promise(function(resolve,reject){
                $http({
                    method:"get",
                    url:"/admin/category/indexGet?start=0&count="+AppConfig.indexCategorySize
                }).then(function successCallback(categorys){
                    resolve(categorys.data);
                },function errorCallback(err){
                    console.error("error:"+err);
                });
            });

        };
        this.getAllCategory = function(){
            return new Promise(function(resolve,reject){
                $http({    
                    method:"get",
                    url:"/admin/category/indexGet"
                }).then(function successCallback(categorys){
                    resolve(categorys.data);
                },function errorCallback(err){
                    console.error("error:"+err);
                });
            });

        }
    }]);
})(angular);

!function(e){var n=e.module("myBlog.services.indexCategory",[]);n.service("indexCategoryService",["$http","AppConfig",function(e,n){this.getCategory=function(){return new Promise(function(t,o){e({method:"get",url:"/admin/category/indexGet?start=0&count="+n.indexCategorySize}).then(function(e){t(e.data)},function(e){console.error("error:"+e)})})},this.getAllCategory=function(){return new Promise(function(n,t){e({method:"get",url:"/admin/category/indexGet"}).then(function(e){n(e.data)},function(e){console.error("error:"+e)})})}}])}(angular);
!function(e){var n=e.module("myBlog.services.indexCategory",[]);n.service("indexCategoryService",["$http","AppConfig",function(e,n){this.getCategory=function(){return new Promise(function(t,o){e({method:"get",url:"/admin/category/indexGet?start=0&count="+n.indexCategorySize}).then(function(e){t(e.data)},function(e){console.error("error:"+e)})})},this.getAllCategory=function(){return new Promise(function(n,t){e({method:"get",url:"/admin/category/indexGet"}).then(function(e){n(e.data)},function(e){console.error("error:"+e)})})}}])}(angular);
!function(e){var n=e.module("myBlog.services.indexCategory",[]);n.service("indexCategoryService",["$http","AppConfig",function(e,n){this.getCategory=function(){return new Promise(function(t,o){e({method:"get",url:"/admin/category/indexGet?start=0&count="+n.indexCategorySize}).then(function(e){t(e.data)},function(e){console.error("error:"+e)})})},this.getAllCategory=function(){return new Promise(function(n,t){e({method:"get",url:"/admin/category/indexGet"}).then(function(e){n(e.data)},function(e){console.error("error:"+e)})})}}])}(angular);
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

!function(n){var t=n.module("myBlog.services.marked",[]);t.service("markd",["$http",function(n){this.renderMD=function(t,e){n.get("/admin/article/getArticle/:"+t).then(function(n){e(n.data)},function(){console.log("读取文章详细错误")})},this.renderComment=function(t,e){n.get("admin/comment/getAll?id="+t).then(function(n){e(n.data)},function(){console.log("获取评论失败")})}}])}(angular);
!function(n){var t=n.module("myBlog.services.marked",[]);t.service("markd",["$http",function(n){this.renderMD=function(t,e){n.get("/admin/article/getArticle/:"+t).then(function(n){e(n.data)},function(){console.log("读取文章详细错误")})},this.renderComment=function(t,e){n.get("admin/comment/getAll?id="+t).then(function(n){e(n.data)},function(){console.log("获取评论失败")})}}])}(angular);
!function(n){var t=n.module("myBlog.services.marked",[]);t.service("markd",["$http",function(n){this.renderMD=function(t,e){n.get("/admin/article/getArticle/:"+t).then(function(n){e(n.data)},function(){console.log("读取文章详细错误")})},this.renderComment=function(t,e){n.get("admin/comment/getAll?id="+t).then(function(n){e(n.data)},function(){console.log("获取评论失败")})}}])}(angular);