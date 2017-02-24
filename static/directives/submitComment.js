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
})(angular);
