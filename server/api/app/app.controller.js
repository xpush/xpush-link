'use strict';

var _ = require('lodash');
var App = require('./app.model');
var uuid  = require('node-uuid');

exports.chooseApplication = function(req,res){
  var key = req.body.key ? req.body.key : req.params.key ? req.params.key : undefined;
  App.findOne({key: key}, function(err, app){
    if(err){
      return res.json(401,err);
    }
    if(!app){
      return res.json(404, 'does not exist');
    }
    app.users.forEach(function(user){
      if(user.ID == req.user.login){
        req.session.appKey = key;
        return res.json(200,app);
      }
    });
    if(!app){
      return res.json(404, 'does not exist');
    }

  });
};

// Get list of apps
exports.index = function(req, res) {
  var userId = req.user.email;

  App.find({"users.ID": userId },function (err, apps) {
    if(err) { return handleError(res, err); }
    return res.send(apps);
  });
};

// Get a single app
exports.show = function(req, res) {
  App.findById(req.params.id, function (err, app) {
    if(err) { return handleError(res, err); }
    if(!app) { return res.send(404); }
    return res.json(app);
  });
};

// Creates a new app in the DB.
exports.create = function(req, res) {
  var body = req.body;

  var user = req.user;

  body.users = [{
    ID: user.email,
    NM: user.name,
    P : "",
    R : 'admin'
  }];

  App.create(body, function(err, app) {
    if(err) { return handleError(res, err); }
    return res.send(app);
  });
};

// Updates an existing app in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  App.findById(req.params.id, function (err, app) {
    if (err) { return handleError(res, err); }
    if(!app) { return res.send(404); }
    var updated = _.merge(app, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, app);
    });
  });
};

// Deletes a app from the DB.
exports.destroy = function(req, res) {
  App.findById(req.params.id, function (err, app) {
    if(err) { return handleError(res, err); }
    if(!app) { return res.send(404); }
    app.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
