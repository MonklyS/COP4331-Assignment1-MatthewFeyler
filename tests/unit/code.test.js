// Unit tests for the pure helper functions in public/js/code.js.
// They need no browser, server, or database.
const { formatColorList, parseUserCookie } = require("../../public/js/code.js");

describe("formatColorList", () => {
	test("puts a line break between colors", () => {
		expect(formatColorList(["Red", "Green", "Blue"])).toBe("Red<br />\r\nGreen<br />\r\nBlue");
	});

	test("adds no line break after the last color", () => {
		expect(formatColorList(["Red"])).toBe("Red");
	});

	test("returns an empty string for an empty list", () => {
		expect(formatColorList([])).toBe("");
	});

	test("keeps color names exactly as the API returned them", () => {
		expect(formatColorList(["Sky Blue", "red"])).toBe("Sky Blue<br />\r\nred");
	});
});

describe("parseUserCookie", () => {
	test("reads the name and id written by saveCookie", () => {
		expect(parseUserCookie("firstName=Test,lastName=User,userId=7")).toEqual({
			firstName: "Test",
			lastName: "User",
			userId: 7,
		});
	});

	test("returns the id as a number, not a string", () => {
		expect(parseUserCookie("firstName=Test,lastName=User,userId=42").userId).toBe(42);
	});

	test("ignores spaces around each field", () => {
		expect(parseUserCookie(" firstName=Test , lastName=User , userId= 7 ")).toEqual({
			firstName: "Test",
			lastName: "User",
			userId: 7,
		});
	});

	test("does not depend on the order of the fields", () => {
		expect(parseUserCookie("userId=3,lastName=User,firstName=Test")).toEqual({
			firstName: "Test",
			lastName: "User",
			userId: 3,
		});
	});

	test("returns userId -1 when there is no cookie, so readCookie sends the user to the login page", () => {
		expect(parseUserCookie("")).toEqual({ firstName: "", lastName: "", userId: -1 });
	});

	test("returns userId -1 when the cookie has a name but no id", () => {
		expect(parseUserCookie("firstName=Test,lastName=User").userId).toBe(-1);
	});
});
