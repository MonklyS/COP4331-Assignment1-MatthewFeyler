export default {
	extends: ["stylelint-config-standard"],
	rules: {
		// IDs are shared with the HTML and with getElementById() calls in code.js,
		// and the project names them in camelCase (#loginDiv). The standard config
		// only accepts kebab-case, so allow both instead of renaming across files.
		"selector-id-pattern": "^[a-z][a-zA-Z0-9-]*$",
	},
};
