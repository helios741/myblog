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
