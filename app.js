var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var routes = require('./routes/index');
var users = require('./routes/users');

var moment = require('moment');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.disable('etag');



// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
var router = express.Router();
var cache = {humidity: 0, temperature:0}
router.get('/h', function(req, res) {
  request('http://192.168.1.20:3000/api/h', function (error, response, body) { 
        var conditions;
        try{
            conditions =JSON.parse(body);
            cache.humidity = conditions.humidity;
            res.json(conditions.humidity); 
        }catch(e){
            console.log("ERROR: " + e);
            res.json(cache.humidity); 
        }
        
        
    });
});
router.get('/t', function(req, res) {
    request('http://192.168.1.20:3000/api/t', function (error, response, body) {      
        var conditions;
        try{
            conditions =JSON.parse(body);
            cache.temperature = conditions.temperature;
            res.json(conditions.temperature); 
        }catch(e){
            console.log("ERROR: " + e);
            res.json(cache.temperature); 
        }
    });
});
router.get('/conditions', function(req, res) {
      request('http://192.168.1.20:3000/api/conditions', function (error, response, body) {      
        var conditions;
        try{
            conditions =JSON.parse(body);
            cache.humidity = conditions.humidity;
            cache.temperature = conditions.temperature;
            res.json(conditions); 
        }catch(e){
            console.log("Conditions: ERROR: " + e);
            res.json(cache); 
        }
    });
});

router.get('/hist/:num', function(req,res){
    var file = fs.readFileSync("data.txt", 'utf8');
    file = file.replace(new RegExp("}{",'g'),'},{');
    file = "[" + file + "]";
    try{
      file = JSON.parse(file);
    }catch(e){
      console.log("History: ERROR: " + e);
      file = [];
    }
    
    if(req.params.num && file.length > req.params.num){
      file = file.slice(file.length - req.params.num, file.length);
    }
    res.json(file);

});

app.use('/api', router);
app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//lets get our timer going....
var fs = require('fs');
var schedule = require('node-schedule');

console.log("initializing reoccurance")
var rule = new schedule.RecurrenceRule();
rule.second = [0];

var j = schedule.scheduleJob(rule, function(){
    request('http://192.168.1.20:3000/api/conditions', function (error, response, body) {   
        try{   
        var conditions = JSON.parse(body);
        var obj = [
                    {
                      time: moment().format('MM/DD/YYYY h:mm:ss a'),
                      temperature: conditions.temperature, 
                      humidity: conditions.humidity
                    }
                  ];
        fs.appendFileSync('data.txt', JSON.stringify(obj).replace('[','').replace(']',''));
       }catch(e){
        console.log("Schedule: ERROR: " + e);
       }
    });
});




module.exports = app;
