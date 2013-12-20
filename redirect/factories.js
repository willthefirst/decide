'use strict';

redirect.factory('storage', function() {

	// Gets object or index for specified domain (domain) from all entries (localData)
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
			console.log('1', data);
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

			chrome.storage.sync.get( 'entries', function( data ) {
				local_data = data;
				console.log('asd', local_data);
			});

			// TODO: do we need allLocalInfo? does chrome.storage API let us set nested properties?
			getAllLocalInfo(function(data){

				console.log('2', local_data);

				// Create the new entry
				var new_entry = localDomainInfo( redirectedDomain, local_data, 'object' );
				var i = 0;
				for (i in propsToUpdate) {
					new_entry[i] = propsToUpdate[i];
				};

				// Find the index of correct entry and update
				var new_entry_index = localDomainInfo( redirectedDomain, local_data, 'index' );
				local_data.entries[new_entry_index] = new_entry;

				console.log('3', local_data);

				// Update the whole entries object in local storage.

				chrome.storage.sync.set( { 'entries' : local_data }, function() {
					callback();
				});

			});
		}
	};
});