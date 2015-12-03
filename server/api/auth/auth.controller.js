'use strict';

var _ = require('lodash');
var uuid = require('node-uuid');
var Auth = require('./auth.model');
var DICT = require('./../../config/dict');
var UT = require('./../../components/utils');
var config = require('./../../config/environment');
var XPUSH = require("./../../xpush-node-client")(config.xpush);
var request = require('request');
var satelize = require('satelize');

var EMAIL;
if (config.auth && config.auth.email) EMAIL = require('./../../components/email');

// Get list of auths
exports.index = function (req, res) {
  Auth.find(function (err, auths) {
    if (err) {
      return handleError(res, err);
    }
    return res.status(200).json(auths);
  });
};

// Get a single auth
exports.show = function (req, res) {
  Auth.findById(req.params.id, function (err, auth) {
    if (err) {
      return handleError(res, err);
    }
    if (!auth) {
      return res.status(404).send('Not Found');
    }
    return res.json(auth);
  });
};

exports.signin = function (req, res) {
  var email = req.body.email;
  var pass = req.body.password;

  var saveData = {
    email: email
  };


  Auth.findOne(saveData, function (err, auth) {
    if (err) {
      return handleError(res, err);
    }
    if (!auth) {
      return res.send({status: 'ERR-EMAIL', message: DICT.EMAIL_WRONG});
    }

    if (auth.active == false) {
      res.send({status: 'AUTH-DEACTIVE', message: DICT.EMAIL_DEACTIVE});
    }
    else if (auth.pass == UT.encrypto(pass)) {
      req.session.email = auth.email;
      req.session.name = auth.name;
      res.send({
        status: 'ok',
        result: {
          email: email,
          uid: auth.uid
        }
      });
    }
    else {
      res.send({status: 'ERR-PASSWORD', message: DICT.PASSWORD_WRONG});
    }
  });
};

/**
 * Get my info
 */
exports.me = function (req, res) {
  var userId = req.user._id;
  Auth.findOne({
    _id: userId
  }, '-pass', function (err, user) { // don't ever give out the password or salt
    if (err) return next(err);
    if (!user) return res.status(401).send('Unauthorized');
    res.send(user);
  });

};


// Creates a new auth in the DB.
exports.create = function (req, res) {
  var email = req.body.email;
  var name = req.body.name;

  console.log(" /api/auths - post : ", email);
  var uid = UT.createUniqueId();

  var saveData = {
    email: email
  };

  Auth.findOne(saveData, function (err, auth) {
    if (err) {
      return handleError(res, err);
    }
    if (!auth) {
      saveData.uid = uid;
      saveData.name = name;
      if (!config.auth) {
        saveData.active = true;
      }

      Auth.create(saveData, function (err, auth) {
        if (err) {
          return handleError(res, err);
        }
        if (config.auth && config.auth.email) EMAIL.sendVerifyMail(auth.name, auth.email, auth.uid);

        return res.status(201).json(auth);
        // register in XPUSH

        //request.signup(saveData.uid, saveData.uid, utils.encrypto(saveData.PW), "WEB",)


        /*
         request.post(
         'http://54.178.160.166:8000/user/register',
         {form: {A: 'stalk', U: saveData.uid, PW: saveData.uid, D: 'web', DT: {NM: saveData.name, I: ''}}},
         function (error, response, result) {
         if (!error && response.statusCode == 200) {
         // user-register success
         var resData = JSON.parse(result);
         if ("ok" == resData.status) {
         return res.status(201).json(auth);
         } else if ("ERR-INTERNAL" == resData.status && "ERR-USER_EXIST" == resData.message) {
         return handleError(res, result);
         } else {
         return handleError(res, result);
         }
         } else {
         return handleError(res, error);
         }
         }
         );
         */
      });
    } else if (!auth.active) {
      res.send({status: 'AUTH-DEACTIVE', message: DICT.EMAIL_DEACTIVE});
    } else {
      res.send({status: 'USER-EXIST', message: DICT.USER_EXIST});
    }
  });
};

exports.createDirect = function (req, res) {
  var email = req.body.email;
  var name = req.body.name;
  var pass = req.body.password;

  console.log(" /api/auths - post : ", email);
  var uid = UT.createUniqueId();

  var saveData = {
    email: email
  };

  Auth.findOne(saveData, function (err, auth) {
    if (err) {
      return handleError(res, err);
    }
    if (!auth) {
      saveData.uid = uid;
      saveData.name = name;
      saveData.pass = UT.encrypto(pass);
      saveData.uid = uid;
      saveData.active = true;
      saveData.image = "https://raw.githubusercontent.com/xpush/io.stalk.admin/master/client/assets/images/face.png";

      Auth.create(saveData, function (err, auth) {
        if (err) {
          return handleError(res, err);
        }
        XPUSH.signup(auth.uid, UT.encrypto(auth.uid), "WEB", function () {
          console.log("**** xpush : signup complete");
          console.log(arguments);
          //if (config.auth && config.auth.email) EMAIL.sendVerifyMail(auth.name, auth.email, auth.uid);
          return res.status(201).json(auth);
        });

      });
    } else {
      res.send({status: 'USER-EXIST', message: DICT.USER_EXIST});
    }
  });
};

exports.reconfirm = function (req, res) {
  var email = req.body.email;
  var uid = uuid.v4();
  var savedData = {
    email: email
  };
  Auth.findOne(savedData, function (err, auth) {
    if (err) {
      return handleError(res, err);
    }
    if (!auth) {
      return res.status(404).send('Not Found');
    }

    var before = auth.ts;
    var current = new Date();

    var diff = current - before;
    console.log(diff);
    if (diff > 60 * /*60 **/ 1000) {
      var updated = _.merge(auth, {uid: uid, ts: new Date()});
      updated.save(function (err) {
        if (err) {
          return handleError(res, err);
        }
        if (config.auth && config.auth.email) EMAIL.sendVerifyMail(auth.name, auth.email, auth.uid);
        return res.status(200).json(auth);
      });
    } else {
      res.send({status: 'ERR-ACTIVE', message: DICT.ACTIVATE_WRONG});
    }
  });
};

exports.activate = function (req, res) {
  var email = req.body.email;
  var uid = req.body.uid;
  var pass = req.body.password;

  var saveData = {
    //email: email,
    uid: uid
  };
  Auth.findOne(saveData, function (err, auth) {

    if (err) {
      return handleError(res, err);
    }
    if (!auth) {
      res.send({status: 'ERR-ACTIVE', message: DICT.ACTIVATE_WRONG});
    } else {
      var updated = _.merge(auth, {pass: UT.encrypto(pass), active: true, uid: undefined});
      updated.save(function (err) {
        if (err) {
          return handleError(res, err);
        }
        XPUSH.signup(updated.uid, UT.encrypto(updated.uid), "WEB", function () {
          console.log("**** xpush : signup complete");
          console.log(arguments);
          //if (config.auth && config.auth.email) EMAIL.sendVerifyMail(auth.name, auth.email, auth.uid);
          return res.status(201).json(auth);
        });

        //return res.status(200).json(auth);
      });
    }
  });
};

// Updates an existing auth in the DB.
exports.update = function (req, res) {
  if (req.body._id) {
    delete req.body._id;
  }

  var saveData = {
    //email: email,
    uid: req.params.id
  };

  Auth.findOne(saveData, function (err, auth) {

    console.log(req.params.id);
    if (err) {
      console.log(err);
      return handleError(res, err);
    }
    if (!auth) {
      return res.status(404).send('Not Found');
    }
    var updated = _.merge(auth, req.body);
    updated.save(function (err) {
      if (err) {
        return handleError(res, err);
      }
      return res.status(200).json(auth);
    });
  });
};

// Deletes a auth from the DB.
exports.destroy = function (req, res) {
  Auth.findById(req.params.id, function (err, auth) {
    if (err) {
      return handleError(res, err);
    }
    if (!auth) {
      return res.status(404).send('Not Found');
    }
    auth.remove(function (err) {
      if (err) {
        return handleError(res, err);
      }
      return res.status(204).send('No Content');
    });
  });
};

exports.getLatLng = function (req, res, next) {
  var ip = req.params.ip;

  satelize.satelize({ip: ip}, function (err, geoData) {
    // process err

    // if data is JSON, we may wrap it in js object
    var obj = {};
    if (geoData) {
      obj = JSON.parse(geoData);
    }

    res.json(obj);
  });
};

exports.getGeoLocation = function (req, res, next) {
  var ip = req.body.ip;

  satelize.satelize({ip: ip}, function (err, geoData) {

    if (err) {
      return handleError(res, err);
    }
    if(!geoData){
      return handleError(res, 'Not Found');
    }else {
      var obj = {};
      try {
        obj = JSON.parse(geoData);
      } catch ( err ){
        console.log(err);
      }
      res.json(obj);
    }


  });
};

exports.getSessionServerUrl = function (req, res, next) {

  var returnJson = {};

  returnJson['app'] = config.xpush.A;

  returnJson['server'] = {};
  returnJson.server['xpush'] = config.xpush.url;
  returnJson.server['stalk'] = config.host + ':' + config.port;

  res.json(returnJson);

};

function handleError(res, err) {
  return res.status(500).send(err);
}
