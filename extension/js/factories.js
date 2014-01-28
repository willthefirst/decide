'use strict';

angular.module('checkless.factories', [])
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
			getAllLocalInfo().then(function(data_to_scan) {
				callback(parseSingleLocalObject(category, key, data_to_scan, 'object'));
			});
		},

		// Updates all local info with fresh array
		updateAllLocalInfo: updateAllLocalInfo,

		updateSingleLocalInfo: function( category, key, propsToUpdate, callback ) {

			getAllLocalInfo().then(function(data){
				// Create the new entry
				var new_item = parseSingleLocalObject( category, key, data, 'object' );
				var i = 0;
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
	var SendMessageToExtension = chrome.declarativeWebRequest.SendMessageToExtension;
	var IgnoreRules = chrome.declarativeWebRequest.IgnoreRules;

	// Register rules
	var registerRules = function( data ) {

		var rules = [];
		var check_for_redirects = [];
		var entries = data.entries;
		var rule;
		var message = {};
		for ( var i = 0; i < entries.length; i++) {
			// If period is in use, alert event_page to update badge
			if (entries[i].periodBeingUsed) {
				message = {
					'type' : 'update_badge',
					'domain' : entries[i].domain,
					'periodEnd' : entries[i].periodEnd
				};
				message = JSON.stringify(message);
				rule = {
					priority: 500,
					conditions: [
						new RequestMatcher({
							url: {
								hostContains: entries[i].domain
							},
							stages: ['onHeadersReceived'],
							resourceType: ['main_frame']
						})
					],
					actions: [
						new IgnoreRules({
							lowerPriorityThan: 500
						}),
						new SendMessageToExtension({message : message})
					]
				};
			}
			// If period is not being used, redirect
			else {
				rule = {
					priority: 500,
					conditions: [
						new RequestMatcher({
							url: {
								hostContains: entries[i].domain
							}
						})
					],
					actions: [
						new IgnoreRules({
							lowerPriorityThan: 500
						}),
						new RedirectByRegEx({
							from: '(.*)',
							to: ([config.redirectUrl] + '?' + 'domain=' + entries[i].domain + '&original=' + '$1')
						})
					]
				};
			}
			rules.push(rule);
		}

		var default_message = {
			type : 'reset_badge'
		};
		default_message = JSON.stringify(default_message);
		var all_urls_rule = {
			priority: 100,
			conditions: [
				new RequestMatcher({
					url: {
						schemes: ['http','https']
					},
					stages: ['onHeadersReceived'],
					resourceType: ['main_frame']
				})
			],
			actions: [
				new SendMessageToExtension({message : default_message})
			]
		};

		rules.push(all_urls_rule);

		// Callback after rules are accepted
		var callback = function() {
			if (chrome.runtime.lastError) {
				console.log('Error adding rules: ');
				console.dir(chrome.runtime.lastError.message);
			}
			// else {
			// 	chrome.declarativeWebRequest.onRequest.getRules(null,
			// 		function(rules) {
			// 			console.info('Now the following rules are registered: ' + JSON.stringify(rules, null, 2));
			// 		}
			// 	);
			// }
		};

		chrome.declarativeWebRequest.onRequest.addRules(rules, callback);

	};

	var refreshFromLocal = function() {
		chrome.declarativeWebRequest.onRequest.removeRules(
			null,
			function() {
				if (chrome.runtime.lastError) {
					console.error('Error clearing rules: ' + chrome.runtime.lastError);
				} else {
					storage.getAllLocalInfo().then(function(data){
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

			// Debug

			// var five_sex = new Date();
			// five_sex = five_sex.getTime() + 1000;

			// chrome.alarms.create(domain, {
			// 	when: five_sex
			// });

			chrome.alarms.create(domain, {
				delayInMinutes: periodLength
			});

			chrome.alarms.get(domain, function(alarm){
				if (!alarm) {
					console.error('Alarm failed to set.')
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

			// parseUri 1.2.2
			// (c) Steven Levithan <stevenlevithan.com>
			// MIT License

			parseUri.options = {
				strictMode: false,
				key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
				q:   {
					name:   "queryKey",
					parser: /(?:^|&)([^&=]*)=?([^&]*)/g
				},
				parser: {
					strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
					loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
				}
			};

			function parseUri (str) {
				var	o   = parseUri.options,
					m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
					uri = {},
					i   = 14;

				while (i--) uri[o.key[i]] = m[i] || "";

				uri[o.q.name] = {};
				uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
					if ($1) uri[o.q.name][$1] = $2;
				});

				return uri;
			};

			return parseUri(string);
		},

		// Add additional props for a new distraction
		lintDistraction : function( distraction ) {

			// Append type
			var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
			var urlPattern = new RegExp(expression)
	 	    var isUrl = urlPattern.test(distraction.txt);


		   	if (isUrl) {
		    	distraction.type = 'url';

		    	// Add http:// at beginning of links for proper linking on redirect page
		    	if (distraction.txt.substr(0, 'http://'.length) !== 'http://'){
		    	    distraction.txt = 'http://' + distraction.txt;
		    	}

		    } else {
		    	distraction.type = 'text'
		    }

			// Append old text
			distraction.oldTxt = distraction.txt;

			return distraction;
		},

		getDomainFromTab : function(callback) {
			var clean = this.cleanDomainString;
			chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
				var domain = tabs[0].url;
				domain = clean(domain).host;
				callback(domain);
			});
		}
	}
}).factory( 'build' , function( utilities ) {

	return {
		// Add additional props for a new entry
		newEntry : function ( newEntry ) {
			var entry = {};
			entry.domain = newEntry.domain;
			entry.periods = newEntry.periods;
			entry.periodLength = newEntry.periodLength;
			entry.periodsLeft = entry.periods;
			entry.periodBeingUsed = false;
			return entry;
		}
	}

});
