// Configuration
var config = {
	redirectUrl: 'http://www.yahoo.com'
};

// Utility variables
var RequestMatcher = chrome.declarativeWebRequest.RequestMatcher;
var RedirectRequest = chrome.declarativeWebRequest.RedirectRequest;

// Register rules
var registerRules = function() {

	var redirectRule =  {
		conditions: [
			new RequestMatcher({
				url: {
					hostContains: 'google'
				}
			})
		],
		actions: [
			new RedirectRequest({
				redirectUrl: config.redirectUrl
			})
		]
	};

	var callback = function() {
		if (chrome.runtime.lastError) {
			alert('Error adding rules: ' + chrome.runtime.lastError);
		} else {
			alert('Rules successfully installed');
			chrome.declarativeWebRequest.onRequest.getRules(null,
				function(rules) {
					alert('Now the following rules are registered: ' +
						JSON.stringify(rules, null, 2));
				}
			);
		}
	};

	chrome.declarativeWebRequest.onRequest.addRules(
		[redirectRule], callback);
};

// https://developer.chrome.com/extensions/examples/extensions/catifier/event_page.js
var setup = function() {
 //  // This function is also called when the extension has been updated.  Because
 //  // registered rules are persisted beyond browser restarts, we remove
 //  // previously registered rules before registering new ones.
 //  chrome.declarativeWebRequest.onRequest.removeRules(
	// null,
	// function() {
	// 	if (chrome.runtime.lastError) {
	// 		alert('Error clearing rules: ' + chrome.runtime.lastError);
	// 	} else {
	// 		registerRules();
	// 	}
	// });

  registerRules();

};

// This is triggered when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(setup());