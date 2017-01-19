(function(angular){
    var articleDetailModule = angular.module("myBlog.services.articleDetailModule",[]);
    articleDetailModule.service("commentService",[
        "$http","localStorageService",
        function($http,localStorageService){
        this.saveUser = function(data){
            localStorageService.set("nick",data.nick);
            localStorageService.set("email",data.email);
            $http({
                method:"post",
                url:"/admin/user/save",
                data:{
                    nick:data.nick,
                    email:data.email
                }
            }).then(function(res){
                console.log(res);
            },function(err){
                console.log(err);
            });
        };
    }])
})(angular)
