'use strict';

/**
 * Removes server error when user updates input
 */
angular.module('withtalkApp')
.directive('pwCheck', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (scope, elem, attrs, ctrl) {
      var firstPassword = '#' + attrs.pwCheck;
      elem.add(firstPassword).on('keyup', function () {
        scope.$apply(function () {
          var v = elem.val()===$(firstPassword).val();
          ctrl.$setValidity('pwmatch', v);
        });
      });
    }
  };
});