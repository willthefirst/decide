// Configuration
var config = {
	redirectUrl: chrome.extension.getURL('views/redirect.html')
};

// Utility variables
var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
var RedirectRequest = chrome.declarativeWebRequest.RedirectRequest;

// Listens for alarms, clears them when done.
var listenForAlarms = function() {
	console.log('listening for alarms...');
	chrome.alarms.onAlarm.addListener(function(alarm){

		// Notify that period is over
		console.log('Ring ring!:', alarm.name, 'period has ended.');
		alert('Ring ring!');

		// Close any open tabs matching the domain to the redirect page.
		chrome.tabs.query({
			url: '*://*.' + alarm.name + '/*'
		}, function(array) {
			if (array.length === 0) {
				console.log('No open tabs of domain', alarm.name);
			}
			else {
				var tabs_to_close = [];
				for (var i = 0; i < array.length; i++) {
					tabs_to_close.push(array[i].id);
				}
				chrome.tabs.remove(tabs_to_close);
			}
		});

		// Update local storage
		updateDomainInfo(alarm.name, {
			periodBeingUsed: false
		}, function() {
			refreshFromLocal();
		});

		// Remove alarm
		chrome.alarms.clear(alarm.name);
	});
};

// https://developer.chrome.com/extensions/examples/extensions/catifier/event_page.js
function setup() {
	listenForAlarms();
	// This function is also called when the extension has been updated.  Because
	// registered rules are persisted beyond browser restarts, we remove
	// previously registered rules before registering new ones.
	refreshFromLocal();
};

// This is triggered when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(setup);


// DUPLICATES FROM FACTORIES.JS

// Gets object or index for specified domain (domain) from all entries (localData)
// NEXT: something must be buggy here, affecting both the callback and the wierdness in updateDomainInfo
function localDomainInfo( domain, localData, returnType ) {
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

function getAllLocalInfo( callback ) {
	chrome.storage.sync.get( 'entries', function( data ) {
		callback(data);
	});
};

function updateDomainInfo( redirectedDomain, propsToUpdate, callback ) {

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
};

// Register rules
function registerRules ( data ) {
	var rules = [];
	var entries = data.entries;
	for ( var i = 0; i < entries.length; i++) {
		// If period is in use, skip
		if (entries[i].periodBeingUsed) {
			console.log('Period being used, skipping.');
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
					new RedirectRequest({
						redirectUrl: ( config.redirectUrl + '?' + 'domain=' + entries[i].domain )
					})
				]
			};
			rules.push(redirectRule);
		}
	}

	// Callback after rules are accepted
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

function refreshFromLocal() {
	chrome.declarativeWebRequest.onRequest.removeRules(
		null,
		function() {
			if (chrome.runtime.lastError) {
				alert('Error clearing rules: ' + chrome.runtime.lastError);
			} else {
				getAllLocalInfo(function(data){
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