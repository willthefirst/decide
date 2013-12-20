'use strict';

var decide = angular.module('decide', []);

decide.controller('NewEntry', function ( $scope, redirectRules, storage ) {

	var entries;

	storage.get(function(data) {
		entries = $scope.entries = data.entries;
		$scope.$apply();
	});

	$scope.saveNewEntry = function( entry ) {
		// TODO convert this to the new factory method.
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