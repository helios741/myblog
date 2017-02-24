'use strict';

var gulp = require('gulp');
var less = require("gulp-less");
var rename = require("gulp-rename");
var minifyCSS = require('gulp-minify-css');
var uglify = require('gulp-uglify');
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
gulp.task("watch",function(){
    gulp.watch(["style"]);
    gulp.watch("static/css/*.css",["css"]);
});
gulp.task("js",["controllers","directives","services"]);
