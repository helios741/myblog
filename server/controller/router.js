var formidable = require("formidable");
var Admin = require("../schemas/admin");
var md5 = require("../models/md5");
//渲染登录页面
exports.showLogin = function(req,res){
    res.render("login");
};
//判断是否登录成功
exports.checkLogin = function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req,function(err,fields,files){
        if(err){
            res.send("-1");   //获取表单失败(服务器错误)
            return ;
        }
        Admin.findOne({
            name:fields.name,
            pwd:md5(md5(fields.pwd)+"yilong")
        },function(err,result){
            if(err){
                res.send("-1");
                return ;
            }
            if(null===result){
                res.send("-2");
                return ;
            }
            req.session.name = fields.name;
            res.redirect("/admin");
        })
    });
}

//展示管理员界面
exports.showAdmin = function(req,res){
    console.log("55454");
    /*if(!req.session.name){
        res.redirect("/login");
    }*/
    res.send("sdsdsd");
    //res.render("index");
}
