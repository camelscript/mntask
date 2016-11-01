var util              = require('util');
var bodyParser        = require('body-parser');
var express           = require('express');
var expressValidator  = require('express-validator');
var jwt               = require('jsonwebtoken');
var mongoose          = require('mongoose');
var bcrypt            = require('bcrypt-nodejs');
var _                 = require('underscore');
var logReqToFile      = require('express-router-log-requests-to-file');
var app               = express();
var port              = process.env.PORT || 3016;
var host              = process.env.HOST || '127.0.0.1';
var conf              = require('./config');
var apiRoutes         = express.Router();

mongoose.connect(conf.database);
app.set('secret', conf.secret);
app.set('host', host);
app.set('port', port);

//Models
var User = require('./app/models/user');

app.use(bodyParser.json());
app.use(expressValidator());
app.use('*', logReqToFile);

app.get('/', function (req, res) {
  res.send('Wellcome to Monea Task1 app.');
});

app.post('/login', function (req, res) {

  req.checkBody('username', 'Invalid urlparam').notEmpty();
  req.checkBody('password', 'Invalid urlparam').notEmpty();
  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json('Sorry there is an error ' + util.inspect(errors));
    return;
  }

  User.findOne({username: req.body.username}, 'id username created password salt',function (err, user){
    if (err) {
      res.status(400).json({msg: 'Sorry there is an error'});
      console.log(err.message);
      return;
    }

    if(user && bcrypt.compareSync(req.body.password, user.password)){

      var token = jwt.sign(user, app.get('secret'), {
        expiresIn: '60m' // expires in 24 hours
      });

      res.status(201).json({
        'token': token,
        'id': parseInt(user.id),
        username: user.username,
        created: user.created_time
      });
      return;
    }
    res.status(200).json({msg: 'Please check username and/or password.'})
  });

});

app.post('/users', function (req, res) {

  req.checkBody('username', 'Invalid urlparam').notEmpty();
  req.checkBody('password', 'Invalid urlparam').notEmpty();
  req.checkBody('first_name', 'Invalid urlparam').notEmpty();
  req.checkBody('last_name', 'Invalid urlparam').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    res.status(400).json({msg: 'Sorry there is an error ' + util.inspect(errors)});
    return;
  }
  User.count({}, function(err, count){
    var maxUserCoutn = 20;

    if (err) {
      res.status(400).json({msg: 'Sorry there is an error'});
      console.log(err.message);
      return;
    }

    if(count <= maxUserCoutn){

      salt = bcrypt.genSaltSync();
      password = bcrypt.hashSync(req.body.password, salt);

      newUser = new User({
        username:   req.body.username,
        first_name: req.body.first_name,
        last_name:  req.body.last_name,
        password:   password,
        salt:       salt
      });

      newUser.save(function (err) {
        if (err) {
          res.status(400).json({msg: 'Sorry there is an error'});
          console.log(err.message);
          return;
        }

        res.status(201).location('users/'+newUser.id).json({
          id: newUser.id,
          username: newUser.username,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          created: newUser.created_time
        });
      });
    } else {
      res.json({msg: 'Too much users. Max user count:' + maxUserCoutn});
    }
  });
});


// Let's validate token. Form this point below
// there will be only autorized methods
apiRoutes.use(function(req, res, next) {

var token = req.body.token || req.query.token || req.headers['authorization'];

if (token) {
   jwt.verify(token, app.get('secret'), function(err, decoded) {
     if (err) {
       return res.json({ msg: 'Failed to authenticate token.' });
     } else {
       // if everything is good, save to request for use in other routes
       req.decoded = decoded;
       next();
     }
   });

 } else {

   // if there is no token
   // return an error
   return res.status(403).send({
       success: false,
       message: 'No token provided.'
   });

 }
});

//could be /api or other.
app.use('/users', apiRoutes);

app.get('/users', function (req, res) {
   User.find({}, function (err, users){
     if (err) {
       res.status(400).json({msg: 'Sorry there is an error'});
       console.log(err.message);
       return;
     }
     res.json(
       _.map(users, function(user){
         return {
           id: user.id,
           username: user.username,
           first_name: user.first_name,
           last_name: user.last_name,
           created: user.created_time
         };
       })
     );
   });


});

app.get('/users/:id', function (req, res) {

  User.findById( req.params.id, function (err, user){
    if (err) {
      res.status(400).json({msg: 'Sorry there is an error'});
      console.log(err.message);
      return;
    }
    if(user){
      res.json({
        id:         user.id,
        username:   user.username,
        first_name: user.first_name,
        last_name:  user.last_name,
        created:    timestampToTime(user.created)
      });
    } else {
      res.json({msg: 'No user with such id.'});
    }
  });
});

app.delete('/users/:id', function (req, res) {

  User.findById( req.params.id, function (err, user){
    if (err) {
      res.status(400).json({msg: 'Sorry there is an error'});
      console.log(err.message);
      return;
    }
    if(user){
      user.remove(function(err){
        if (err) {
          res.status(400).json({msg: 'Sorry there is an error'});
          console.log(err.message);
          return;
        }
        res.status(204).json();

      });
    } else {
      res.json({msg: 'No user with such id.'});
    }
  });
});

function timestampToTime(date){
  return new Date(date).getTime();
}

app.listen(port);
console.log(`Server up at http://${host}:${port}`);
