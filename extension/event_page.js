// Utility variables
var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
var RedirectByRegEx = chrome.declarativeWebRequest.RedirectByRegEx;

chrome.browserAction.setBadgeBackgroundColor({color: "#6c8ea0"});

function browserActionDisabler() {
	// Disable the badge in these conditions
	var disable_conditions = function(tab) {
		var disable =
			// User is on redirect page
			(tab.url.indexOf(config.redirectUrl) !== -1)
			// User is on options page
			|| (tab.url.indexOf(config.optionsUrl) !== -1)
			// User is on newtab page
			|| (tab.url.indexOf('newtab') !== -1)
			// User is on extensions page
			|| (tab.url.indexOf('extensions') !== -1);
		return disable;
	};

	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
		if (changeInfo.status === "complete") {
			if (disable_conditions(tab)) {
				chrome.browserAction.disable( tabId );
			}
			else {
				chrome.browserAction.enable( tabId );
			}
		}
	});
};


function browserActionUpdater() {
	var old_request;

	chrome.declarativeWebRequest.onMessage.addListener(function (details) {
		var domain_info = JSON.parse(details.message);
		var requestId = details.requestId;
		if (domain_info.type === 'update_badge'
			&& requestId !== old_request) {
			old_request = requestId;


					// Set info popup
					chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
						if (tabId === details.tabId ) {

							// Make sure the rule is still true (case where user removes domain from options page during a session)
							getAllLocalInfo(function(localData) {
								var domain_exists_in_local = localDomainInfo( domain_info.domain, localData, 'object' );
								if (domain_exists_in_local) {
									chrome.browserAction.setPopup({
										tabId: details.tabId,
										popup: '/views/popup/period-info.html'
									});
								}
							});
						}
					});

					// Start the timer
					manageBadgeTimer( details.tabId, domain_info.domain, domain_info.periodEnd );

		}
	});
}


// This function is given the tabId for a tab that is on a periodBeingUsed domain
function manageBadgeTimer( tabId, domain, periodEnd ) {
	var ok_to_update = true;
	var period_tab = tabId;

	// Update badge every 30 seconds
	var secs = 30;
	var badge_updater = setInterval(function(){
		updateBadgeTimer(periodEnd, period_tab);
	}, (secs * 1000));

	// Update immediately
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
		if (tabId === period_tab) {
			if (changeInfo.status === "complete" && tab.url.indexOf(domain) !== -1 && ok_to_update) {
				updateBadgeTimer(periodEnd, period_tab);
			}

			// If tab changes to non-blocked URL, kill the timer + badge, and reset the popup.
			else if (tab.url.indexOf(domain) === -1) {
				resetBrowserAction(badge_updater);
			}
		}
	});

	// If tab is removed, clear the interval
	chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
		if (tabId === period_tab) {
			clearInterval(badge_updater);
		}
	});

	// If entry is removed on options page, clear the badge timer
	chrome.runtime.onMessage.addListener(function( request, sender, sendReponse ) {
		if (request.type === "entry_removed" && request.domain === domain ) {
			resetBrowserAction( badge_updater, period_tab );
			ok_to_update = false;
		}
	});
}

function resetBrowserAction( interval, tab ) {
	clearInterval(interval);
	chrome.browserAction.setBadgeText({
		text: '',
		tabId: tab
	});
	// Set info popup
	chrome.browserAction.setPopup({
		popup: '/views/popup/add.html',
		tabId: tab
	});
}

function updateBadgeTimer( periodEnd, tab_id ) {
	var now = new Date();
	var mins_left = (periodEnd - now.getTime()) / (1000*60);

	// Show seconds if less than 1 minute left
	if (mins_left <= 1) {
		mins_left = ((Math.floor(mins_left * 60)).toString()) + 's';
	}
	// Otherwise show minutes
	else {
		mins_left = ((Math.floor(mins_left + 1)).toString()) + 'm';
	}
	chrome.browserAction.setBadgeText({
		text: mins_left,
		tabId: tab_id
	});
}


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
		var name = alarm.name;
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
				if (array.length !== 0) {
					var tabs_to_close = [];
					for (var i = 0; i < array.length; i++) {
						tabs_to_close.push(array[i].id);
					}
					chrome.tabs.remove(tabs_to_close);
				}
			});

			getAllLocalInfo(function(localData){
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
	midnight.setHours(24,0,0,0);

	midnight = midnight.getTime();

	chrome.alarms.create('daily_refresh', {
		when: midnight
	});

};

function showIntroduction() {
	chrome.tabs.create({url: chrome.extension.getURL('views/options.html')})
}

// https://developer.chrome.com/extensions/examples/extensions/catifier/event_page.js
// This function is also called when the extension has been updated.  Because
// registered rules are persisted beyond browser restarts, we remove
// previously registered rules before registering new ones.
function setup() {

	// Clear old alarms and period counters
	chrome.alarms.clearAll();
	resetAllPeriods();

	// Set up new listeners.
	setDailyRefresh();
	listenForAlarms();

	// Badge managment
	browserActionDisabler();
	browserActionUpdater();

	// Display introduction from browser_action
	showIntroduction();
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
	var rule;
	for ( var i = 0; i < entries.length; i++) {
		// If period is in use, alert event_page to update badge
		if (entries[i].periodBeingUsed) {
			var message = {
				'type' : 'update_badge',
				'domain' : entries[i].domain,
				'periodEnd' : entries[i].periodEnd
			};
			message = JSON.stringify(message);
			rule = {
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
					new SendMessageToExtension({message : message})
				]
			};
		}
		else {
			rule = {
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
		}
		rules.push(rule);
	}

	// Callback after rules are accepted
	var callback = function() {
		if (chrome.runtime.lastError) {
			console.error('Error adding rules: ');
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

function cleanDomainString( string ) {
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
}