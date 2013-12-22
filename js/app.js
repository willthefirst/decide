'use strict';

var focusMeNow = angular.module('focusMeNow', [
		'focusMeNow.controllers',
		'focusMeNow.factories',
		'focusMeNow.directives'
	]).config([
	'$locationProvider', function($locationProvider) {
     	$locationProvider.html5Mode(true);
	}
]);