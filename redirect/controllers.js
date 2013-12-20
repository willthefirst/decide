'use strict';

var redirect = angular.module('redirect', []);

redirect.controller('Allow', function ( $scope, storage ) {
	var redirectedDomain = $scope.redirectedDomain = {};

	// TODO: make this set to query in URL.
	var queryUrl = "google.com"

	storage.getDomainInfo( queryUrl, function(domain_props) {
		redirectedDomain.domain = domain_props.domain;
		redirectedDomain.periodLength = domain_props.periodLength;
		redirectedDomain.periodsLeft = domain_props.periodsLeft;
		$scope.$apply();
	})

	$scope.usePeriod = function() {

		// Lift redirect rule on this domain.
		storage.updateDomainInfo(
			redirectedDomain.domain,
			{
				periodBeingUsed : true,
			},
			function() {
				storage.getDomainInfo( queryUrl, function(domain_props) {
					console.log('callback:', domain_props);
				}
			);
		});

		// Set timeLeftInPeriod.



	}
});
