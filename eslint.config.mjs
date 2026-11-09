import js from "@eslint/js";
import globals from "globals";

export default [
	{
		// Third-party library (blueimp JavaScript-MD5), kept as published.
		ignores: ["public/js/md5.js"],
	},
	js.configs.recommended,
	{
		files: ["public/**/*.js"],
		languageOptions: {
			// Loaded with plain <script> tags, so top-level names are page globals.
			sourceType: "script",
			globals: globals.browser,
		},
		rules: {
			eqeqeq: "error",
			"no-var": "error",
		},
	},
];
