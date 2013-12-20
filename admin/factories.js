'use strict';

decide.factory('redirectRules', function () {

	// Duplicated from event_page.js
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
				console.info('Rules successfully updated');
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

	var clearRules = function( callback ) {

	}

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

						console.log('z domain_list=', domain_list);
						if (domain_list.length > 0) {
							registerRules(domain_list);
						}
						else {
							clearRules( function() {
								console.log('No rules registered.');
							});
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
				chrome.storage.sync.get( 'entries', function( data ) {
					console.log(data);
				});
				callback();
			});
		}
	};
});