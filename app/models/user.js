var mongoose = require('mongoose'),
    autoIncrement = require('mongoose-auto-increment');

var connection = mongoose.createConnection("mongodb://localhost/moneatask");

mongoose.Promise = require('bluebird');
autoIncrement.initialize(connection);

var userSchema = mongoose.Schema({
  username:   { type: String, required: true, unique: true },
  first_name: { type: String, required: true },
  last_name:  { type: String, required: true },
  password:   { type: String, required: true },
  salt:       { type: String, required: true },
  created:    { type: Date,   default: Date.now }
});

userSchema.virtual('id').get(function(){
    return this._id;
});

userSchema.virtual('created_time').get(function(){
    return new Date(this.created).getTime();
});

userSchema.set('toJSON', {
    virtuals: true
});

userSchema.plugin(autoIncrement.plugin, 'User');
var User = module.exports = mongoose.model('User', userSchema);
