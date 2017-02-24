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



