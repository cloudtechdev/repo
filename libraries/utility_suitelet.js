/** @type {Object} Form Variables */
var FORM = {
	'name': '',
	'title': '',
	'script': '',
	'request': '',
	'response': '',
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
		if (params[fieldId].type != 'button') {
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

/**
 * Set field default values
 * @param {object} params field details
 */
function setDefaultValues(params) {
	Object.keys(params).forEach(function(fieldId) {
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