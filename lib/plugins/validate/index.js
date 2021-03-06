'use strict';

var utils = require('../../utils');
var dataValidator = require('./data-validator');
var DataTypes = require('./data-types');
var errors = require('./errors');
var routeTableResultHandler = require('./route-table-result-handler');

exports.key = 'validate';

exports.paramHandler = function(config, options, req, res, key, value) {
  return dataValidator.validateValue(config, options, key, value);
};

exports.handler = function(config, options, req, res, next) {
  var queryKey = options.query || 'query';
  var bodyKey = options.body || 'body';
  var paramsKey = options.params || 'params';
  
  if (config.skipQuery) {
    req[queryKey] = req.query;
    
  } else {
    req[queryKey] = dataValidator.validateValue({
      object: true,
      format: config.query || {},
      multiple: config.multipleQuery,
      validate: config.validateQuery
    }, options, 'query', req.query);
  }
  
  if (config.skipBody) {
    req[bodyKey] = req.body;
    
  } else {
    req[bodyKey] = dataValidator.validateValue({
      object: true,
      format: config.body || {},
      multiple: config.multipleBody,
      validate: config.validateBody
    }, options, 'body', req.body); 
  }
  
  if (config.skipParams) {
    req[paramsKey] = req.params;
    
  } else if (utils._.isObject(config.params)) {
    req[paramsKey] = dataValidator.validateValue({
      object: true,
      format: config.params,
      validate: config.validateParams
    }, options, 'params', req.params);
  }
  
  next();
};

exports.routeTableResult = function(config) {
  var result = {};
  var options = this.options;

  if (utils._.isObject(config.body)) {
    result.body = routeTableResultHandler.getRouteTableResult(options, {
      object: true,
      format: config.body
    });
  }
  if (utils._.isObject(config.query)) {
    result.query = routeTableResultHandler.getRouteTableResult(options, {
      object: true,
      format: config.query
    });
  }

  return result;
};

///// additional exports for development
exports.DataTypes = DataTypes;
exports.errors = errors;