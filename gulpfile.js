'use strict';

var gulp = require('gulp');
var less = require("gulp-less");
gulp.task("style",function(){
    console.log("start");
    gulp.src("static/less/*.less")
        .pipe(less())
        .pipe(gulp.dest("static/css/"));
});
gulp.task("watch",function(){
    gulp.watch("static/less/*.less",["style"]);
});
