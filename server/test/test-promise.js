foo(5)
    .then(function(num){
        console.log(num);
    },function(tmp){
        console.log("tmp:"+tmp);
    });

function foo(num){
    var promise = new Promise(function(resolve,reject){
        ++num;
        if(resolve){
            resolve(num);
        }
        if(reject){
            reject("4444");
        }
    });
    return promise;
}

