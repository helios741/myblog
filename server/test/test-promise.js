foo(5)
    .then(function(num){
        console.log(num);
        return bar(num);
    },function(tmp){
        console.log("tmp:"+tmp);
    })
    .then(function(sum){
        console.log(sum);
        console.log("down");
    });

function foo(num){
    return new Promise(((resolve,reject)=>{
        ++num;
        resolve(num);
    }));
}
function bar(sum){
    return new Promise(function(resolve,reject){
        sum+=11;
        if(resolve){
            console.log("sum:",sum);
            resolve(sum);
        }
        if(reject){
            reject("4444");
        }
    });
}

