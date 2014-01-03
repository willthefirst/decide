'use strict';

angular.module('sensei.controllers', ['sensei.factories'])
.controller('Options', ['$scope', 'redirectRules', 'storage', 'alarms', 'utilities', function ( $scope, redirectRules, storage, alarms, utilities ) {
	var entries;
	var distractions;

	//TODO Any way to refactor this?
	storage.getAllLocalInfo().then(function(data){
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

		storage.updateSingleLocalInfo('entries', entry.domain, entry, function(){
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

	// Watch for change on any distractions, if so remember their innitial value in order to update local storage.

	$scope.saveNewDistraction = function( distraction ) {

		// Add additional props for a new entry
		// Append type
		var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
		var urlPattern = new RegExp(expression)
 	    var isUrl = urlPattern.test(distraction.txt);
	    if (isUrl) {
	    	distraction.type = 'url';
	    	if (distraction.txt.substr(0, 'http://'.length) !== 'http://')
	    	{
	    	    distraction.txt = 'http://' + distraction.txt;
	    	}
	    } else {
	    	distraction.type = 'text'
	    }
		// Append old text
		distraction.oldTxt = distraction.txt;
		distractions.push(distraction);
		storage.updateAllLocalInfo('distractions', distractions, function() {
		});
		$scope.newDistraction = '';
	}

	$scope.updateDistraction = function( distraction ) {
		var old_key = distraction.oldTxt;
		distraction.oldTxt = distraction.txt;
		storage.updateSingleLocalInfo('distractions', old_key, distraction, function(){});
	};

	$scope.removeDistraction = function( distraction ) {
		distractions.splice(distractions.indexOf(distraction), 1);
		storage.updateAllLocalInfo('distractions', distractions, function() {});
	};

}]).controller('Allow', ['$scope', '$location', 'storage', 'redirectRules', 'alarms', '$timeout', function ( $scope, $location, storage, redirectRules, alarms, $timeout ) {

	angular.element(document).ready(function () {
		var input = angular.element(document.getElementById("#js-allow-sentence"));		
	});

	var redirectedDomain = $scope.redirectedDomain = {};
	var queryUrl = $location.search().domain;
	var over = false;

	storage.getAllLocalInfo().then(function(data){
		$scope.distractions = data.distractions;
	});

	storage.getSingleLocalInfo( 'entries', queryUrl, function(domain_props) {
		redirectedDomain.domain = domain_props.domain;
		redirectedDomain.periodLength = domain_props.periodLength;
		redirectedDomain.periodsLeft = domain_props.periodsLeft;
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
