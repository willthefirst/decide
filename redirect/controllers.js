'use strict';

var redirect = angular.module('redirect', []);

redirect.controller('Allow', function ( $scope, storage ) {
	var redirectedDomain = $scope.redirectedDomain = {};

	// TODO: make this set to query in URL.
	var queryUrl = "google.com"

	storage.domain_info( queryUrl, function(domain_props) {
		console.log(domain_props);
		redirectedDomain.url = domain_props.domain;
		redirectedDomain.periodLength = domain_props.duration;
		redirectedDomain.periodsLeft = domain_props.periods;
		$scope.$apply();
	})
});
