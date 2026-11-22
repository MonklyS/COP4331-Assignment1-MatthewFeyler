# COLORS — LAMP Stack Demo

COLORS is a small web application built in the COP 4331 (Processes of Object-Oriented Software Development) lab to show how the pieces of a LAMP stack fit together. A user logs in, then can **add** color names to their own list and **search** that list by partial name (searching `re` finds `Red` and `Green`). Each user only sees the colors they added.

The browser never talks to the database directly. The pages send JSON to small PHP endpoints over AJAX, and the endpoints query MySQL and send JSON back.

```
Browser (HTML/CSS/JS)  --JSON over HTTP-->  Apache + PHP (api/)  --SQL-->  MySQL
```

**Live site:** http://cop4331mfey.org

## Technologies

| Layer      | Technology |
|------------|------------|
| Hosting    | DigitalOcean droplet running Ubuntu Linux |
| Web server | Apache 2 |
| Database   | MySQL |
| Backend    | PHP with the `mysqli` extension and prepared statements |
| Frontend   | HTML, CSS, plain JavaScript (`XMLHttpRequest`), Google Fonts (Ubuntu) |
| Data format | JSON |

## Repository layout

```
.
├── .github/workflows/
│   └── ci.yml              CI: lints HTML, CSS, and JS and runs the tests on every push and pull request
├── api/                    PHP endpoints, deployed as LAMPAPI/
│   ├── Login.php           POST {login, password}      -> {id, firstName, lastName, error}
│   ├── AddColor.php        POST {color, userId}        -> {error}
│   ├── SearchColors.php    POST {search, userId}       -> {results: [...], error}
│   ├── db.php              Shared DB connection and JSON helpers
│   └── config.example.php  Template for config.php (DB credentials)
├── database/
│   └── schema.sql          Creates the COP4331 database, Users and Colors tables
├── public/                 Web root: everything the browser loads
│   ├── index.html          Login page
│   ├── color.html          Add / search colors page
│   ├── css/styles.css
│   └── js/
│       ├── code.js         Login, session cookie, add and search logic
│       └── md5.js          MD5 library (blueimp, MIT), for optional password hashing
├── tests/
│   ├── unit/
│   │   └── code.test.js    Jest unit tests for the helper functions in code.js
│   ├── integration/
│   │   └── api.test.js     Jest tests that call the PHP endpoints over HTTP
│   └── fixtures/
│       └── seed.sql        Test users loaded into the CI database
├── .gitignore
├── .htmlhintrc             HTMLHint rules
├── eslint.config.mjs       ESLint rules
├── stylelint.config.mjs    Stylelint rules
├── package.json            Lint and test tools only; the app itself has no Node dependencies
├── package-lock.json
├── LICENSE.md
└── README.md
```

## Setup

These steps assume a fresh Ubuntu server (for example a DigitalOcean droplet) where you have `sudo`.

1. **Install the LAMP packages.**

   ```bash
   sudo apt update
   sudo apt install apache2 mysql-server php libapache2-mod-php php-mysql
   ```

2. **Create the database and tables.**

   ```bash
   sudo mysql < database/schema.sql
   ```

3. **Create a MySQL user for the app** (pick your own name and password):

   ```sql
   CREATE USER 'colors_app'@'localhost' IDENTIFIED BY 'choose-a-password';
   GRANT ALL PRIVILEGES ON COP4331.* TO 'colors_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Add a user to log in with.** There is no sign-up page, so users are inserted by hand:

   ```sql
   USE COP4331;
   INSERT INTO Users (FirstName, LastName, Login, Password)
   VALUES ('Test', 'User', 'testuser', 'testpass');
   ```

5. **Deploy the files.** Copy the contents of `public/` into Apache's web root, and `api/` into a `LAMPAPI` folder beside it. The frontend calls the API at `LAMPAPI/` relative to the page, so that folder name matters.

   ```bash
   sudo cp -r public/* /var/www/html/
   sudo mkdir -p /var/www/html/LAMPAPI
   sudo cp api/*.php /var/www/html/LAMPAPI/
   ```

6. **Configure credentials.** Create `config.php` from the template and fill in the MySQL user from step 3. This file holds the password, so it is gitignored and only ever lives on the server.

   ```bash
   sudo cp /var/www/html/LAMPAPI/config.example.php /var/www/html/LAMPAPI/config.php
   sudo nano /var/www/html/LAMPAPI/config.php
   ```

## Running and using the app

Apache serves the app as soon as the files are in place (run `sudo systemctl restart apache2` if Apache was already running before PHP was installed).

1. Open `http://<your-server-ip-or-domain>/` in a browser. The deployed copy is at http://cop4331mfey.org.
2. Log in with the user from setup step 4 (`testuser` / `testpass`). A wrong username or password shows "User/Password combination incorrect".
3. On the color page, type a color and click **Add Color**.
4. Type part of a name and click **Search Color** to list your matching colors.
5. **Log Out** clears the session cookie and returns to the login page.

To test an endpoint without the UI:

```bash
curl -X POST http://<server>/LAMPAPI/Login.php \
     -H "Content-Type: application/json" \
     -d '{"login":"testuser","password":"testpass"}'
```

## Linting, testing, and CI

GitHub Actions runs [`ci.yml`](.github/workflows/ci.yml) on every push and pull request. Every check is its own job, so one run reports all problems at once:

| Job | What it does |
|-----|--------------|
| Lint html, Lint css, Lint js | Runs HTMLHint, Stylelint, and ESLint (see [Linting](#linting)) |
| Unit tests | Runs the Jest tests for the helper functions in `code.js` |
| Integration tests | Starts the PHP API on a MySQL database and runs the Jest tests that call it over HTTP |

Node.js is only used to run the lint and test tools. The app itself still runs on PHP and MySQL, in CI as well as on the server.

### Linting

| Files | Linter | Rules |
|-------|--------|-------|
| `public/**/*.html` | HTMLHint | `.htmlhintrc` |
| `public/**/*.css` | Stylelint | `stylelint.config.mjs` (extends `stylelint-config-standard`) |
| `public/**/*.js`, `tests/**/*.js` | ESLint | `eslint.config.mjs` (`recommended`, plus `eqeqeq` and `no-var`) |

`public/js/md5.js` is a third-party library, so ESLint skips it. Script inside `<script>` tags in the HTML pages is not linted.

### Tests

The tests use [Jest](https://jestjs.io/).

**Unit tests** (`tests/unit/code.test.js`) cover two functions in `code.js` that need no browser, server, or database:

- `formatColorList` builds the list shown under the search box from the color names the API returns.
- `parseUserCookie` reads the user's name and id back out of the session cookie. `readCookie` uses it to decide whether to send the user to the login page.

`code.js` exports these two functions only when Node.js loads it (the `module.exports` block at the end of the file). Browsers skip that block, so the pages load the file as before.

**Integration tests** (`tests/integration/api.test.js`) send JSON requests to `Login.php`, `AddColor.php`, and `SearchColors.php`. For each response they check the HTTP status, the `Content-Type` header, and the exact JSON structure. They also check that:

- a wrong password or unknown user gets `id` 0 and an error,
- a color that was added can be found by searching for it,
- search matches part of a name regardless of letter case,
- a search with no matches returns an error and no `results` array, which is what `code.js` expects,
- one user's search never returns another user's colors.

In CI, the integration test job:

1. starts MySQL 8.4 as a service container,
2. loads `database/schema.sql` and `tests/fixtures/seed.sql`, which adds the users `testuser` and `otheruser`,
3. writes an `api/config.php` that points at that database,
4. serves `api/` with PHP 8.3's built-in web server (`php -S 127.0.0.1:8000 -t api`),
5. runs the integration tests against it.

If an endpoint returns something that is not JSON, such as a PHP error, the failing test prints the raw response, and the job prints the PHP server log.

### Running the checks locally

With Node.js 24 or newer:

```bash
npm ci
npm run lint                # or lint:html, lint:css, lint:js
npm run test:unit           # needs no server
npm run test:integration    # needs the API running (see below)
npm test                    # unit and integration tests
```

The integration tests need the API running against a database that has `tests/fixtures/seed.sql` loaded. Set `API_BASE_URL` to the folder that serves the endpoints, for example `API_BASE_URL=http://localhost/LAMPAPI npm run test:integration`. It defaults to `http://127.0.0.1:8000`, the address CI uses. The tests add colors every time they run, so point them at a test database, never the live site.

## Assumptions and limitations

This is a teaching demo, not production code. Known limits:

- **Passwords are stored and compared in plain text.** `md5.js` is included and the hashing call is present in `code.js` but commented out, as in the original lab. Even with it enabled, MD5 is not a safe password hash.
- **No registration, edit, or delete.** Users are added directly in MySQL, and colors can only be added and searched.
- **The session is an unsigned cookie** holding the user's id and name, with a 20-minute expiry. The API trusts the `userId` the browser sends, so a user could read or add colors for another id.
- **JSON responses are built by string concatenation**, so a color name containing `"` produces invalid JSON.
- **No HTTPS** is configured by these steps.
- `api/config.php` is expected on the server. Without it, every endpoint fails with a PHP error.
- `database/schema.sql` follows the lab's standard table layout. It was written for this repository rather than exported from the running server.

## Changes from the deployed lab code

The code in this repository is the version that ran on my DigitalOcean droplet, with these changes made while organizing it:

- Database credentials were removed from the three endpoints and moved to a gitignored `config.php` (`config.example.php` is the committed template). `db.php` holds the shared helpers each endpoint used to repeat.
- `code.js` calls the API at the relative path `LAMPAPI` instead of the droplet's domain, so it works on any server.
- The `addColor` request object was corrected from `{color:newColor,userId,userId}` to `{color:newColor,userId:userId}`.
- `database/schema.sql` was added so the tables can be recreated without attending the lab.
- An unused background image and an editor swap file were left out.
- Lint errors were fixed when CI was added. Both pages gained `<!DOCTYPE html>`, `lang`, and a charset, which moves them from quirks mode to standards mode, so the login and color panels are slightly taller and **Log Out** sits a little lower. `code.js` now uses `===` and `let`, and `styles.css` follows the Stylelint standard rules.
- When tests were added, the loop in `searchColor` that formats the results was moved into `formatColorList()`, and the cookie parsing in `readCookie` was moved into `parseUserCookie()`, so both can be unit tested. The pages behave the same.

## AI assistance disclosure

- **Tool**: Claude Opus 5.5 (Anthropic), used through Claude Code in VS Code
- **Date**: September 27, 2026
- **Scope**: Organizing the existing COLORS lab code into this repository and writing its documentation.
- **Use**: The assistant proposed the folder layout and the commit breakdown, moved the hardcoded database credentials into `config.php` / `db.php`, wrote `database/schema.sql` and `.gitignore`, made the `code.js` changes listed above, and drafted this README. The application itself (the pages, `code.js`, and the endpoint logic) is the course's lab code as deployed in the lab, and was not generated by AI.

A second session added the CI workflow:

- **Tool**: Claude Opus 5.5 (Anthropic), used through Claude Code in VS Code
- **Date**: November 8, 2026
- **Scope**: Adding automated linting with GitHub Actions.
- **Use**: The assistant wrote the workflow and linter configuration, fixed the reported lint errors in the pages, `styles.css`, and `code.js`, and drafted the README changes for this work.

A third session added automated tests:

- **Tool**: Claude Opus 5.5 (Anthropic), used through Claude Code in VS Code
- **Date**: November 22, 2026
- **Scope**: Adding unit and integration tests to the CI workflow.
- **Use**: The assistant moved the result formatting and cookie parsing in `code.js` into testable functions, wrote the Jest unit and integration tests and the test seed data, added the test jobs to the workflow, and drafted the README changes for this work.

All AI-assisted changes were reviewed before submission.

## License

Released under the Apache License 2.0. See [LICENSE.md](LICENSE.md).
