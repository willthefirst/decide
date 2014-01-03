'use strict';

angular.module('sensei.factories', [])
.factory( 'storage' , function( $q ) {

	// Gets object or index for specified domain (domain) from all entries (localData)
	// NEXT: something must be buggy here, affecting both the callback and the wierdness in updateDomainInfo
	var parseSingleLocalObject = function( category, key_value, data_to_scan, returnType ) {
		if (!data_to_scan[category]) {
			return;
		}
		// Set key to search for according to category
		var key;
		switch (category) {
			case 'entries':
				key = 'domain'
			break
			case 'distractions':
				key = 'txt'
			break
		}

		var found = false;

		for (var i = 0; (i < data_to_scan[category].length && !found); i++) {
			if (data_to_scan[category][i][key] === key_value) {
				found = true;
				switch (returnType) {
					case 'object':
						return data_to_scan[category][i];
					break
					case 'index':
						return i;
					break
				}
			}
		}
		// If not found
		return false;
	};

	var updateAllLocalInfo = function( key, value, callback ) {
		var object_to_set = {};
		object_to_set[key] = value;
		chromeStorage.set( object_to_set , function() {
			if(chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError.message);
				return;
			}
			callback();
		});
	};

	var getAllLocalInfo = function() {
		var deferred = $q.defer();
		chromeStorage.get( null , function( data ) {
			if (!data) {
				deferred.reject();
			} else {
				deferred.resolve(data);
			}
		});
		return deferred.promise;
	};

	return {
		// Returns all local storage.
		getAllLocalInfo: getAllLocalInfo,

		// Returns local info for specified key in category.
		getSingleLocalInfo: function( category, key, callback ) {
			getAllLocalInfo(function(data_to_scan) {
				callback(parseSingleLocalObject(category, key, data_to_scan, 'object'));
			});
		},

		// Updates all local info with fresh array
		updateAllLocalInfo: updateAllLocalInfo,

		updateSingleLocalInfo: function( category, key, propsToUpdate, callback ) {

			getAllLocalInfo(function(data){
				// Create the new entry
				var new_item = parseSingleLocalObject( category, key, data, 'object' );
				var i = 0;
				console.log(new_item);
				for (i in propsToUpdate) {
					new_item[i] = propsToUpdate[i];
				};

				// Find the index of correct entry and update
				var new_item_index = parseSingleLocalObject( category, key, data, 'index' );
				data[category][new_item_index] = new_item;

				// Update the whole entries object in local storage.
				updateAllLocalInfo(category, data[category], function() {
					callback();
				});
			});

		}
	};
}).factory('redirectRules', function ( storage ) {

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
					storage.getAllLocalInfo(function(data){
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
