var express = require('express');
var errorHandler = require('express-error-handler')

var env = process.env.NODE_ENV || 'development';

var app = express();

if('development' == env){
    app.use(express.static(__dirname + '/public'));
    app.use(errorHandler({
        dumpExceptions:true,
        showStack     :true
    }));
}else if('production' == evn){
    var oneYear = 31557600000;
    app.use(express.static(__dirname + '/public', { maxAge:oneYear }));
    app.use(errorHandler());
}

console.log("server started at port 3000")
app.listen(3000);
