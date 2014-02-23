'use strict';

angular.module('checkless.directives', ['checkless.factories'])
.directive('validateDomain', [ 'storage' , 'utilities', function( storage , utilities ) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) {
            ctrl.$parsers.unshift(function(value) {
                var is_not_registered = true;

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
                return (is_not_registered) ? value : undefined;
            });
        }
    };
}]).directive('validateAllowSentence', ['storage', function( storage ) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) {
            var show_tip = false;
            ctrl.$parsers.unshift(function(value) {
                var last;
                var correct_sentence = scope.correctSentence;
                var is_correct_sentence = (value === correct_sentence);
                ctrl.$setValidity('allow-sentence', is_correct_sentence);

                // If valid, return the value to the model, and initiate usePeriod, otherwise return undefined.
                if (is_correct_sentence) {
                    scope.usePeriod();
                }
                // If invalid, destroy sentence if typed badly
                else {
                    value = value || "";
                    last = value.slice(-1);
                    if (last !== correct_sentence.charAt(value.length - 1)) {
                        value = "";
                        element[0].value = "";
                        if (!show_tip) {
                            // Show tip here
                            show_tip = true;
                        }
                    }
                }
                return value;

            });
        }
    };
}]);