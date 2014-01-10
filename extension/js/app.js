'use strict';

var sensei = angular.module('sensei', [
	'sensei.controllers',
	'sensei.factories',
	'sensei.directives'
	]).config([
	'$locationProvider', function($locationProvider) {
		$locationProvider.html5Mode(true);
	}]).run([
	'$rootScope', function($rootScope) {
		$rootScope.config = config;
	}
]);

