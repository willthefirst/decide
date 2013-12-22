'use strict';

angular.module('focusMeNow.directives', [])
.directive('validateDomain', function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) {
        	var input = element[0];
        	console.log(input);
        	console.log(ctrl);

        	var regex = new RegExp(/^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/);

        	ctrl.$parsers.unshift(function(value) {
                // test and set the validity after update.
                var valid = regex.test(value);
                console.log(valid);
                ctrl.$setValidity('domain', valid);

                // if it's valid, return the value to the model,
                // otherwise return undefined.
                return valid ? value : undefined;
            });
        }
    };
});