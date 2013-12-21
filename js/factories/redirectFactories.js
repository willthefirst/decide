'use strict';

angular.module('focusMeNow.factories', [])
.factory('storage', function() {

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
});