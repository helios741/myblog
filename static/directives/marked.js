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
