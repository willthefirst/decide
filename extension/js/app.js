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
	redirectUrl: chrome.extension.getURL('views/redirect.html'),
	default : {
		periods: 2,
		periodLength: 30,
		distractions: [],
		entries : []
	}
};

// Use local chrome storage for development to avoid hitting MAX_WRITES
var chromeStorage;
if(config.debug){
	chromeStorage = chrome.storage.local;
} else {
	chromeStorage = chrome.storage.sync;
}