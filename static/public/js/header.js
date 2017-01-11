
define(function(require,exports,module){
    var canvas = document.getElementById("canvas");
    var cobj = canvas.getContext("2d");
    function startShowStar(){
        var star  = [];
        for(var i=0;i<15;i++){
            var starObj = {
                radius1:20+10*Math.random(),
                radius2:8+7*Math.random(),
                x:10+180*Math.random(),
                y:10+60*Math.random(),
                num:5,
                color:"rgb("+parseInt(255*Math.random())+","+parseInt(255*Math.random())+","+parseInt(255*Math.random())+")",
                angle:360*Math.random(),
                changeAngle:-5+10*Math.random()
            }
            star.push(starObj);
        }
        setInterval(function(){
            cobj.clearRect(0,0,200,200);
            var starLen = star.length;
            for(var i=0;i<starLen;i++){
                star[i].angle+=star[i].changeAngle;
                cobj.save();
                cobj.beginPath();
                cobj.translate(star[i].x,star[i].y);
                cobj.rotate(star[i].angle*Math.PI/180);
                cobj.scale(Math.sin(star[i].angle*Math.PI/180),Math.sin(star[i].angle*Math.PI/180));
                cobj.globalAlpha = Math.abs(Math.sin(star[i].angle*Math.PI/180));
                drawStar (0,0,star[i].radius1,star[i].radius2,star[i].num,star[i].color);
                cobj.restore();
            }
        },50);
    }
    drawStar = function(x,y,radiusB,radiusS,num,color){
        var angle  =  360/(num*2);
        var starArr  = [];
        for(var i=0;i<num*2;i++)  {
            var obj  = {};
            if(i&1)  {
                obj.x = x + radiusB*Math.cos(i*angle*Math.PI/180);
                obj.y = y + radiusB*Math.sin(i*angle*Math.PI/180);
            } else {
                obj.x = x + radiusS*Math.cos(i*angle*Math.PI/180);
                obj.y = y + radiusS*Math.sin(i*angle*Math.PI/180);
            }
            starArr.push(obj);
        }
        cobj.beginPath();
        cobj.fillStyle =  color;
        cobj.moveTo(starArr[0].x,starArr[0].y);
        for(var i=0;i<2*num;i++)  {
            cobj.lineTo(starArr[i].x,starArr[i].y);
        }
        cobj.closePath();
        cobj.fill();
    }
    module.exports  = startShowStar;
});
/*
(function(){
    function drawStar(x,y,radiusB,radiusS,num,color) {
        var angle  =  360/(num*2);
        var starArr  = [];
        for(var i=0;i<num*2;i++)  {
            var obj  = {};
            if(i&1)  {
                obj.x = x + radiusB*Math.cos(i*angle*Math.PI/180);
                obj.y = y + radiusB*Math.sin(i*angle*Math.PI/180);
            } else {
                obj.x = x + radiusS*Math.cos(i*angle*Math.PI/180);
                obj.y = y + radiusS*Math.sin(i*angle*Math.PI/180);
            }
            starArr.push(obj);
        }
        cobj.beginPath();
        cobj.fillStyle =  color;
        cobj.moveTo(starArr[0].x,starArr[0].y);
        for(var i=0;i<2*num;i++)  {
            cobj.lineTo(starArr[i].x,starArr[i].y);
        }
        cobj.closePath();
        cobj.fill();
    }

    var star  = [];
    for(var i=0;i<15;i++){
        var starObj = {
            radius1:20+10*Math.random(),
            radius2:8+7*Math.random(),
            x:10+180*Math.random(),
            y:10+60*Math.random(),
            num:5,
            color:"rgb("+parseInt(255*Math.random())+","+parseInt(255*Math.random())+","+parseInt(255*Math.random())+")",
            angle:360*Math.random(),
            changeAngle:-5+10*Math.random()
        }
        star.push(starObj);
    }
    setInterval(function(){
        cobj.clearRect(0,0,200,200);
        var starLen = star.length;
        for(var i=0;i<starLen;i++){
            star[i].angle+=star[i].changeAngle;
            cobj.save();
            cobj.beginPath();
            cobj.translate(star[i].x,star[i].y);
            cobj.rotate(star[i].angle*Math.PI/180);
            cobj.scale(Math.sin(star[i].angle*Math.PI/180),Math.sin(star[i].angle*Math.PI/180));
            cobj.globalAlpha = Math.abs(Math.sin(star[i].angle*Math.PI/180));
            drawStar (0,0,star[i].radius1,star[i].radius2,star[i].num,star[i].color);
            cobj.restore();
        }
    },50);

})()
*/
