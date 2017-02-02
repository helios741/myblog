(function(angular){
    var indexCategoryShow  = angular.module("myBlog.controllers.indexCategoryShow",[]);
    indexCategoryShow.controller("indexCategoryShow",[
        "$scope","$location","indexCategoryService",
        function($scope,$location,indexCategoryService){
            $scope.dirname = $location.$$absUrl;
            indexCategoryService.getCategory(function(categorys){
                $scope.categorys = categorys;
            });
            $scope.clickMsg = "点击查看全部";
            var flag = true;
            $scope.showAllCategory = function(){
                if(flag)
                    indexCategoryService.getAllCategory(function(categorys){
                        $scope.categorys = categorys;
                        $scope.clickMsg = "点击收起";
                        flag = !flag;
                    });
                else
                    indexCategoryService.getCategory(function(categorys){
                        $scope.categorys = categorys;
                        $scope.clickMsg = "点击查看全部";
                        flag = !flag;
                    });
            }
    }]);
})(angular);
