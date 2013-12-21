'use strict';

var redirect = angular.module('redirect', []).config(['$locationProvider', function($locationProvider) {
     $locationProvider.html5Mode(true);
}]);

redirect.controller('Allow', function ( $scope, $location, storage ) {
	var redirectedDomain = $scope.redirectedDomain = {};

	// TODO: make this set to query in URL.
	var queryUrl = $location.search().domain;

	storage.getDomainInfo( queryUrl, function(domain_props) {
		redirectedDomain.domain = domain_props.domain;
		redirectedDomain.periodLength = domain_props.periodLength;
		redirectedDomain.periodsLeft = domain_props.periodsLeft;
		$scope.$apply();
	});

	chrome.storage.onChanged.addListener(function(changes, namespace) {
		for (key in changes) {
		var storageChange = changes[key];
		console.log('Storage key "%s" in namespace "%s" changed. ' +
		            'Old value was "%s", new value is "%s".',
		            key,
		            namespace,
		            storageChange.oldValue,
		            storageChange.newValue);
		}
	});

	$scope.usePeriod = function() {

		// Compute current time and expiration time for period
		var start_time = new Date();
		var end_time = new Date();

		start_time = start_time.getTime();
		end_time = start_time + ( redirectedDomain.periodLength * 60 * 1000 );

		// Lift redirect rule on this domain.
		storage.updateDomainInfo(
			redirectedDomain.domain,
			{
				periodBeingUsed : true,
				timeStart : start_time,
				timeEnd : end_time
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
