'use strict';

decide.factory('redirectRules', function () {

	// Duplicated from event_page.js
	var config = {
		redirectUrl: chrome.extension.getURL('redirect/index.html')
		};

	// Utility variables
	var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
	var RedirectRequest = chrome.declarativeWebRequest.RedirectRequest;

	// Register rules
	var registerRules = function( domain_list ) {
		var rules = [];

		for (var i = 0; i < domain_list.length; i++ ) {
			var redirectRule = {
				conditions: [
					new RequestMatcher({
						url: {
								hostContains: domain_list[i]
						}
					})
				],
				actions: [
					new RedirectRequest({
						redirectUrl: ( config.redirectUrl + '?' + 'domain=' + domain_list[i] )
					})
				]
			};
			rules.push(redirectRule);
		}

		var callback = function() {
			if (chrome.runtime.lastError) {
				console.error('Error adding rules: ' + chrome.runtime.lastError);
			} else {
				chrome.declarativeWebRequest.onRequest.getRules(null,
					function(rules) {
						console.info('Now the following rules are registered: ' +
							JSON.stringify(rules, null, 2));
					}
				);
			}
		};

		chrome.declarativeWebRequest.onRequest.addRules(
			rules, callback);
	};

	var refreshFromLocal = function() {
		chrome.declarativeWebRequest.onRequest.removeRules(
			null,
			function() {
				if (chrome.runtime.lastError) {
					alert('Error clearing rules: ' + chrome.runtime.lastError);
				} else {
					var domain_list = [];
					chrome.storage.sync.get('entries', function( data ) {

 						for ( var i = 0; i < data.entries.length; i++) {
							domain_list.push(data.entries[i].domain);
						}

						if (domain_list.length > 0) {
							registerRules(domain_list);
						}
						else {
							chrome.declarativeWebRequest.onRequest.removeRules(
								null,
								function() {
									if (chrome.runtime.lastError) {
										alert('Error clearing rules: ' + chrome.runtime.lastError);
									} else {
										console.log('No rules registered.');
									}
								}
							);
						}
					});
				}
			}
		);
	};

	return {
		'refreshFromLocal' : refreshFromLocal
	};

}).factory( 'storage' , function() {

	return {
		get: function( callback ) {
			chrome.storage.sync.get( 'entries', function( data ) {
				callback(data);
			});
		},
		update: function( array, callback ) {
			// Update entries in local storage
			chrome.storage.sync.set( { 'entries': array } , function() {
				callback();
			});
		}
	};
});