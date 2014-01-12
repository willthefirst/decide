'use strict';

var checkless = angular.module('checkless', [
	'checkless.controllers',
	'checkless.factories',
	'checkless.directives'
	]).config([
	'$locationProvider', function($locationProvider) {
		$locationProvider.html5Mode(true);
	}
]);