var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var routes = require('./routes/index');
var users = require('./routes/users');
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'fuzzylizardsleepylizard@gmail.com',
        pass: ''
    }
});

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

router.get('/stats/:num', function(req,res){
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


    //we now have an array of values in the given time interval.
    //lets do some math

    var out = getStats(file);

    res.json(out);

});


function getStats(data){
  var TEMP_MIN = data[0].temperature;
  var TEMP_MAX = data[0].temperature;;
  var HUMIDITY_MAX = data[0].humidity;
  var HUMIDITY_MIN = data[0].humidity;
  var HUMIDITY_AVG = 0;
  var TEMPERATURE_AVG = 0;
  var temps = 0;
  var humidity = 0;

  for(var i in data){
    if(HUMIDITY_MAX < data[i].humidity){
      HUMIDITY_MAX = data[i].humidity;
    }
    if(HUMIDITY_MIN > data[i].humidity){
      HUMIDITY_MIN = data[i].humidity;
    }
    if(TEMP_MAX < data[i].temperature){
      TEMP_MAX = data[i].temperature;
    }
    if(TEMP_MIN > data[i].temperature){
      TEMP_MIN = data[i].temperature;
    }

    //get avg.
    temps++;
    humidity++;
    HUMIDITY_AVG += +data[i].humidity;
    TEMPERATURE_AVG += +data[i].temperature;

  }
  //console.log("TEMP_AVG" + TEMPERATURE_AVG + ", HUMIDITY_AVG: " + HUMIDITY_AVG);
  HUMIDITY_AVG = HUMIDITY_AVG / humidity;
  TEMPERATURE_AVG = TEMPERATURE_AVG / temps;
  //console.log("TEMP_AVG" + TEMPERATURE_AVG + ", HUMIDITY_AVG: " + HUMIDITY_AVG);

  return {
            temp_max: TEMP_MAX, 
            temp_min: TEMP_MIN, 
            humid_min: HUMIDITY_MIN,
            humid_max: HUMIDITY_MAX, 
            delta_humid: (HUMIDITY_MAX - HUMIDITY_MIN), 
            delta_temp: (TEMP_MAX - TEMP_MIN), 
            humidity_avg: HUMIDITY_AVG, 
            temperature_avg: TEMPERATURE_AVG
          };

}



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
var emailLimit = 0;

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

            if(emailLimit == 0){
              checkForEvents(obj);
            }
            emailLimit++;
            if(emailLimit == 15){
              emailLimit = 0;
            }
        fs.appendFileSync('data.txt', JSON.stringify(obj).replace('[','').replace(']',''));
       }catch(e){
        console.log("Schedule: ERROR: " + e);
       }

       
    });
});

var checkForEvents = function(obj){
  console.log("checking for emails ");

    var mailTemperatureMax = {
      from: 'fuzzylizardsleepylizard@gmail.com', // sender address
      to: 'grin.van@gmail.com', // list of receivers
      subject: '[LizardMonitor] Problem Detected', // Subject line
      text: 'The lizard temperature has been  ' + obj[0].temperature + "C since " + obj[0].time + ". Please go do something about it.", // plaintext body
    };

    var mailHumidityMax = {
      from: 'fuzzylizardsleepylizard@gmail.com', // sender address
      to: 'grin.van@gmail.com', // list of receivers
      subject: '[LizardMonitor] Problem Detected', // Subject line
      text: 'The lizard humidity has been  ' + obj[0].humidity + "% since " + obj[0].time + ". Please go do something about it.", // plaintext body

    };
    console.log("temp: " + obj[0].temperature);
    if(Math.round(obj[0].temperature) > 30){
      console.log("sending email for temp");
        transporter.sendMail(mailTemperatureMax, function(error, info){
            if(error){
                console.log(error);
            }else{
                console.log('Message sent: ' + info.response);
            }
        });

    }
    console.log("humid: " + (obj[0].humid));
    if(Math.round(obj[0].humidity) < 40){
      console.log("sending email for humid");
         transporter.sendMail(mailHumidityMax, function(error, info){
            if(error){
                console.log(error);
            }else{
                console.log('Message sent: ' + info.response);
            }
        });
    }
}



module.exports = app;
