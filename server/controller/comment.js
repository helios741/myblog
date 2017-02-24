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
                comment[0].save()
                    .then((commentMsg)=>res.send(commentMsg))
                    .catch(((err)=>{
                        console.error(err);
                        res.send("-1");
                    }));
                
            });
            return ;
        }
        
        var comment = new Comment(fields);
        comment.save()
            .then((comment)=>res.send(comment))
            .catch(((err)=>{
                console.error(err);
                res.send("-1");
            }));
    });
};
exports.getAll = function(req,res){
    Comment.findData(req.query.id)
        .then((comments)=>res.send(comments))
        .catch((err)=>console.error(err));
};
