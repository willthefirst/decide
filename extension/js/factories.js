'use strict';

var getAllLocalInfo = function( callback ) {
	chromeStorage.get( 'entries', function( data ) {
		// If no entries in local, return empty array.
		if(!data.entries) {
			callback({entries:[]});
		}
		else {
			callback(data);
		}
	});
};

angular.module('sensei.factories', [])
.factory( 'storage' , function() {

	// Gets object or index for specified domain (domain) from all entries (localData)
	// NEXT: something must be buggy here, affecting both the callback and the wierdness in updateDomainInfo
	var localDomainInfo = function( domain, localData, returnType ) {
		if (!localData.entries) {
			return;
		} else {
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
				return false;
			}
		}
	};

	return {
		// Returns local info for all entries.
		getAllLocalInfo: getAllLocalInfo,

		// Updates all local info with fresh array
		updateAllLocalInfo: function( array, callback ) {
			// Update entries in local storage
			chromeStorage.set( { 'entries': array } , function() {
				if(chrome.runtime.lastError) {
					console.log(chrome.runtime.lastError.message);
					return;
				}
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
				chromeStorage.set( { 'entries' : data.entries }, function() {
					if(chrome.runtime.lastError) {
						console.log(chrome.runtime.lastError.message);
						return;
					}
					callback();
				});

			});
		}
	};
}).factory('redirectRules', function () {

	// Utility variables
	var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
	var RedirectByRegEx = chrome.declarativeWebRequest.RedirectByRegEx;

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
						console.info('Now the following rules are registered: ' + JSON.stringify(rules, null, 2));
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
					getAllLocalInfo(function(data){
						registerRules(data);
					});
					chrome.declarativeWebRequest.onRequest.getRules(
						null,
						function(stuff) {
							if(stuff && stuff.length > 0) {
								console.error('Refresh the extension. Failed to clear redirect rules before setting new ones. This is probably due to old rules from chrome.storage.sync/storage being left over.');
							}
						}
					);
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
		},

		remove: function( domain ) {
			chrome.alarms.clear( domain );
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
