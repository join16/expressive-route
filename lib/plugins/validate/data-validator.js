'use strict';

var utils = require('../../utils');
var errors = require('./errors');

module.exports = {
  validateValue: validateValue
};

/**
 * Validates value with given config and options
 *
 * @param {Object} config
 * @param {Boolean} [config.skip] if true, skips validation and parse
 * @param {Boolean} [config.multiple] if true, handles value as an array
 * @param {Boolean} [config.object] if true, validate value with config.format object
 * @param {Object} [config.format]
 * @param {Boolean} [config.acceptOtherKeys] if true, allows unexpected keys to be passed
 * @param {Boolean} [config.acceptNull] if true, allows null value
 *
 * @param {Object} options
 * @param {Object} options.validator collection of validation functions
 *
 * @param {String} name
 * @param {*} value
 */
function validateValue(config, options, name, value) {
  config = utils._.cloneDeep(config);
  var type = config.type;

  if (config.skip === true) {
    return value;
  }
  if ((value === '') && (config.trim !== false)) {
    value = null;
  }
  if (utils._.isNil(value) && !utils._.isNil(config.defaultValue)) {
    return config.defaultValue;
  }
  if (utils._.isNull(value)) {
    return (config.acceptNull === true) ?
      null :
      undefined;
  }
  if (utils._.isUndefined(value)) {
    return undefined;
  }

  if (config.multiple === true) {
    if (!utils._.isArray(value)) {
      throw new errors.ValidationError(name, value, 'NotArray');
    }

    config.multiple = false;
    
    return utils._.map(value, function(element) {
      return validateValue(config, options, name, element);
    });
  }

  if (config.object === true) {
    if (!utils._.isObject(value)) {
      throw new errors.ValidationError(name, value, 'NotObject');
    }
    
    var result = {};
    var keys = utils._.keys(value);

    utils._.forOwn(config.format, function(_config, _key) {
      var _value = value[_key];
      utils._.pull(keys, _key);
      
      var resultValue = validateValue(_config, options, _key, _value);

      if (utils._.isUndefined(resultValue)) {
        if (_config.optional) {
          return;
        }

        throw new errors.ValidationError(_key, resultValue, 'Required');
      }
      if (utils._.isNull(resultValue) && (_config.acceptNull !== true)) {
        return;
      }
      
      result[_key] = resultValue;
    });
    
    if (keys.length > 0) {
      if (config.acceptOtherKeys === true) {
        utils._.forEach(keys, function(key) {
          result[key] = value[key];
        });

      } else {
        throw new errors.ValidationError(keys[0], value[keys[0]], 'Unexpected');
      }
    }
    
    value = result;

  } else {
    if (!type.validate(value)) {
      throw new errors.InvalidTypeError(name, value);
    }

    if (utils._.isFunction(type.parse)) {
      value = type.parse(value);
    }

  }

  if (utils._.isObject(config.validate)) {
    utils._.forOwn(config.validate, function(validationArgs, name) {
      var isNot = false;
      var validationResult = false;
      
      if (/^NOT\_.*$/.test(name)) {
        name = name.replace('NOT_', '');
        isNot = true;
      }
      
      if (utils._.isFunction(validationArgs)) {
        validationResult = validationArgs(value);

      } else {
        var validationFunc = options.validator[name];
        if (validationArgs === true) {
          validationArgs = [];
        }
        var args = utils._.concat([value], validationArgs);

        validationResult = validationFunc.apply(validationFunc, args);
      }
      
      if (isNot) {
        validationResult = !validationResult;
      }

      if (!validationResult) {
        throw new errors.ValidationError(name, value, name);
      }
    });
  }

  return value;
}