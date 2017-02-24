'use strict';

var gulp = require('gulp');
var less = require("gulp-less");
var minifyCSS = require('gulp-minify-css');
gulp.task("style",function(){
    console.log("start");
    gulp.src("static/less/*.less")
        .pipe(less())
        .pipe(gulp.dest("static/css/"));
});
gulp.task("css",function(){
    gulp.src("static/css/*.css")
        .pipe(minifyCSS())
        .pipe(gulp.dest("static/css/"));
});
gulp.task("watch",function(){
    gulp.watch("static/less/*.less",["style"]);
    gulp.watch("static/css/*.css",["css"]);
});
