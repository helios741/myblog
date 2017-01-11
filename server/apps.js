var express = require("express");
var app  =express();
var router = require("./controller/router");
app.use(express.static("./static"));
app.set("view engine","ejs");
app.get("/login",router.showLogin);
app.listen(3000);

