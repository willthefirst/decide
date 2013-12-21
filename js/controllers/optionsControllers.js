'use strict';

angular.module('focusMeNow.controllers', ['focusMeNow.factories'])
.controller('NewEntry', function ( $scope, redirectRules, storage ) {

	var entries;

	storage.get(function(data) {
		if (!data.entries) {
			entries = $scope.entries = [];
		}
		else {
			entries = $scope.entries = data.entries;
		}
		$scope.$apply();
	});

	$scope.saveNewEntry = function( entry ) {

		// Add additional props for a new entry
		entry.periodsLeft = entry.periods;
		entry.periodBeingUsed = false;

		entries.push(entry);
		storage.update(entries, function() {
			redirectRules.refreshFromLocal();
		});
		$scope.newEntry = '';
	};

	$scope.updateEntry = function( entry ) {
		storage.update(entries);
		redirectRules.refreshFromLocal();
	};

	$scope.removeEntry = function( entry ) {
		entries.splice(entries.indexOf(entry), 1);
		storage.update(entries, function() {
			redirectRules.refreshFromLocal();
		});
	};

});