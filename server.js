var requestlog = "";
//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
var bodyParser = require('body-parser');

Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'));
var rawBodySaver = function (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}
app.use(bodyParser.json({ verify: rawBodySaver }));
app.use(bodyParser.urlencoded({ verify: rawBodySaver, extended: true }));
app.use(bodyParser.raw({ verify: rawBodySaver, type: function () { return true } }));

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

var playerArr = [];

var getBalanceRespondJsonDefault = '{"code":0, "message":"success", "balance":9999.99, "currency": "USD"}';
var placebetRespondJsonDefault = '{"code":0, "message":"success", "balance":9998.99, "status": ""}';
var settlementRespondJsonDefault = '{"code":0, "message":"success", "balance":9998.99, "status": ""}';

var getBalanceRespondJson = '{"code":0, "message":"success", "balance":9999.99, "currency": "USD"}';
var placebetRespondJson = '{"code":0, "message":"success", "balance":9998.99, "status": ""}';
var settlementRespondJson = '{"code":0, "message":"success", "balance":9998.99, "status": ""}';
app.get("/account/getbalance/membercode/*", function(request, response) {
  console.log(JSON.stringify(request.headers));
  console.log("getbalance sending back:"+getBalanceRespondJson);
  requestlog = requestlog + "\n" + request.rawBody;
  response.send(getBalanceRespondJson);
});

app.post("/account/placeBet", function(request, response) {
  requestlog = requestlog + "\n" + request.rawBody;
  console.log(request.rawBody); //This prints the JSON document received (if it is a JSON document)
  console.log(JSON.stringify(request.headers));
  console.log("placeBet sending back:"+placebetRespondJson);
  response.send(placebetRespondJson);
});
app.post("/account/settlement", function(request, response) {
  requestlog = requestlog + "\n" + request.rawBody;
  console.log(request.rawBody); //This prints the JSON document received (if it is a JSON document)
  console.log(JSON.stringify(request.headers));
  console.log("settlement sending back:"+settlementRespondJson);
  response.send(settlementRespondJson);
});
app.post("/helper/setrespond/settlement", function(request, response) {
  settlementRespondJson = request.rawBody;
  console.log(request.rawBody);
  response.send("ok");
});
app.get("/helper/resetrespond/settlement", function(request, response) {
  settlementRespondJson = getBalanceRespondJsonDefault;
  console.log(getBalanceRespondJsonDefault);
});
app.get("/helper/getRequestLog", function(request, response) {
  response.send(requestlog);
  requestlog = "";
});
app.get("/helper/purgePlayer", function(request, response) {
  response.send("ok");
  playerArr = [];
});
app.post("/helper/createPlayer", function(request, response) {
  var param = JSON.parse(request.rawBody);
  var playerexist = false;
  var playerJson =  = {"login":"-1","balance":0};
  var isPlayerExist = checkplayer(param.login);
  if(isPlayerExist){
    playerJson = getPlayer(param.login);
  }
  else{
    playerJson = {"login":param.login,"balance":0};
    if(param.balance > 0){
      playerJson.balance = param.balance;
    }
    playerArr.push(playerJson);
  }
  response.send(playerJson);
});
// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

var checkplayer = function(login){
  for(var i=0;i<playerArr.length;i++){
    if(playerArr[i].login==login){
      return=true;
    }
  }
  return false;
}
var getPlayer = function(login){
  for(var i=0;i<playerArr.length;i++){
    if(playerArr[i].login==login){
      return=playerArr[i];
    }
  }
  return null;
}
initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
