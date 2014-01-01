'use strict';

angular.module('sensei.controllers', ['sensei.factories'])
.controller('Options', ['$scope', 'redirectRules', 'storage', 'alarms', 'utilities', function ( $scope, redirectRules, storage, alarms, utilities ) {
	var entries;
	var distractions;

	//TODO Any way to refactor this?
	storage.getAllLocalInfo(function(data) {
		if (!data.entries) {
			entries = $scope.entries = [];
		}
		else {
			entries = $scope.entries = data.entries;
		}

		if(!data.distractions) {
			distractions = $scope.distractions = []
		}
		else {
			distractions = $scope.distractions = data.distractions;
		}

		$scope.$apply();
	});


	// Entries

	$scope.saveNewEntry = function( entry ) {

		entry.domain = utilities.cleanDomainString(entry.domain);

		// Add additional props for a new entry
		entry.periodsLeft = entry.periods;
		entry.periodBeingUsed = false;
		entries.push(entry);
		storage.updateAllLocalInfo('entries', entries, function() {
			redirectRules.refreshFromLocal();
		});
		$scope.newEntry = '';
	};

	$scope.updateEntry = function( entry ) {
		// Add additional props for a new entry
		entry.periodsLeft = entry.periods;
		entry.periodBeingUsed = false;

		storage.updateDomainInfo(entry.domain, entry, function(){
			redirectRules.refreshFromLocal();
		});
	};

	$scope.removeEntry = function( entry ) {
		entries.splice(entries.indexOf(entry), 1);
		alarms.remove(entry.domain);
		storage.updateAllLocalInfo('entries', entries, function() {
			redirectRules.refreshFromLocal();
		});
	};

	// Distractions

	$scope.saveNewDistraction = function( distraction ) {
		// Add additional props for a new entry
		distractions.push(distraction);
		storage.updateAllLocalInfo('distractions', distractions, function() {
		});
		$scope.newDistraction = '';
	}

	// $scope.updateDistraction = function( distraction ) {
	// 	storage.updateDomainInfo(distraction.domain, distraction, function(){
	// 		redirectRules.refreshFromLocal();
	// 	});
	// };

	$scope.removeDistraction = function( distraction ) {
		distractions.splice(entries.indexOf(distraction), 1);
		storage.updateAllLocalInfo('distractions', distractions, function() {});
	};

}]).controller('Allow', ['$scope', '$location', 'storage', 'redirectRules', 'alarms', function ( $scope, $location, storage, redirectRules, alarms ) {

	angular.element(document).ready(function () {
		var input = angular.element(document.getElementById("#js-allow-sentence"));
		console.log(input);
	});

	var redirectedDomain = $scope.redirectedDomain = {};
	var queryUrl = $location.search().domain;
	var over = false;

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

	var fire_once_per_page = 0;

	$scope.usePeriod = function() {
		fire_once_per_page++;
		if(fire_once_per_page > 1) {return};

		var letPass = function( url ) {
			if(!url) {
				window.location = $location.search().domain;
			}else {
				window.location = url;
			}
		};

		storage.getDomainInfo( redirectedDomain.domain, function(domain_props) {
			// If there are no periods left
			if (domain_props.periodsLeft < 1) {
				alert('You have no periods left today for', domain_props.domain);
			}
			// If periods remain
			else {

				// Set alarm for end of period
				alarms.set ( redirectedDomain.domain, domain_props.periodLength );

				// Lift redirect rule on this domain.
				storage.updateDomainInfo(
					domain_props.domain,
					{
						periodBeingUsed : true,
						periodsLeft: (domain_props.periodsLeft - 1),
					},
					function() {
						redirectRules.refreshFromLocal();
						// Redirect to specified page, MUST happen at end of this function
						letPass($location.search().original);
					}
					);
			}

		} );
	};
}]);
