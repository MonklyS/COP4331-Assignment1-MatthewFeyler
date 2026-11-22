// Integration tests for the PHP API in api/. Each test sends a real HTTP request to an
// endpoint, which queries a real MySQL database, and checks the JSON that comes back.
//
// They need the API running against a database loaded with database/schema.sql and
// tests/fixtures/seed.sql. GitHub Actions sets that up (see .github/workflows/ci.yml).
// To run them against another server, set API_BASE_URL to the folder that serves the
// endpoints, for example http://localhost/LAMPAPI.
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

// Users created by tests/fixtures/seed.sql.
const TEST_USER = { login: "testuser", password: "testpass", firstName: "Test", lastName: "User" };
const OTHER_USER = { login: "otheruser", password: "otherpass" };

// POSTs a JSON body the way code.js does and returns the status, content type, and parsed
// JSON. If the body is not JSON (for example a PHP error page), it fails and shows the raw
// body, so the CI log says what went wrong.
async function postJson(endpoint, payload)
{
	const url = `${API_BASE_URL}/${endpoint}`;
	let response;
	try
	{
		response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=UTF-8" },
			body: JSON.stringify(payload),
		});
	}
	catch (err)
	{
		throw new Error(`Could not reach ${url}. Is the PHP server running? (${err.cause?.code ?? err.message})`, { cause: err });
	}

	const text = await response.text();
	let body;
	try
	{
		body = JSON.parse(text);
	}
	catch
	{
		throw new Error(`${endpoint} returned HTTP ${response.status} with a body that is not JSON:\n${text}`);
	}
	return { status: response.status, contentType: response.headers.get("content-type"), body };
}

// Logs in and returns the user's id, or fails if the login is rejected.
async function loginAs(user)
{
	const { body } = await postJson("Login.php", { login: user.login, password: user.password });
	if (!(body.id > 0))
	{
		throw new Error(`Could not log in as ${user.login}: ${JSON.stringify(body)}`);
	}
	return body.id;
}

// A tag no earlier test run has used, so reruns against the same database
// never match colors left behind by a previous run.
function uniqueTag()
{
	return `CI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("Login.php", () => {
	test("returns the user's id and name for a correct login", async () => {
		const res = await postJson("Login.php", { login: TEST_USER.login, password: TEST_USER.password });

		expect(res.status).toBe(200);
		expect(res.contentType).toMatch(/^application\/json/);
		expect(res.body).toEqual({
			id: expect.any(Number),
			firstName: TEST_USER.firstName,
			lastName: TEST_USER.lastName,
			error: "",
		});
		expect(res.body.id).toBeGreaterThan(0);
	});

	test("returns id 0 and an error for a wrong password", async () => {
		const res = await postJson("Login.php", { login: TEST_USER.login, password: "wrong-password" });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ id: 0, firstName: "", lastName: "", error: "No Records Found" });
	});

	test("returns id 0 and an error for a user that does not exist", async () => {
		const res = await postJson("Login.php", { login: "no-such-user", password: "testpass" });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ id: 0, firstName: "", lastName: "", error: "No Records Found" });
	});
});

describe("AddColor.php", () => {
	let userId;

	beforeAll(async () => {
		userId = await loginAs(TEST_USER);
	});

	test("saves the color and returns an empty error", async () => {
		const color = `${uniqueTag()} Teal`;

		const add = await postJson("AddColor.php", { color, userId });

		expect(add.status).toBe(200);
		expect(add.contentType).toMatch(/^application\/json/);
		expect(add.body).toEqual({ error: "" });

		// The color is really stored: searching for it now finds it.
		const search = await postJson("SearchColors.php", { search: color, userId });
		expect(search.body).toEqual({ results: [color], error: "" });
	});
});

describe("SearchColors.php", () => {
	const tag = uniqueTag();
	const colors = [`${tag} Red`, `${tag} Green`, `${tag} Blue`];
	let userId;
	let otherUserId;

	beforeAll(async () => {
		userId = await loginAs(TEST_USER);
		otherUserId = await loginAs(OTHER_USER);

		for (const color of colors)
		{
			const { body } = await postJson("AddColor.php", { color, userId });
			if (body.error !== "")
			{
				throw new Error(`Could not add test color "${color}": ${JSON.stringify(body)}`);
			}
		}
	});

	test("returns every color whose name contains the search text, as an array of strings", async () => {
		const res = await postJson("SearchColors.php", { search: tag, userId });

		expect(res.status).toBe(200);
		expect(res.contentType).toMatch(/^application\/json/);
		expect(res.body).toEqual({ results: expect.any(Array), error: "" });
		expect(res.body.results).toHaveLength(colors.length);
		expect(res.body.results).toEqual(expect.arrayContaining(colors));
	});

	test("matches part of a name regardless of letter case", async () => {
		const res = await postJson("SearchColors.php", { search: `${tag} gre`.toLowerCase(), userId });

		expect(res.body).toEqual({ results: [`${tag} Green`], error: "" });
	});

	test("returns an error and no results array when nothing matches", async () => {
		const res = await postJson("SearchColors.php", { search: uniqueTag(), userId });

		expect(res.status).toBe(200);
		// code.js checks for this error before it reads `results`.
		expect(res.body.error).toBe("No Records Found");
		expect(res.body).not.toHaveProperty("results");
	});

	test("does not return colors that belong to another user", async () => {
		const res = await postJson("SearchColors.php", { search: tag, userId: otherUserId });

		expect(res.body.error).toBe("No Records Found");
		expect(res.body).not.toHaveProperty("results");
	});
});
