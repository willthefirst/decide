var decide = angular.module('decide', []);

decide.controller('NewEntry', function ($scope) {

	function updateEntries( array ) {
		// Save update entry list to local storage
		chrome.storage.sync.set( { 'entries': entries } , function() {
			// Notify that we saved.
			chrome.storage.sync.get( 'entries', function( items ) {
				console.log(items);
			});
		});
	}

	// Check for old entries;
	if ( !$scope.entries ) {
		$scope.entries = [];
	}

	var entries = $scope.entries;

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

	$scope.saveNewEntry = function( entry ) {
		entries.push(entry);
		updateEntries(entries);
		$scope.newEntry = '';
	};

	$scope.updateEntry = function( entry ) {
		updateEntries(entries);
	};

	$scope.deleteEntry = function( entry ) {
		entries.splice(entries.indexOf(entry), 1);
		updateEntries(entries);
	};

});