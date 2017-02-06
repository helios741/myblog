var Comment  =require("../models/comment"),
    formidable = require("formidable");
exports.save = function (req,res) {
    var form = formidable.IncomingForm();
    form.parse(req,function (err,fields) {
        if(err) throw err;
        if(fields.cid){
            Comment.find({_id:fields.cid},function(err,comment){
                if(err){
                    console.log(err);
                    res.send("-1");
                    return ;
                }
                var reply = {
                    from:fields.from,
                    to:fields.tid,
                    content:fields.content
                };
                comment[0].reply.push(reply);
                comment[0].save(function(err,commentMsg){
                    if(err){
                        console.log(err);
                        res.send("-1");
                        return ;
                    }
                    res.send(commentMsg);
                });
            });
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
    Comment.findData(req.query.id,function(err,comments){
        if(err){
            console.log(err);
            res.send("-1");
        }
        res.send(comments);
    });
};
