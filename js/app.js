'use strict';

var sensei = angular.module('sensei', [
		'sensei.controllers',
		'sensei.factories',
		'sensei.directives'
	]).config([
	'$locationProvider', function($locationProvider) {
     	$locationProvider.html5Mode(true);
	}
]);

// Duplicate to event_page.js
var config = {
	debug: false,
	redirectUrl: chrome.extension.getURL('views/redirect.html')
};