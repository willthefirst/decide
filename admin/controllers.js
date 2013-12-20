'use strict';

var decide = angular.module('decide', []);

decide.controller('NewEntry', function ( $scope, redirectRules, storage ) {

	var entries = $scope.entries = storage.get();

	$scope.saveNewEntry = function( entry ) {
		entries.push(entry);
		storage.update(entries);
		redirectRules.refreshFromLocal();
		$scope.newEntry = '';
	};

	$scope.updateEntry = function( entry ) {
		storage.update(entries);
		redirectRules.refreshFromLocal();
	};

	$scope.removeEntry = function( entry ) {
		entries.splice(entries.indexOf(entry), 1);
		storage.update(entries);
		redirectRules.refreshFromLocal();
	};

});