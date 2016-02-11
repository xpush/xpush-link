'use strict';

var _ = require('lodash');
var Message = require('./message.model');

exports.index = function (req, res) {

  Message.find({"unread": true}, function (err, messages) {
    if (err) {
      return handleError(res, err);
    }
    return res.send(messages);
  });
};

exports.save = function (req, res) {
  var message = req.body.message;
  var email = req.body.email;
  var name = req.body.name;
  var appkey = req.body.appkey;
  var url = req.body.url;

  var saveData = {
    appkey: appkey,
    url:url,
    name: name,
    message: message,
    email: email
  };

  Message.create(saveData, function (err, _message) {
    if (err) {
      return handleError(res, err);
    } else {
      _message._id = undefined;
      _message.__v = undefined;
      return res.status(200).json(_message); 
    }
  });
};

function handleError(res, err) {
  return res.status(500).send(err);
}