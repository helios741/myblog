'use strict';

var gulp = require('gulp');
var less = require("gulp-less");
var rename = require("gulp-rename");
var minifyCSS = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var gulpif = require("gulp-if");
var spritesmith=require('gulp.spritesmith');
gulp.task("style",function(){
    gulp.src("static/less/*.less")
        .pipe(less())
        .pipe(gulp.dest("static/css/"));
});
gulp.task("css",function(){
    gulp.src("static/css/*.css")
        .pipe(minifyCSS())
       // .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest("static/css/"));
});
gulp.task("controllers",function(){
    gulp.src("static/controllers/*.js")
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest("static/controllers/"));

    gulp.src("static/controllers/articleDetail/*.js")
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest("static/controllers/articleDetail/"));

    gulp.src("static/controllers/index/*.js")
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest("static/controllers/index/"));

    gulp.src("static/controllers/categoryShow/*.js")
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest("static/controllers/categoryShow/"));
});
gulp.task("directives",function(){
    gulp.src("static/directives/*.js")
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest("static/directives/"));
})
gulp.task("services",function(){
    gulp.src("static/services/*.js")
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest("static/services/"));
});
gulp.task("public",function(){
    gulp.src("static/public/js/*.js")
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest("static/public/js/"));
});
gulp.task("watch",function(){
    gulp.watch("static/less/*.less",["style"]);
    //ulp.watch("static/css/*.css",["css"]);
});


gulp.task('default', function () {
    return gulp.src('static/img/*.jpg')//需要合并的图片地址
        .pipe(spritesmith({
            imgName: 'sprite.png',//保存合并后图片的地址
            cssName: 'static/test/sprite.css',//保存合并后对于css样式的地址
            padding:5,//合并时两个图片的间距
            algorithm: 'binary-tree',//注释1
            cssTemplate:"css/handlebarsStr.css"//注释2
        }))
        .pipe(gulp.dest('static'));
});
gulp.task("js",["controllers","directives","services","public"]);
