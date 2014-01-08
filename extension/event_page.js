// Import global stuff

function loadScript(scriptName, callback) {
    var scriptEl = document.createElement('script');
    scriptEl.src = chrome.extension.getURL('/js/' + scriptName);
    scriptEl.addEventListener('load', callback, false);
    document.head.appendChild(scriptEl);
}

loadScript('shared.js');

// Utility variables
var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
var RedirectByRegEx = chrome.declarativeWebRequest.RedirectByRegEx;

var resetAllPeriods = function() {
	getAllLocalInfo(function(data) {
		if(!data.entries) {
			return;
		}
		var entries = data.entries;
		for (var i = 0; i < entries.length; i++) {
			entries[i].periodsLeft = entries[i].periods;
			entries[i].periodBeingUsed = false;
		}
		chromeStorage.set( { 'entries': entries } , function() {
			if(chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError.message);
				return;
			}
			refreshFromLocal();
		});
	});
};

var listenForAlarms = function() {
	chrome.alarms.onAlarm.addListener(function(alarm){
		console.log(alarm.name);
		// If alarm is the daily refresh alarm, fill up periodsLeft for all domains
		if(alarm.name === "daily_refresh") {
			chrome.alarms.clearAll();
			resetAllPeriods();
			// reset alarm
			setDailyRefresh();
		}

		// Else, end period and clear the alarm
		else {
			// Close any open tabs matching the domain to the redirect page.
			chrome.tabs.query({
				url: '*://*.' + alarm.name + '/*'
			}, function(array) {
				if (array.length === 0) {
					// No open tabs
				}
				else {
					var tabs_to_close = [];
					for (var i = 0; i < array.length; i++) {
						tabs_to_close.push(array[i].id);
					}
					chrome.tabs.remove(tabs_to_close);
				}
			});

			getAllLocalInfo(function(localData){
				console.log('here');
				var periodsLeft = localDomainInfo( alarm.name, localData, 'object' ).periodsLeft;
				var msg;
				var title;

				if (periodsLeft > 1) {
					msg = "You can use it " + periodsLeft + " more times today. Time to get back to life.";
					title = 'Ok, enough ' + alarm.name;
				}
				else if (periodsLeft === 1) {
					msg = "You can use it one last time today. After that Check Less with block it until midnight.";
					title = 'Ok, enough ' + alarm.name;
				}
				else {
					msg = "Go read a book or something.";
					title = "No more " + alarm.name + " today.";
				}

				// Notify that period is over
				var notify_period_over = webkitNotifications.createNotification(
				  'icon.ico', // icon url
				  title,  // notification title
				  msg  // notification body text
				);

				notify_period_over.show();
			});

			// Update local storage
			updateDomainInfo(alarm.name, {
				periodBeingUsed: false
			}, function() {
				refreshFromLocal();
			});

			// Remove alarm
			chrome.alarms.clear(alarm.name);
		}
	});
};

// Create alarm that refreshes all periodsLeft every day
function setDailyRefresh() {
	var midnight = new Date();
	midnight.setHours(0,0,0,0);
	midnight = midnight.getTime();

	chrome.alarms.create('daily_refresh', {
		when: midnight
	});
};

// https://developer.chrome.com/extensions/examples/extensions/catifier/event_page.js
// This function is also called when the extension has been updated.  Because
// registered rules are persisted beyond browser restarts, we remove
// previously registered rules before registering new ones.
function setup() {

	// Clear old alarms and period counters
	chrome.alarms.clearAll();
	resetAllPeriods();

	// Set up new listeners.
	// setDailyRefresh();
	listenForAlarms();
};

// This is triggered when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(setup);

// DUPLICATES FROM FACTORIES.JS

// Gets object or index for specified domain (domain) from all entries (localData)
// NEXT: something must be buggy here, affecting both the callback and the wierdness in updateDomainInfo
function localDomainInfo( domain, localData, returnType ) {
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
			// console.error('Entry not found!');
			return false;
		}
	}
};

function getAllLocalInfo(callback) {
	chromeStorage.get( null, function( data ) {
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

		chromeStorage.set( { 'entries' : data.entries }, function() {
			if(chrome.runtime.lastError) {
				console.log(chrome.runtime.lastError.message);
				return;
			}
			callback();
		});

	});
};

// Register rules
function registerRules ( data ) {
	var rules = [];
	var entries = data.entries;
	for ( var i = 0; i < entries.length; i++) {
		if (entries[i].periodBeingUsed) {
		// If period is in use, skip
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
			console.error('Error adding rules: ' + chrome.runtime.lastError);
		} else {
			chrome.declarativeWebRequest.onRequest.getRules(null,
				function(rules) {
					console.info('Now the following rules are registered: ' + JSON.stringify(rules, null, 2));
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
				getAllLocalInfo(function(data) {
					registerRules(data);
				});
			}
		}
	);
};