var Comment  =require("../models/comment"),
    formidable = require("formidable");
exports.save = function (req,res) {
    var form = formidable.IncomingForm();
    form.parse(req,function (err,fields) {
        if(err){
            console.log(err);
            return ;
        }
        if(fields.cid){
            //console.log(fields);
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
                console.log(comment);
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
    Comment.find({article:req.query.id})
        .populate("from","nick")
        .populate("reply.from reply.to","nick")
        .exec(function(err,comments){
            if(err){
                console.log(err);
                res.send("-1");
                return ;
            }
            res.send(comments);
        })
};




