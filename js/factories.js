'use strict';

angular.module('sensei.factories', [])
.factory( 'storage' , function() {

	// Gets object or index for specified domain (domain) from all entries (localData)
	// NEXT: something must be buggy here, affecting both the callback and the wierdness in updateDomainInfo
	var localDomainInfo = function( domain, localData, returnType ) {
		if (!localData.entries) {
			console.error('Nothing in local storage.');
		}
		var found = false;
		for (var i = 0; i < localData.entries.length; i++) {
			if (localData.entries[i].domain === domain) {
				found = true;
				switch (returnType) {
					case 'object':
						return localData.entries[i];
					break
					case 'index':
						return i;
					break
				}
			}
		}
		if (!found) {
			if (config.debug) {
				console.error('Entry not found!');
			}
			return false;
		}
	};

	var getAllLocalInfo = function( callback ) {
		chrome.storage.sync.get( 'entries', function( data ) {
			callback(data);
		});
	};

	return {
		// Returns local info for all entries.
		getAllLocalInfo: getAllLocalInfo,

		// Updates all local info with fresh array
		updateAllLocalInfo: function( array, callback ) {
			// Update entries in local storage
			chrome.storage.sync.set( { 'entries': array } , function() {
				callback();
			});
		},

		// Returns local info for specified domain.
		getDomainInfo: function( domain, callback ) {
			getAllLocalInfo( function(data) {
				callback(localDomainInfo(domain, data, 'object'));
			});
		},

		updateDomainInfo: function( domain, propsToUpdate, callback ) {

			getAllLocalInfo(function(data) {

				// Note: there is a very strange bug when console.log(data), at least in the chrome web inspector.
				// console.log(data) -> data.entries[0].periodBeingUsed is true. (this is wrong)
				// console.log(data.entries[0].periodBeingUsed) -> data.entries[0].periodBeingUsed is false. (this is right)

				// Create the new entry
				var new_entry = localDomainInfo( domain, data, 'object' );
				var i = 0;
				for (i in propsToUpdate) {
					new_entry[i] = propsToUpdate[i];
				};

				// Find the index of correct entry and update
				var new_entry_index = localDomainInfo( domain, data, 'index' );
				data.entries[new_entry_index] = new_entry;

				// Update the whole entries object in local storage.
				chrome.storage.sync.set( { 'entries' : data.entries }, function() {
					callback();
				});

			});
		}
	};
}).factory('redirectRules', function () {

	// Utility variables
	var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
	var RedirectByRegEx = chrome.declarativeWebRequest.RedirectByRegEx;
	// var RedirectRequest = chrome.declarativeWebRequest.RedirectRequest;

	// Register rules
	var registerRules = function( data ) {
		var rules = [];
		var entries = data.entries;
		for ( var i = 0; i < entries.length; i++) {
			// If period is in use, skip
			if (entries[i].periodBeingUsed) {
				if (config.debug) {
					console.log('Period being used, skipping.');
				}
			}
			else {
				var redirectRule = {
					conditions: [
						new RequestMatcher({
							url: {
								hostContains: entries[i].domain
							}
						})
					],
					actions: [
						new RedirectByRegEx({
							from: '(.*)',
							to: ([config.redirectUrl] + '?' + 'domain=' + entries[i].domain + '&original=' + '$1')
						})
					]
				};
				rules.push(redirectRule);
			}
		}

		// Callback after rules are accepted
		var callback = function() {
			if (chrome.runtime.lastError) {
				console.log('Error adding rules: ');
				console.dir(chrome.runtime.lastError.message);
			} else {
				chrome.declarativeWebRequest.onRequest.getRules(null,
					function(rules) {
						if (config.debug) {
							console.info('Now the following rules are registered: ' + JSON.stringify(rules, null, 2));
						}
					}
				);
			}
		};

		chrome.declarativeWebRequest.onRequest.addRules(rules, callback);
	};

	var refreshFromLocal = function() {
		chrome.declarativeWebRequest.onRequest.removeRules(
			null,
			function() {
				if (chrome.runtime.lastError) {
					alert('Error clearing rules: ' + chrome.runtime.lastError);
				} else {
					chrome.storage.sync.get('entries', function( data ) {
						if (data.entries.length > 0) {
							registerRules(data);
						}
						else {
							chrome.declarativeWebRequest.onRequest.removeRules(
								null,
								function() {
									if (chrome.runtime.lastError) {
										alert('Error clearing rules: ' + chrome.runtime.lastError);
									} else {
										if (config.debug) {
											console.log('No rules registered.');
										}
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

}).factory('alarms', function() {

	return {
		set: function( domain , periodLength ) {
			chrome.alarms.create(domain, {
				delayInMinutes: periodLength
			});
			chrome.alarms.get(domain, function(alarm){
				if (!alarm) {
					console.error('Alarm failed to set.')
				}
				else {
					var rings = new Date(alarm.scheduledTime);
					if (config.debug) {
						console.log(domain, 'period started, ends on', rings );
					}
				}

			});
		}
	};
}).factory('utilities', function() {
	return {
		// Clean domain input to match xxx.com (remove http://, https//, etc.)
		cleanDomainString : function( string ) {
			if (!string) {
				return;
			}
			var cleaned = (string).replace(/^(?:(http:\/\/www.)|(https:\/\/www.)|(http:\/\/)|(https:\/\/)|(www.))/g, '');
			return cleaned;
		}
	}
});
