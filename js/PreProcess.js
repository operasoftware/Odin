function buildBoolExpr(expr) {
	var identifier = /([A-Za-z_][A-Za-z_0-9]*)/g;
	var boolExpr = /[ \t]*\(?(([ \t]*[A-Za-z_][A-Za-z_0-9]*[ \t]*(((\|\|)|(&&))[ \t]*\(?)?)\)?)+[ \t]*\)?[ \t]*/;
	// Sanitize the input. It doesn't mean it's avalid boolean expression, but at least it's harmless.
	var valid = boolExpr.exec(expr);
	if (!valid || valid[0].length != expr.length)
		return '';
	var res = valid[0];
	// Add scope. to all the identifiers so we don't have to pollute the global namespace.
	res = res.replace(identifier, 'scope.$1');
	return res;
}

function doPreprocess(txt, defined) {
	// Do line based preprocessing.
	lines = txt.split('\n');

	// RegExps to match preprocessor currentDirectives.
	var ifdef = /^[ \t]*#ifdef[ \t]+(.*)/;
	var ifndef = /^[ \t]*#ifndef[ \t]+(.*)/;
	var helse = /^[ \t]*#else/;
	var endif = /^[ \t]*#endif/;
	var preprocessor = /^[ \t]*#(#(ifdef|ifndef|endif|else|define).*)/;

	// Build a list of currentDirectives containing the preprocessor currentDirective and it's start and end line.
	var currentDirectives = [];
	for (var i = 0; i < lines.length; ++i) {
		// If it's a pass-through currentDirective, strip one # and write it to the line.
		var res = preprocessor.exec(lines[i]);
		if (res) {
			lines[i] = res[1];
			continue;
		}
		// If it's an #ifdef.
		res = ifdef.exec(lines[i]);
		if (res) {
			// Sanitize the expression and add it to the currentDirectives list.
			var expr = buildBoolExpr(res[1]);
			if (expr.length == 0) {
				alert('Preprocess, invalid boolean expression ' + res[1]);
				return;
			}
			// Set the line to the directive it corresponds to.
			lines[i] = currentDirectives.length;
			currentDirectives.push({'type' : 'ifdef', 'label' : expr, 'start' : i, 'helse' : -1, 'end' : -1});
			continue;
		}

		// If it's an #ifndef.
		res = ifndef.exec(lines[i]);
		if (res) {
			// Sanitize the expression and add it to the currentDirectives list.
			var expr = buildBoolExpr(res[1]);
			if (expr.length == 0) {
				alert('Preprocess, invalid boolean expression ' + res[1]);
				return;
			}
			// Set the line to the directive it corresponds to.
			lines[i] = currentDirectives.length;
			currentDirectives.push({'type' : 'ifndef', 'label' : expr, 'start' : i, 'helse' : -1, 'end' : -1});
			continue;
		}

		// If it's an #else.
		res = helse.test(lines[i]);
		if (res) {
			// Find the matching directive and set its else line.
			var match = false;
			for (var j = currentDirectives.length - 1; j >= 0; --j) {
				if (currentDirectives[j].end == -1 && currentDirectives[j].helse == -1) {
					currentDirectives[j].helse = i;
					lines[i] = j;
					match = true;
					break;
				}
			}
			if (!match) {
				alert("Preprocess, couldn't find matching #ifdef/#ifndef to #else.");
				return;
			}
			continue;
		}

		// If it's an #endif.
		res = endif.test(lines[i]);
		if (res) {
			// Find the matching directive and set its end line.
			var match = false;
			for (var j = currentDirectives.length - 1; j >= 0; --j) {
				if (currentDirectives[j].end == -1) {
					currentDirectives[j].end = i;
					lines[i] = j;
					match = true;
					break;
				}
			}
			if (!match) {
				alert("Preprocess, couldn't find matching #ifdef/#ifndef to #endif.");
				return;
			}
			continue;
		}
	}
	// Check that all the currentDirectives had a matching endif.
	for (var j = 0; j < currentDirectives.length; ++j) {
		if (currentDirectives[j].end == -1) {
			alert("Preprocess, couldn't find matching #endif for " + currentDirectives[j].type + " " + currentDirectives[j].label);
			return;
		}
	}
	// Build the outdata by iterating over the lines.
	var res = '';
	var currentDir = 0;
	for (var j = 0; j < lines.length; ++j) {
		// Update the current currentDirective.
		if ((typeof lines[j]) == 'number') {
			currentDir = lines[j];
		}
		// If we're on a directive line.
		var atElse = currentDir < currentDirectives.length && j == currentDirectives[currentDir].helse;
		var atIf = currentDir < currentDirectives.length && j == currentDirectives[currentDir].start;

		if (atIf || atElse) {
			// Create a scope object and add all the defines to it..
			var scope = {};
			for (var k = 0; k < defined.length; ++k) {
				scope[defined[k].key] = defined[k].value;
			}
			// Calculate the boolean expression.
			eval('var isDefined = ' + currentDirectives[currentDir].label + ';');

			var atIfNot = currentDirectives[currentDir].type == 'ifndef';

			// Check if we should jump to the end of this directive.
			if (atIf && !(atIfNot ^ isDefined) || atElse) {
				j = atIf && currentDirectives[currentDir].helse != -1 ? currentDirectives[currentDir].helse : currentDirectives[currentDir].end;
				continue;
			}
		}
		// Anything that's not a directive line should be added to the result.
		if ((typeof lines[j]) != 'number') {
			res += lines[j] + '\n';
		}
	}

	var preproc = '';
	for (var k = 0; k < defined.length; ++k) {
		preproc += '#define ' + defined[k].key + ' ' + defined[k].value + '\n';
	}

	return preproc + res;
}