'use strict';

redirect.factory('storage', function() {
	return {
		domain_info: function( redirectedDomain, callback ) {
			chrome.storage.sync.get( 'entries', function( data ) {
				if (!data.entries) {
					console.error('Nothing in local storage.');
				}
				var found = false;
				for (var i = 0; i < data.entries.length; i++) {
					if (data.entries[i].domain === redirectedDomain) {
						found = true;
						callback(data.entries[i]);
					}
				}
				if (!found) {
					console.error('Entry not found!');
				}
			});
		},
	};
});