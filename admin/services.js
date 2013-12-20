var decide = angular.module('decide', []);

decide.service('Configure', function ($scope) {

	// Configuration
	var config = {
		redirectUrl: 'http://www.yahoo.com'
	};

	// Utility variables
	var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
	var RedirectRequest = chrome.declarativeWebRequest.RedirectRequest;

	// Register rules
	var registerRules = function( domain_list ) {

		var domain_conditions = [];

		for (var i = 0; i < domain_list.length; i++ ) {
			domain_conditions.push(
				new RequestMatcher({
					url: {
						hostContains: domain_list[i]
					}
				})
			);
		}

		var redirectRule = {
			conditions: domain_conditions,
			actions: [
				new RedirectRequest({
					redirectUrl: config.redirectUrl
				})
			]
		};

		var callback = function() {
			if (chrome.runtime.lastError) {
				console.error('Error adding rules: ' + chrome.runtime.lastError);
			} else {
				console.info('Rules successfully installed');
				chrome.declarativeWebRequest.onRequest.getRules(null,
					function(rules) {
						console.info('Now the following rules are registered: ' +
							JSON.stringify(rules, null, 2));
					}
				);
			}
		};

		chrome.declarativeWebRequest.onRequest.addRules(
			[redirectRule], callback);
	};

	// https://developer.chrome.com/extensions/examples/extensions/catifier/event_page.js
	function setup() {
	  // This function is also called when the extension has been updated.  Because
	  // registered rules are persisted beyond browser restarts, we remove
	  // previously registered rules before registering new ones.
	  chrome.declarativeWebRequest.onRequest.removeRules(
		null,
		function() {
			if (chrome.runtime.lastError) {
				alert('Error clearing rules: ' + chrome.runtime.lastError);
			} else {
				registerRules(['yahoo.com', 'twitter.com']);
			}
		});
	};

	// This is triggered when the extension is installed or updated.
	chrome.runtime.onInstalled.addListener(setup);

	// Next: prompt and store user input
	// https://gomockingbird.com/mockingbird/#gzb5vxa/sCsPR

});