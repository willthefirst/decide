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

// Duplicate to event_page.js
var config = {
	debug: true,
	redirectUrl: chrome.extension.getURL('views/redirect.html')
};