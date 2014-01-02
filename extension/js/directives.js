'use strict';

angular.module('sensei.directives', ['sensei.factories'])
.directive('validateDomain', [ 'storage' , 'utilities', function( storage , utilities ) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) {
        	var regex = new RegExp(/^(?:(http:\/\/)|(https:\/\/)|())([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,6}?$/i);
        	ctrl.$parsers.unshift(function(value) {
                var is_proper_format;
                var is_not_registered = true;

                // Check format of string
                is_proper_format = regex.test(value);
                // Set ng-domain-valid|invalid on current element.
                ctrl.$setValidity('domain', is_proper_format);

                // Check if domain is already registered
                var cleaned_value = utilities.cleanDomainString(value);
                storage.getSingleLocalInfo('entries', cleaned_value, function( object ) {
                    if(object) {
                        is_not_registered = false;
                    }
                    // Set ng-not-registered-valid|invalid on current element.
                    ctrl.$setValidity('notRegistered', is_not_registered);
                });

                // If valid, return the value to the model, otherwise return undefined.
                return (is_proper_format && is_not_registered) ? value : undefined;
            });
        }
    };
}]).directive('validateAllowSentence', ['storage', function( storage ) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) {
            ctrl.$parsers.unshift(function(value) {
                var is_correct_sentence = (value === "I want to use " + scope.redirectedDomain.domain + " efficiently.");
                ctrl.$setValidity('allow-sentence', is_correct_sentence);

                // If valid, return the value to the model, and initiate usePeriod, otherwise return undefined.
                if (is_correct_sentence) {
                    scope.usePeriod();
                    return value;
                }
                else {
                    return undefined;
                }
            });
        }
    };
}]);