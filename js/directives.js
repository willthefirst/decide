'use strict';

angular.module('focusMeNow.directives', [])
.directive('validateDomain', function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) {
        	var regex = new RegExp(/^(?:(http:\/\/)|(https:\/\/)|())([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,6}?$/i);
        	ctrl.$parsers.unshift(function(value) {
                // test and set the validity after update.
                var valid = regex.test(value);
                // set ng-invalid-domain/ng-valid-domain on current element.
                ctrl.$setValidity('domain', valid);

                // if it's valid, return the value to the model,
                // otherwise return undefined.
                return valid ? value : undefined;
            });
        }
    };
});