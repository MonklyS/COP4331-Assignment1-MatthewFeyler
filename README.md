# COLORS — LAMP Stack Demo

COLORS is a small web application built in the COP 4331 (Processes of Object-Oriented Software Development) lab to show how the pieces of a LAMP stack fit together. A user logs in, then can **add** color names to their own list and **search** that list by partial name (searching `re` finds `Red` and `Green`). Each user only sees the colors they added.

The browser never talks to the database directly. The pages send JSON to small PHP endpoints over AJAX, and the endpoints query MySQL and send JSON back.

```
Browser (HTML/CSS/JS)  --JSON over HTTP-->  Apache + PHP (api/)  --SQL-->  MySQL
```

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
├── .gitignore
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

1. Open `http://<your-server-ip-or-domain>/` in a browser.
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

## AI assistance disclosure

- **Tool**: Claude Opus 5.5 (Anthropic), used through Claude Code in VS Code
- **Date**: September 27, 2026
- **Scope**: Organizing the existing COLORS lab code into this repository and writing its documentation.
- **Use**: The assistant proposed the folder layout and the commit breakdown, moved the hardcoded database credentials into `config.php` / `db.php`, wrote `database/schema.sql` and `.gitignore`, made the `code.js` changes listed above, and drafted this README. The application itself (the pages, `code.js`, and the endpoint logic) is the course's lab code as deployed in the lab, and was not generated by AI.

All AI-assisted changes were reviewed before submission.

## License

Released under the Apache License 2.0. See [LICENSE.md](LICENSE.md).
