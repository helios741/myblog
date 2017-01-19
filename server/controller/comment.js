var Comment  =require("../models/comment"),
    formidable = require("formidable");
exports.save = function (req,res) {
    var form = formidable.IncomingForm();
    form.parse(req,function (err,fields) {
        if(err){
            console.log(err);
            return ;
        }
        var comment = new Comment(fields);
        comment.save(function(err,comment){
            if(err){
                console.log(err);
                res.send("-1");
                return ;
            }
            res.send(comment);
        });
    });
};
exports.getAll = function(req,res){
    Comment.find({article:req.query.id})
        .populate("from","nick")
        .exec(function(err,comments){
            if(err){
                console.log(err);
                res.send("-1");
                return ;
            }
            res.send(comments);
        })
};

