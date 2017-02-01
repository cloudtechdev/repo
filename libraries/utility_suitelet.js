/** @type {Object} Form Variables */
var FORM = {
	'name': '',
	'title': '',
	'script': '',
	'request': '',
	'response': '',
	'method': '',
}

/**
 * Creates UI
 * @param  {object} params	field details
 * @return {object}	params	field details
 */
function createForm(params) {
	var form = nlapiCreateForm(FORM.name);
	form.setTitle(FORM.title);

	if (form.script) {
		form.setScript(FORM.script);
	}

	Object.keys(params).forEach(function(fieldId) {
		if (params[fieldId].type != 'button' && params[fieldId].type != 'submit') {
			params[fieldId].object = form.addField(fieldId, params[fieldId].type, params[fieldId].label, params[fieldId].source);
		} else {
			if (params[fieldId].type == 'button') {
				params[fieldId].object = form.addButton(fieldId, params[fieldId].label, params[fieldId].script);
			} else if (params[fieldId].type == 'submit') {
				params[fieldId].object = form.addSubmitButton(params[fieldId].label);
			}
		}
	});
	params = getParams(params);
	params = setDefaultValues(params);
	params['form'] = form;
	return params;
}

/**
 * Get previous field parameters on method 'GET' after
 * redirecting page to self.
 * @param  {object} params field details
 * @return {object} params field details
 */
function getParams(params) {
	var request = FORM.request;

	Object.keys(params).forEach(function(fieldId) {
		params[fieldId].value = isTruthy(request.getParameter(fieldId));
	});

	return params;
}

function getSettings(type, context, params) {
	var data = {};

	params.forEach(function(arr) {
		if (arr[0]) {
			if(arr[1] != 'button' && arr[1] != 'submit'){
				data[arr[0]] = isTruthy(context.getSetting(type, arr[0].replace('custpage','custscript')));
			}
		}
	});

	return data;
}

/**
 * Set schedule script parameters
 * @param {[type]} params [description]
 */
function setParams(params) {
	var data = {};

	Object.keys(params).forEach(function(fieldId) {
		data[fieldId.replace('custpage', 'custscript')] = isTruthy(request.getParameter(fieldId));
	});

	return data;
}

/**
 * Set field default values
 * @param {object} params field details
 */
function setDefaultValues(params) {
	Object.keys(params).forEach(function(fieldId) {
		if (params[fieldId].type != 'button' && params[fieldId].type != 'submit')
			params[fieldId]['object'].setDefaultValue(params[fieldId].value);
	});
	return params;
}

/**
 * Form Field Object Builder
 * @param  {array}	array	field details
 * @param  {string} id 		field id
 * @param  {string}	type 	field type
 * @param  {string} source	source list
 * @param  {string} label 	field label
 * @param  {string} value 	field value
 * @return {object} object 	form object created
 */
function createFieldObject(array, id, type, source, label, value, script) {
	var object = {};
	if (array) {
		array.forEach(function(arr) {
			if (arr[0]) {
				object[arr[0]] = {
					'type': isTruthy(arr[1]),
					'source': isTruthy(arr[2]),
					'label': isTruthy(arr[3]),
					'value': isTruthy(arr[4]),
					'object': '',
					'script': isTruthy(arr[5]),
				}
			}
		});
	} else {
		object[id] = {
			'type': isTruthy(type),
			'source': isTruthy(source),
			'label': isTruthy(label),
			'value': isTruthy(value),
			'object': '',
			'script': isTruthy(script),
		}
	}
	return object;
}

/**
 * Check integrity
 * @param  {[type]}  val [description]
 * @return {string}     [description]
 */
function isTruthy(val) {
	if (val) {
		return val;
	}
	return null;
}

function loadSearch(id, filters, start, end) {
	var search = nlapiLoadSearch(null, id);
	if (filters) {
		search.addFilters(filters);
	}

	search = getResults(search.runSearch(), start, end);
	return search;
};

function getResults(search, start, end) {
	var results = [];
	var temp = search;
	if (search) {
		do {
			temp = search.getResults(start, end);
			results = results.concat(temp);
			start += 1000;
			end += 1000;
		}
		while (temp.length == 1000);
	}
	return results;
};

function getAllChildLocation(parent) {
	var selected = nlapiLookupField('location', parent, 'name');
	//console.log(selected);
	var filter = [];
	filter.push(new nlobjSearchFilter('name', null, 'contains', selected));
	var search = nlapiSearchRecord(null, 'customsearch_location_filter', filter);
	var children = [];
	if (search) {
		//console.log(search.length);
		search.forEach(function(result) {
			var count_1 = (selected.match(/:/g) || []).length;
			var count_2 = (result.getValue('name').match(/:/g) || []).length;
			//console.log(count_1 + ' ' + count_2);
			if (count_1 == count_2) {
				//console.log('equal');
				var selected_end = selected.split(' : ');
				selected_end = selected_end[selected_end.length - 1];
				var result_end = result.getValue('name').split(' : ');
				result_end = result_end[result_end.length - 1];
				//console.log(result_end + ' ' + selected_end);
				if (result_end.length == selected_end.length) {
					children.push(result.id);
				}
			} else {
				children.push(result.id);
			}
		});
	} else {
		children.push(parent);
	}

	return children;
};