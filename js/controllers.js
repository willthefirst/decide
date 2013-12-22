'use strict';

angular.module('focusMeNow.controllers', ['focusMeNow.factories'])
.controller('Options', function ( $scope, redirectRules, storage, utilities ) {
	var entries;

	storage.getAllLocalInfo(function(data) {
		if (!data.entries) {
			entries = $scope.entries = [];
		}
		else {
			entries = $scope.entries = data.entries;
		}
		$scope.$apply();
	});

	$scope.saveNewEntry = function( entry ) {

		utilities.cleanDomainString(entry.domain);

		// Add additional props for a new entry
		entry.periodsLeft = entry.periods;
		entry.periodBeingUsed = false;
		entries.push(entry);
		storage.updateAllLocalInfo(entries, function() {
			redirectRules.refreshFromLocal();
		});
		$scope.newEntry = '';
	};

	$scope.updateEntry = function( entry ) {
		storage.updateDomainInfo(entry.domain, entry, function(){
			redirectRules.refreshFromLocal();
		});
	};

	$scope.removeEntry = function( entry ) {
		entries.splice(entries.indexOf(entry), 1);
		storage.updateAllLocalInfo(entries, function() {
			redirectRules.refreshFromLocal();
		});
	};

}).controller('Allow', function ( $scope, $location, storage, redirectRules, alarms ) {
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
		for (var key in changes) {
		var storageChange = changes[key];
		if (config.debug) {
			console.log('Storage key "%s" in namespace "%s" changed. ' +
						'Old value was "%s", new value is "%s".',
						key,
						namespace,
						storageChange.oldValue,
						storageChange.newValue);
			}
		}
	});

	$scope.usePeriod = function() {

		storage.getDomainInfo( redirectedDomain.domain, function(domain_props) {
			// If there are no periods left
			if (domain_props.periodsLeft < 1) {
				alert('You have no periods left today for', domain_props.domain);
			}
			// If periods remain
			else {

				// Lift redirect rule on this domain.
				storage.updateDomainInfo(
					domain_props.domain,
					{
						periodBeingUsed : true,
						periodsLeft: (domain_props.periodsLeft - 1),
					},
					function() {
						redirectRules.refreshFromLocal();
					}
				);

				// Set alarm for end of period
				alarms.set ( redirectedDomain.domain, domain_props.periodLength );

			}

		} );
	};
});
