'use strict';

angular.module('focusMeNow.factories', [])
.factory( 'storage' , function() {

	// Gets object or index for specified domain (domain) from all entries (localData)
	// NEXT:something must be buggy here, affecting both the callback and the wierdness in updateDomainInfo
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
			console.error('Entry not found!');
		}
	};

	var getAllLocalInfo = function( callback ) {
		chrome.storage.sync.get( 'entries', function( data ) {
			callback(data);
		});
	};

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
		},
		// Return object in local storage for redirected domain.
		getDomainInfo: function( redirectedDomain, callback ) {
			chrome.storage.sync.get( 'entries', function( data ) {
				callback(localDomainInfo(redirectedDomain, data, 'object'));
			});
		},

		updateDomainInfo: function( redirectedDomain, propsToUpdate, callback ) {

			var local_data;

			getAllLocalInfo(function(data) {

				// Note: there is a very strange bug when console.log(data), at least in the chrome web inspector.
				// console.log(data) -> data.entries[0].periodBeingUsed is true. (this is wrong)
				// console.log(data.entries[0].periodBeingUsed) -> data.entries[0].periodBeingUsed is false. (this is right)

				// Create the new entry
				var new_entry = localDomainInfo( redirectedDomain, data, 'object' );
				var i = 0;
				for (i in propsToUpdate) {
					new_entry[i] = propsToUpdate[i];
				};

				// Find the index of correct entry and update
				var new_entry_index = localDomainInfo( redirectedDomain, data, 'index' );
				data.entries[new_entry_index] = new_entry;

				// Update the whole entries object in local storage.

				chrome.storage.sync.set( { 'entries' : data.entries }, function() {
					callback();
				});

			});
		}
	};
}).factory('redirectRules', function () {

	// Duplicated from event_page.js
	var config = {
		redirectUrl: chrome.extension.getURL('views/redirect.html')
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

});;