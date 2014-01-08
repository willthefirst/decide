'use strict';

angular.module('sensei.controllers', ['sensei.factories'])
.controller('Options', ['$scope', 'redirectRules', 'storage', 'alarms', 'utilities', 'build', function ( $scope, redirectRules, storage, alarms, utilities, build ) {
	var entries;
	var distractions;

	//TODO Any way to refactor this?
	storage.getAllLocalInfo().then(function(data){
		if (!data.entries) {
			entries = $scope.entries = config.default.entries;
			storage.updateAllLocalInfo('entries', entries, function() {
				redirectRules.refreshFromLocal();
			});
		}
		else {
			entries = $scope.entries = data.entries;
		}

		// If distractions were never created, create default ones.
		if(!data.distractions) {
			distractions = $scope.distractions = config.default.distractions;
			storage.updateAllLocalInfo('distractions', distractions, function() {});
		}
		else {
			distractions = $scope.distractions = data.distractions;
		}
	});

	// Entries

	$scope.saveNewEntry = function( entry ) {

		// Update scope entries before updating all local Info
		storage.getAllLocalInfo().then(function(data){
			entries = $scope.entries = data.entries;
			entry = build.newEntry(entry);
			entries.push(entry);
			storage.updateAllLocalInfo('entries', entries, function() {
				redirectRules.refreshFromLocal();
			});
			$scope.newEntry = '';
		});
	};

	$scope.updateEntry = function( entry ) {
		// Add additional props for a new entry
		entry.periodsLeft = entry.periods;
		entry.periodBeingUsed = false;

		// Clear alarms associated with entry
		alarms.remove(entry.domain);

		storage.updateSingleLocalInfo('entries', entry.domain, entry, function(){
			redirectRules.refreshFromLocal();
		});
	};

	$scope.removeEntry = function( index ) {
		storage.getAllLocalInfo().then(function(data){
			entries = $scope.entries = data.entries;

			// Clear alarms associated with entry
			alarms.remove(entries[index].domain);

			// Remove from $scope
			entries.splice(index, 1);

			// TODO: refactor this. refresh scope every time something new happens to ensure we have latest local information,
			// but this is unescessary if we are not updating AllLocalInfo.
			storage.updateAllLocalInfo('entries', entries, function() {
				redirectRules.refreshFromLocal();
			});
		});

	};


}]).controller('Allow', ['$scope', '$location', 'storage', 'redirectRules', 'alarms', '$timeout', 'utilities', function ( $scope, $location, storage, redirectRules, alarms, $timeout, utilities) {

	angular.element(document).ready(function () {
		var input = angular.element(document.getElementById("#js-allow-sentence"));
	});

	var redirectedDomain = $scope.redirectedDomain = {};
	var queryUrl = $location.search().domain;
	var over = false;
	var distractions;

	storage.getAllLocalInfo().then(function(data){
		distractions = $scope.distractions = data.distractions;
	});

	storage.getSingleLocalInfo( 'entries', queryUrl, function(domain_props) {
		redirectedDomain.domain = domain_props.domain;
		redirectedDomain.periodLength = domain_props.periodLength;
		redirectedDomain.periodsLeft = domain_props.periodsLeft;
	});

	// Distractions

	// Watch for change on any distractions, if so remember their innitial value in order to update local storage.

	$scope.saveNewDistraction = function( distraction ) {
		distraction = utilities.lintDistraction(distraction);
		distractions.push(distraction);
		storage.updateAllLocalInfo('distractions', distractions, function() {});
		$scope.newDistraction = '';
	}

	$scope.updateDistraction = function( distraction ) {
		var old_key = distraction.oldTxt;
		distraction = utilities.lintDistraction(distraction);
		storage.updateSingleLocalInfo('distractions', old_key, distraction, function(){});
	};

	$scope.removeDistraction = function( distraction ) {
		distractions.splice(distractions.indexOf(distraction), 1);
		storage.updateAllLocalInfo('distractions', distractions, function() {});
	};

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

		storage.getSingleLocalInfo( 'entries', redirectedDomain.domain, function(domain_props) {
			// If there are no periods left
			if (domain_props.periodsLeft < 1) {
				alert('You have no periods left today for', domain_props.domain);
			}
			// If periods remain
			else {

				// Set alarm for end of period
				alarms.set ( redirectedDomain.domain, domain_props.periodLength );

				// Lift redirect rule on this domain.
				storage.updateSingleLocalInfo(
					'entries',
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
