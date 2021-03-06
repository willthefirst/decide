'use strict';

angular.module('checkless.controllers', ['checkless.factories'])
.controller('PopupPeriodInfo', ['$scope', '$location', 'redirectRules', 'storage', 'utilities', 'build', function ( $scope, $location, redirectRules, storage, utilities, build ) {

	$scope.current_period = {};

	utilities.getDomainFromTab(function(domain){

		$scope.current_domain = domain;

		storage.getSingleLocalInfo( 'entries', domain, function(domain_props) {
			var time = new Date(domain_props.periodEnd);

			var left_time = new Date();

			// Fallback if Chrome alarms don't work: if past alarm time, smash the period.
			if (time.getTime() < left_time.getTime()) {
				chrome.runtime.sendMessage({
					type: 'kill_period',
					domain: domain
				});
			}

			// Determine minutes left
			left_time = Math.floor((time - left_time) / (1000*60));

			$scope.current_period.periodMinutesLeft = left_time;
			if (left_time !== 1) {
				$scope.current_period.periodMinutesLeftPlural = "s";
			}

			// Determine time that period ends
			var end_time = time.toLocaleTimeString().toLowerCase();
			$scope.current_period.periodEnd = end_time;

			// Inform how many periods are left
			if (domain_props.periodsLeft === 1) {
				$scope.periodsLeftMsg = '1 check left today.';
			}
			else {
				$scope.periodsLeftMsg = domain_props.periodsLeft + ' checks left today.';
			}
		});
	});

}]).controller('PopupAdd', ['$scope', '$location', 'redirectRules', 'storage', 'utilities', 'build', function ( $scope, $location, redirectRules, storage, utilities, build ) {

	$scope.added = false;

	$scope.newEntry = {
		domain: "",
		periods: 2,
		periodLength: 30
	};

	utilities.getDomainFromTab(function(domain){
		$scope.newEntry.domain = domain;
		$scope.$apply();
	});

	$scope.saveNewEntry = function( entry ) {
		// Update scope entries before updating all local Info
		storage.getAllLocalInfo().then(function(data){
			var entries = data.entries || [];
			console.log(entry.domain);

			// In the unlikely case that user tries to enter something twice, return.
			for (var i = 0; i < entries.length; i++) {
				if (entries[i].domain === entry.domain ) {
					$scope.errors = entry.domain + " has already been saved. To manage it, go to chrome://extension > Check Less > Options";
					return false;
				}
			}

			entry = build.newEntry(entry);
			entries.push(entry);
			storage.updateAllLocalInfo('entries', entries, function() {
				redirectRules.refreshFromLocal();
				$scope.added = true;
			});
		});
	};
}]).controller('Options', ['$scope', 'redirectRules', 'storage', 'alarms', 'utilities', 'build', function ( $scope, redirectRules, storage, alarms, utilities, build ) {
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

	$scope.updateEntry = function( entry ) {
		// Add additional props for a new entry
		entry.periodsLeft = entry.periods;
		entry.periodBeingUsed = false;

		// Clear alarms associated with entry
		alarms.remove(entry.domain);

		// Close any browser actions with domain
		chrome.tabs.query({ url: '*://' + entry.domain + '/*' }, function(array) {
			var tabs_to_remove = []
			for (var i = 0; i < array.length; i++) {
				tabs_to_remove.push(array[i].id);
			}
			chrome.tabs.remove(tabs_to_remove);
		});

		storage.updateSingleLocalInfo('entries', entry.domain, entry, function(){
			redirectRules.refreshFromLocal();
		});
	};

	$scope.removeEntry = function( index ) {
		storage.getAllLocalInfo().then(function(data){
			entries = $scope.entries = data.entries;

			// Clear alarms associated with entry
			alarms.remove(entries[index].domain);

			// Reset badge on any tab with this domain, clear refresh interval on the backend.
			chrome.runtime.sendMessage({
				type: 'entry_removed',
				domain: entries[index].domain
			});

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
		$scope.correctSentence = "I actually, truly, definitely want to use " + $scope.redirectedDomain.domain + ".";
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
			} else {
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
				alarms.set( redirectedDomain.domain, domain_props.periodLength );

				// Calculate end of period time (for updating timer in browser_action)
				// Would rather avoid callback annoyance of doing alarms.get, better to just recalculate.
				var end = new Date();
				end = end.getTime() + (domain_props.periodLength * 60 * 1000);

				// Lift redirect rule on this domain.
				storage.updateSingleLocalInfo(
					'entries',
					domain_props.domain,
					{
						periodBeingUsed : true,
						periodsLeft: (domain_props.periodsLeft - 1),
						periodEnd: end
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
